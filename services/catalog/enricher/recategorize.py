"""One-off catalog re-categorization backfill.

A standalone, env-driven job that re-classifies the ``category`` of catalog
items using the product text ALREADY stored in the DB (brand / canonical_name /
raw_name). It does NOT crawl the grocery vendor, does NOT touch RabbitMQ, and
issues zero outbound requests to the vendor — the only network egress is to the
LLM provider. That makes it safe to run against the egress-flag budget: it costs
no vendor IP reputation.

Why it exists: a coarse taxonomy migration bulk-remapped ~19 legacy labels onto
the 36 leaf categories, but dumped each legacy label into a single default sink
leaf. The result is ~12k rows sitting in a *valid-but-wrong* leaf. Because the
migration produced valid-but-wrong leaves, "category not in the taxonomy" is not
a usable filter; instead this job re-classifies EVERY row (ordered by id for
deterministic, resumable runs) and only writes when the LLM returns a valid,
different category. It is idempotent and safe to re-run.

It updates ``category`` ONLY. It deliberately never touches ``last_enriched_at``
(or ``is_food`` / any other enrichment column) so it does not suppress a genuine
future re-enrichment of a row.

Intended invocation (local, against a port-forwarded catalog DB)::

    kubectl -n macmac port-forward svc/catalog-db 5432:5432
    OPENAI_API_KEY=... \
    CATALOG_DATABASE_URL=postgresql+pg8000://<user>:<pass>@localhost:5432/catalog \
    uv run python -m services.catalog.enricher.recategorize

Set ``RECATEGORIZE_DRY_RUN=1`` first to classify + log without writing.
"""

import asyncio
import os
import sys

from services.catalog.db import SessionLocal
from services.catalog.models import CatalogItem
from services.framework.logging import setup_logging
from services.shared.lib.catalog_taxonomy import (
    allowed_categories,
    format_categories_bullets,
)
from services.shared.lib.db import get_db

logger = setup_logging()

# API key from environment (SECURITY REQUIREMENT: never hardcode secrets).
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Model is env-overridable; default matches the enricher's default.
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Bounded LLM concurrency. Keeps outbound request pressure predictable without a
# full pacer — this is a one-off backfill, not a steady-state worker.
LLM_CONCURRENCY = 8

# Commit cadence: flush accumulated category updates to the DB every N rows so a
# long run makes durable, resumable progress instead of one giant final commit.
COMMIT_BATCH_SIZE = 100


def _get_max_items() -> int | None:
    """Optional cap on how many rows to process. Unset -> no cap (all rows)."""
    raw = os.getenv("RECATEGORIZE_MAX_ITEMS")
    if raw is None:
        return None
    return int(raw)


def _is_dry_run() -> bool:
    """Truthy RECATEGORIZE_DRY_RUN -> classify + log but never write."""
    raw = os.getenv("RECATEGORIZE_DRY_RUN")
    if raw is None:
        return False
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _make_client():
    """Construct the LLM client. ``openai`` is imported lazily here (mirroring
    the enricher's main.py) so the module has no hard dependency on the
    enricher-only ``openai`` extra — tests patch this seam instead of importing
    the real package."""
    from openai import AsyncOpenAI

    return AsyncOpenAI(api_key=OPENAI_API_KEY)


def _build_system_prompt(categories: list[str]) -> str:
    """Classify-only system prompt built from a scoped category list (single
    source of truth, shared with the enricher via ``format_categories_bullets``).

    ``categories`` is the food OR non-food subset, so an item is only ever
    offered leaves matching its ``is_food`` nature.
    """
    return (
        "You are a grocery product classifier. Choose EXACTLY ONE category for "
        "the product from the list below. Reply with a JSON object of the form "
        '{"category": "<one of the categories>"} and nothing else. The value '
        "MUST be copied verbatim from the list.\n\n"
        "Categories:\n"
        f"{format_categories_bullets(categories)}"
    )


def _build_user_content(item: CatalogItem) -> str:
    """Product text for classification, from whatever fields are present."""
    parts = [
        (label, value)
        for label, value in (
            ("Brand", item.brand),
            ("Name", item.canonical_name),
            ("Raw name", item.raw_name),
        )
        if value
    ]
    return "\n".join(f"{label}: {value}" for label, value in parts)


def _parse_category(content: str | None, allowed: set[str]) -> str | None:
    """Extract a category string from the LLM response, tolerating either a bare
    category or a ``{"category": "..."}`` JSON object. Returns None if the value
    is empty or not in ``allowed`` (the item's scoped food/non-food leaf set), so
    a cross-scope reply is rejected the same as an out-of-taxonomy one."""
    if not content:
        return None
    text = content.strip()

    category: str | None = None
    try:
        import json

        parsed = json.loads(text)
        if isinstance(parsed, dict):
            value = parsed.get("category")
            category = value.strip() if isinstance(value, str) else None
        elif isinstance(parsed, str):
            category = parsed.strip()
    except (ValueError, TypeError):
        # Not JSON — treat the whole response as a bare category label.
        category = text

    if category and category in allowed:
        return category
    return None


async def _classify_one(
    client, item: CatalogItem, system_prompt: str, allowed: set[str]
) -> str | None:
    """Classify a single item against its scoped leaf set. Returns a valid leaf
    category or None."""
    resp = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": _build_user_content(item)},
        ],
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    return _parse_category(resp.choices[0].message.content, allowed)


async def _run() -> int:
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY not set; aborting")
        return 1

    dry_run = _is_dry_run()
    max_items = _get_max_items()
    # Candidate leaves come from the shared allowed_categories() boundary, so the
    # backfill and the enricher guardrail agree: alcohol ("Beer, Wine & Spirits"),
    # flagged non-food yet a food Beverages leaf, is reachable from either
    # is_food value while cosmetics still cannot reach other food leaves.
    food_prompt = _build_system_prompt(allowed_categories(True))
    non_food_prompt = _build_system_prompt(allowed_categories(False))
    food_set = set(allowed_categories(True))
    non_food_set = set(allowed_categories(False))

    scanned = 0
    updated = 0
    unchanged = 0
    skipped_invalid = 0

    client = _make_client()
    semaphore = asyncio.Semaphore(LLM_CONCURRENCY)

    try:
        with get_db(SessionLocal) as db:
            query = db.query(CatalogItem).order_by(CatalogItem.id.asc())
            if max_items is not None:
                query = query.limit(max_items)
            items = query.all()

            logger.info(
                "recategorize: selected %d item(s) (max_items=%s, dry_run=%s, model=%s)",
                len(items),
                max_items,
                dry_run,
                OPENAI_MODEL,
            )

            async def classify(item: CatalogItem):
                # Scope the candidate leaves by the item's food/non-food nature so
                # a non-food row can never land in a food department (or reverse),
                # except alcohol which allowed_categories() permits either way.
                if item.is_food:
                    prompt, allowed = food_prompt, food_set
                else:
                    prompt, allowed = non_food_prompt, non_food_set
                async with semaphore:
                    return item, await _classify_one(client, item, prompt, allowed)

            pending_writes = 0
            for coro in asyncio.as_completed([classify(item) for item in items]):
                item, category = await coro
                scanned += 1

                if category is None:
                    skipped_invalid += 1
                    logger.warning(
                        "recategorize: no valid category for id=%s raw_name=%r; skipping",
                        item.id,
                        item.raw_name,
                    )
                    continue

                if category == item.category:
                    unchanged += 1
                    continue

                updated += 1
                if dry_run:
                    logger.info(
                        "recategorize[dry-run]: id=%s %r -> %r",
                        item.id,
                        item.category,
                        category,
                    )
                    continue

                # Update the category ONLY. Never touch last_enriched_at,
                # is_food, or other columns.
                item.category = category
                pending_writes += 1
                if pending_writes >= COMMIT_BATCH_SIZE:
                    db.commit()
                    pending_writes = 0

            if not dry_run and pending_writes:
                db.commit()
    finally:
        await client.close()

    logger.info(
        "recategorize: done scanned=%d updated=%d unchanged=%d skipped_invalid=%d (dry_run=%s)",
        scanned,
        updated,
        unchanged,
        skipped_invalid,
        dry_run,
    )
    return 0


def main_run() -> int:
    """Run the backfill and return a process exit code (0 ok, 1 error)."""
    return asyncio.run(_run())


def main() -> None:
    sys.exit(main_run())


if __name__ == "__main__":
    main()
