from pydantic import BaseModel


class VendorXMLSource(BaseModel):
    url: str


class VendorCatalogItem(BaseModel):
    vendor_name: str
    raw_name: str
    product_url: str
