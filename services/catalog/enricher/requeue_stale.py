"""
Re-enrichment cron job.

Queries the catalog DB for items that need re-enrichment and publishes them
back to the enricher queue. Two buckets:
  1. Backfill: items missing image_url, nutrition, or nutriscore
  2. Refresh: items with stale price/promotion data (last_enriched_at > N days)

Each run is bounded by a per-run request budget (REENRICH_MAX_ITEMS). The
remote-enricher egress fleet flags an IP after ~125 requests, so an unbounded
full-catalog requeue blows past the fleet's flag budget and forces the
expensive Brightdata fallback. Bounding requests/run is the highest-leverage,
zero-infra cost lever. See docs/REMOTE_ENRICHER.md ->
"Egress IP Economics & Fleet Sizing".
"""

import os
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, or_

from services.catalog.db import SessionLocal
from services.catalog.models import CatalogItem
from services.config import get_config_for_service_dependency
from services.framework.logging import setup_logging
from services.shared.constant import CATALOG_PROCESS_ENTITY_QUEUE
from services.shared.lib.db import get_db
from services.shared.lib.messaging_bus import MessagingBus

logger = setup_logging()

# Days after which a fully-enriched item is considered stale and refreshed.
# Overridable via REENRICH_STALE_DAYS; unset preserves the original behaviour.
DEFAULT_STALE_THRESHOLD_DAYS = 14

# Per-run cap on how many items a single re-enrich run requeues. This is the
# main cost lever: the egress fleet flags an IP after ~125 requests, so a run
# must stay within (~125 reqs/IP x fleet size) to avoid the Brightdata fallback.
# This is a CONSERVATIVE placeholder and MUST be TUNED from the measured flag
# budget once the fleet/snitch metrics land (#353). Overridable via
# REENRICH_MAX_ITEMS. Edge behaviour: unset -> this default; <= 0 -> no cap
# (process every matching row).
DEFAULT_REENRICH_MAX_ITEMS = 500


def _get_stale_threshold_days() -> int:
    raw = os.getenv("REENRICH_STALE_DAYS")
    if raw is None:
        return DEFAULT_STALE_THRESHOLD_DAYS
    return int(raw)


def _get_max_items() -> int:
    raw = os.getenv("REENRICH_MAX_ITEMS")
    if raw is None:
        return DEFAULT_REENRICH_MAX_ITEMS
    return int(raw)


def find_items_to_requeue(db) -> list[dict]:
    """Return prioritised, capped items needing re-enrichment.

    Priority (most valuable work first, so a capped run does the most good):
      1. Backfill rows (missing image_url / nutrition / nutriscore) before
         staleness-only refresh rows.
      2. Within a bucket, oldest last_enriched_at first (NULLs first).

    The ORDER BY is deterministic and stable, so consecutive weekly runs chew
    through the backlog (backfill + oldest first) rather than re-fetching the
    same head every week -> guaranteed forward progress, no tail starvation.
    """
    stale_days = _get_stale_threshold_days()
    max_items = _get_max_items()
    stale_cutoff = datetime.now(UTC) - timedelta(days=stale_days)

    is_backfill = or_(
        CatalogItem.image_url.is_(None),
        CatalogItem.nutrition.is_(None),
        CatalogItem.nutriscore.is_(None),
    )

    # Membership: any backfill gap OR stale refresh window.
    matches = or_(is_backfill, CatalogItem.last_enriched_at < stale_cutoff)

    query = (
        db.query(
            CatalogItem.vendor_name,
            CatalogItem.vendor_product_id,
            CatalogItem.raw_name,
            CatalogItem.product_url,
        )
        .filter(matches)
        .order_by(
            # Backfill (0) sorts before refresh-only (1).
            case((is_backfill, 0), else_=1).asc(),
            CatalogItem.last_enriched_at.asc().nullsfirst(),
        )
    )

    # max_items <= 0 means "no cap" (process every matching row).
    if max_items > 0:
        query = query.limit(max_items)

    rows = query.all()

    return [
        {
            "vendor_name": r.vendor_name,
            "vendor_product_id": r.vendor_product_id,
            "raw_name": r.raw_name,
            "product_url": r.product_url,
        }
        for r in rows
    ]


def _count_matching(db) -> int:
    """Total rows matching the filter (without the per-run cap), for backlog
    visibility. One extra count query is acceptable for a cron — knowing the
    backlog size matters more than saving a query."""
    stale_days = _get_stale_threshold_days()
    stale_cutoff = datetime.now(UTC) - timedelta(days=stale_days)

    return int(
        db.query(CatalogItem)
        .filter(
            or_(
                CatalogItem.image_url.is_(None),
                CatalogItem.nutrition.is_(None),
                CatalogItem.nutriscore.is_(None),
                CatalogItem.last_enriched_at < stale_cutoff,
            )
        )
        .count()
    )


def main():
    config = get_config_for_service_dependency("catalog", "crawler")
    rabbitmq_url = os.getenv("RABBITMQ_URL", config.url)

    with get_db(SessionLocal) as db:
        total = _count_matching(db)
        items = find_items_to_requeue(db)

    if not items:
        logger.info("No items need re-enrichment")
        return

    cap = _get_max_items()
    logger.info(f"Found {total} items needing re-enrichment, queued {len(items)} (cap={cap})")

    bus = MessagingBus(url=rabbitmq_url)
    bus.declare_queue(CATALOG_PROCESS_ENTITY_QUEUE)

    for item in items:
        bus.publish(CATALOG_PROCESS_ENTITY_QUEUE, item)

    logger.info(f"Queued {len(items)} items for re-enrichment")


if __name__ == "__main__":
    main()
