"""
Re-enrichment cron job.

Queries the catalog DB for items that need re-enrichment and publishes them
back to the enricher queue. Two buckets:
  1. Backfill: items missing image_url, nutrition, or nutriscore
  2. Refresh: items with stale price/promotion data (last_enriched_at > 3 days)
"""

import os
from datetime import UTC, datetime, timedelta

from sqlalchemy import or_

from services.catalog.db import SessionLocal
from services.catalog.models import CatalogItem
from services.config import get_config_for_service_dependency
from services.framework.logging import setup_logging
from services.shared.constant import CATALOG_PROCESS_ENTITY_QUEUE
from services.shared.lib.db import get_db
from services.shared.lib.messaging_bus import MessagingBus

logger = setup_logging()

STALE_THRESHOLD_DAYS = 3


def find_items_to_requeue(db) -> list[dict]:
    stale_cutoff = datetime.now(UTC) - timedelta(days=STALE_THRESHOLD_DAYS)

    rows = (
        db.query(
            CatalogItem.vendor_name,
            CatalogItem.raw_name,
            CatalogItem.product_url,
        )
        .filter(
            or_(
                CatalogItem.image_url.is_(None),
                CatalogItem.nutrition.is_(None),
                CatalogItem.nutriscore.is_(None),
                CatalogItem.last_enriched_at < stale_cutoff,
            )
        )
        .all()
    )

    return [
        {"vendor_name": r.vendor_name, "raw_name": r.raw_name, "product_url": r.product_url}
        for r in rows
    ]


def main():
    config = get_config_for_service_dependency("catalog", "crawler")
    rabbitmq_url = os.getenv("RABBITMQ_URL", config.url)

    with get_db(SessionLocal) as db:
        items = find_items_to_requeue(db)

    if not items:
        logger.info("No items need re-enrichment")
        return

    logger.info(f"Found {len(items)} items to re-enrich")

    bus = MessagingBus(url=rabbitmq_url)
    bus.declare_queue(CATALOG_PROCESS_ENTITY_QUEUE)

    for item in items:
        bus.publish(CATALOG_PROCESS_ENTITY_QUEUE, item)

    logger.info(f"Queued {len(items)} items for re-enrichment")


if __name__ == "__main__":
    main()
