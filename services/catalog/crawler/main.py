from services.catalog.crawler.handlers.xml_fetcher import fetch_products_for_vendor
from services.config import get_config, get_config_for_service_dependency
from services.shared.constant import CATALOG_PROCESS_ENTITY_QUEUE
from services.shared.lib.messaging_bus import MessagingBus

config = get_config_for_service_dependency("catalog", "crawler")

vendors = get_config().vendors
vendor = vendors.get("colruyt")


print("Staring crawler")
bus = MessagingBus(url=config.url)
bus.declare_queue(CATALOG_PROCESS_ENTITY_QUEUE)
products = fetch_products_for_vendor(vendor)
for product in products:
    bus.publish(CATALOG_PROCESS_ENTITY_QUEUE, product.model_dump())
