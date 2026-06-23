import json
import os
import signal
import time

from services.catalog.db import SessionLocal
from services.catalog.snitch.db import create_catalog_item, is_item_fresh
from services.config import get_config_for_service, get_config_for_service_dependency
from services.framework.logging import setup_logging
from services.shared.constant import CATALOG_ENRICHMENT_RESULTS_QUEUE
from services.shared.lib.db import get_db
from services.shared.lib.messaging_bus import MessagingBus
from services.shared.schemas.catalog import CatalogItemCreate

logger = setup_logging()

# Load configuration
catalog_config = get_config_for_service("catalog")

# Snitch configuration from config.yaml
FRESHNESS_THRESHOLD_DAYS = (
    catalog_config.enricher.freshness_threshold_days if catalog_config.enricher else 14
)


def persist_result(payload: dict, ch):
    """
    Callback for RabbitMQ message processing.
    Reconstructs the enriched item from the results-queue message,
    runs the freshness check, and writes it to the database.
    """
    vendor_name = payload["vendor_name"]
    vendor_product_id = payload["vendor_product_id"]
    enriched_item = CatalogItemCreate(**payload["enriched"])

    # Skip items that were recently enriched with complete data
    with get_db(SessionLocal) as db:
        if is_item_fresh(vendor_name, vendor_product_id, FRESHNESS_THRESHOLD_DAYS, db):
            logger.debug(f"Skipping fresh item: {payload.get('raw_name', 'unknown')}")
            return

    with get_db(SessionLocal) as db:
        item = create_catalog_item(enriched_item, db)

        # Safe formatting with type checking
        if item.net_quantity_value and item.net_quantity_unit:
            # Handle enum or string unit
            unit_str = (
                item.net_quantity_unit.value
                if hasattr(item.net_quantity_unit, "value")
                else item.net_quantity_unit
            )
            qty_str = f"{item.net_quantity_value}{unit_str}"
        else:
            qty_str = "N/A"

        # Handle price carefully - ensure it's a number
        if item.price is not None:
            try:
                price_str = f"€{float(item.price):.2f}"
            except (ValueError, TypeError):
                price_str = f"€{item.price} (invalid)"
        else:
            price_str = "N/A"

        category_str = item.category or "N/A"
        nutrition_str = "yes" if item.nutrition else "no"

        logger.info(
            f"Stored: {item.canonical_name or item.raw_name}, is_food={enriched_item.is_food}"
        )
        logger.info(f"{qty_str} | {price_str} | {category_str} | Nutrition: {nutrition_str}")

        # Detailed nutrition logging
        if item.nutrition:
            logger.debug("Nutrition values saved to DB:")
            if isinstance(item.nutrition, dict):
                nutrition_json = item.nutrition
            elif hasattr(item.nutrition, "model_dump"):
                nutrition_json = item.nutrition.model_dump(exclude_none=True)
            else:
                nutrition_json = json.loads(item.nutrition)
            for key, value in nutrition_json.items():
                if value is not None:
                    logger.debug(f"  {key}: {value}")
        else:
            logger.warning("No nutrition data was saved to database!")


if __name__ == "__main__":
    logger.info("Starting snitch consumer")

    config = get_config_for_service_dependency("catalog", "crawler")
    rabbitmq_url = os.getenv("RABBITMQ_URL", config.url)

    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            bus = MessagingBus(rabbitmq_url)
            break
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Failed to connect to RabbitMQ after {max_retries} attempts: {e}")
                exit(1)
            logger.info(f"RabbitMQ not ready (attempt {attempt}/{max_retries}), retrying in 5s...")
            time.sleep(5)

    bus.declare_queue(CATALOG_ENRICHMENT_RESULTS_QUEUE)
    bus.consume(CATALOG_ENRICHMENT_RESULTS_QUEUE, persist_result)

    def _handle_shutdown(signum, frame):
        logger.info(f"Received signal {signum}, shutting down consumer")
        bus.channel.stop_consuming()

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    bus.start()
