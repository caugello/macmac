import json
import re

import httpx
from llama_cpp import Llama
from llama_cpp.llama_grammar import json_schema_to_gbnf  # if available
from llama_cpp.llama_grammar import LlamaGrammar
from pydantic import ValidationError

from services.catalog.crud import create_catalog_item
from services.catalog.db import SessionLocal
from services.catalog.main import catalog_db
from services.config import get_config_for_service_dependency
from services.shared.lib.db import get_db
from services.shared.lib.messaging_bus import MessagingBus
from services.shared.schemas.catalog import CatalogItemCreate

_QTY_RE = re.compile(
    r"(?P<qty>\d+(?:[.,]\d+)?)\s*(?P<unit>kg|g|gr|l|ml)\b", re.IGNORECASE
)
JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "canonical_name": {"type": ["string", "null"]},
        "normalized_name": {"type": ["string", "null"]},
        "brand": {"type": ["string", "null"]},
        "net_quantity_value": {"type": ["number", "null"]},
        "net_quantity_unit": {
            "type": ["string", "null"],
            "enum": ["g", "kg", "ml", "l"],
        },
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": [
        "canonical_name",
        "normalized_name",
        "brand",
        "net_quantity_value",
        "net_quantity_unit",
        "confidence",
    ],
}


gbnf = json_schema_to_gbnf(json.dumps(JSON_SCHEMA))
grammar = LlamaGrammar.from_string(gbnf)


def normalize_unit(unit: str) -> str | None:
    unit = unit.lower()
    if unit in ("g", "gr", "gram", "grams"):
        return "g"
    if unit == "kg":
        return "kg"
    if unit == "ml":
        return "ml"
    if unit == "l":
        return "l"
    return None


def parse_net_quantity(raw_name: str):
    m = _QTY_RE.search(raw_name)
    if not m:
        return None, None

    qty = float(m.group("qty").replace(",", "."))
    unit = normalize_unit(m.group("unit"))
    return qty, unit


llm = Llama(
    model_path="/Users/caugello/Dev/macmac/tmp/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf",
    n_ctx=2048,
    n_threads=6,
    n_batch=256,
)

PROMPT = """
You are a strict extractor for grocery product titles in French.


Goal:
Fill canonical_name, normalized_name, brand from raw_name.
For net_quantity_value/unit: NEVER invent. If preparsed values are provided, copy them exactly.

Normalization rules:
- canonical_name: clean product name without brand and without quantity/count/SKU noise.
- brand: title case if clearly present (e.g. "Boni Selection"), else null.
- normalized_name: derived from canonical_name: lowercase, remove accents, spaces -> underscores, remove punctuation.

EXAMPLE 1
Input raw_name: boni selection magret de canard fumé 80gr
preparsed_net_quantity_value: 80
preparsed_net_quantity_unit: g
Output:
{{"canonical_name":"Magret de canard fumé","normalized_name":"magret_de_canard_fume","brand":"Boni Selection","net_quantity_value":80,"net_quantity_unit":"g","confidence":0.92}}

EXAMPLE 2
Input raw_name: boni selection mini pizza 8st 200g 18628 p 2
preparsed_net_quantity_value: 200
preparsed_net_quantity_unit: g
Output:
{{"canonical_name":"Mini pizza","normalized_name":"mini_pizza","brand":"Boni Selection","net_quantity_value":200,"net_quantity_unit":"g","confidence":0.85}}

NOW DO THIS ONE
vendor_name: {vendor_name}
raw_name: {raw_name}
product_url: {product_url}
preparsed_net_quantity_value: {pre_qty}
preparsed_net_quantity_unit: {pre_unit}

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
        pre_qty=pre_qty if pre_qty is not None else "null",
        pre_unit=pre_unit if pre_unit is not None else "null",
    )

    try:
        result = llm(
            prompt, max_tokens=220, temperature=0.0, top_p=1.0, grammar=grammar
        )

        text = result["choices"][0]["text"].strip()
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
        )


def write_to_db(payload: dict, ch):
    enriched_item = enrich_catalog_item(
        raw_name=payload["raw_name"],
        vendor_name=payload["vendor_name"],
        product_url=payload["product_url"],
    )
    res = httpx.post(
        "http://0.0.0.0:8002/catalog",
        data=enriched_item.model_dump_json(),
        timeout=httpx.Timeout(10),
    )
    print(res.text)


config = get_config_for_service_dependency("catalog", "crawler")
bus = MessagingBus(config.url)
bus.declare_queue("foo")
bus.consume("foo", write_to_db)
bus.start()
