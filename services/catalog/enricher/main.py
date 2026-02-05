import json
import re

import httpx
from pydantic import ValidationError

from services.catalog.enricher.db import create_catalog_item
from services.catalog.main import catalog_db
from services.config import get_config_for_service_dependency
from services.shared.constant import CATALOG_PROCESS_ENTITY_QUEUE
from services.shared.lib.db import get_db
from services.shared.lib.messaging_bus import MessagingBus
from services.shared.schemas.catalog import CatalogItemCreate

_QTY_RE = re.compile(
    r"(?P<qty>\d+(?:[.,]\d+)?)\s*(?P<unit>kg|g|gr|l|ml)\b", re.IGNORECASE
)

llm_config = get_config_for_service_dependency("catalog", "llm")


def normalize_unit(unit: str) -> str | None:
    unit = unit.lower()
    if unit in ("g", "gr", "gram", "grams"):
        return "g"
    if unit in ("kg", "ml", "l"):
        return unit
    return None


def parse_net_quantity(raw_name: str):
    m = _QTY_RE.search(raw_name)
    if not m:
        return None, None

    qty = float(m.group("qty").replace(",", "."))
    unit = normalize_unit(m.group("unit"))
    return qty, unit


PROMPT = """
You are a strict extractor for grocery product titles in French.
Do not reveal your chain-of-thought, reasoning, or internal analysis.
Provide only the final answer.
If an explanation is not explicitly requested, do not include one.
Never output <think> or </think>.


Goal:
Fill canonical_name, normalized_name, brand from raw_name.
For net_quantity_value/unit: NEVER invent. If preparsed values are provided, copy them exactly.
Determine if it food / edible goods.

Normalization rules:
- canonical_name: clean product name without brand and without quantity/count/SKU noise.
- brand: title case if clearly present (e.g. "Boni Selection"), else null.
- normalized_name: derived from canonical_name: lowercase, remove accents, spaces -> underscores, remove punctuation.

EXAMPLE 1
Input raw_name: boni selection magret de canard fumé 80gr
preparsed_net_quantity_value: 80
preparsed_net_quantity_unit: g
Output:
{{"canonical_name":"Magret de canard fumé","normalized_name":"magret_de_canard_fume","brand":"Boni Selection","net_quantity_value":80,"net_quantity_unit":"g","confidence":0.92, "is_food": true}}

EXAMPLE 2
Input raw_name: boni selection mini pizza 8st 200g 18628 p 2
preparsed_net_quantity_value: 200
preparsed_net_quantity_unit: g
Output:
{{"canonical_name":"Mini pizza","normalized_name":"mini_pizza","brand":"Boni Selection","net_quantity_value":200,"net_quantity_unit":"g","confidence":0.85, "is_food": true}}

NOW DO THIS ONE
vendor_name: {vendor_name}
raw_name: {raw_name}
product_url: {product_url}
preparsed_net_quantity_value: {pre_qty}
preparsed_net_quantity_unit: {pre_unit}
is_food: true/false

Return ONLY the JSON object.
"""


def enrich_catalog_item(
    vendor_name: str,
    raw_name: str,
    product_url: str,
) -> CatalogItemCreate:
    """
    Returns a fully populated CatalogItemOut using LLM enrichment.
    Safe: always returns valid CatalogItemOut.
    """

    pre_qty, pre_unit = parse_net_quantity(raw_name)

    prompt = PROMPT.format(
        vendor_name=vendor_name,
        raw_name=raw_name,
        product_url=product_url,
        pre_qty=pre_qty,
        pre_unit=pre_unit,
    )

    try:
        result = httpx.post(
            llm_config.url,
            headers={"Content-Type": "application/json"},
            timeout=180,
            json={
                "messages": [
                    {
                        "role": "system",
                        "content": "You output ONLY valid JSON. No markdown. No extra text.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "model": "qwen",
                "temperature": 0.0,
            },
        )
        resp = result.json()
        text = resp["choices"][0]["message"]["content"].strip()
        data = json.loads(text)

        return CatalogItemCreate(
            vendor_name=vendor_name,
            raw_name=raw_name,
            product_url=product_url,
            canonical_name=data.get("canonical_name"),
            normalized_name=data.get("normalized_name"),
            brand=data.get("brand"),
            net_quantity_value=data.get("net_quantity_value", pre_qty),
            net_quantity_unit=data.get("net_quantity_unit", pre_unit),
            is_food=data.get("is_food", False),
        )

    except (ValueError, json.JSONDecodeError, ValidationError, KeyError):
        return CatalogItemCreate(
            vendor_name=vendor_name,
            raw_name=raw_name,
            product_url=product_url,
            canonical_name=None,
            normalized_name=None,
            brand=None,
            net_quantity_value=pre_qty,
            net_quantity_unit=pre_unit,
            is_food=False,
        )


def write_to_db(payload: dict, ch):
    enriched_item = enrich_catalog_item(
        raw_name=payload["raw_name"],
        vendor_name=payload["vendor_name"],
        product_url=payload["product_url"],
    )
    with get_db(catalog_db) as db:
        if enriched_item:
            item = create_catalog_item(enriched_item, db)
            print(item)


config = get_config_for_service_dependency("catalog", "crawler")
bus = MessagingBus(config.url)
bus.declare_queue(CATALOG_PROCESS_ENTITY_QUEUE)
bus.consume(CATALOG_PROCESS_ENTITY_QUEUE, write_to_db)
bus.start()
