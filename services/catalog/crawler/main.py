from services.catalog.crawler.handlers.xml_fetcher import parse_vendor_catalog_item_xml
from services.config import get_config, get_config_for_service_dependency
from services.shared.lib.messaging_bus import MessagingBus

config = get_config_for_service_dependency("catalog", "crawler")

vendors = get_config().vendors
vendor = vendors.get("colruyt")


print("Staring crawler")
bus = MessagingBus(url=config.url)
bus.declare_queue("foo")
with open("/Users/caugello/Dev/macmac/tmp/col.xml", "r") as f:
    catalog_items_xml = f.read()
    # products = fetch_products_for_vendor(vendor)
    products = parse_vendor_catalog_item_xml(catalog_items_xml, vendor)
    for product in products:
        bus.publish("foo", product.model_dump())
