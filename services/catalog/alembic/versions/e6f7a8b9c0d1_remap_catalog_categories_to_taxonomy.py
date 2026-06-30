"""remap catalog categories to 2-level taxonomy

Migrates the old 19 flat category labels to the new 36-leaf taxonomy
(8 departments). Department is derived downstream from the leaf category;
no column is added. Mappings are 1:1 where unambiguous and use a sensible
default where the old label is broader than any single new leaf — later
re-enrichment refines those.

Lossy merges (cannot be perfectly reversed on downgrade, documented below):
  - "Snacks & Chips"  -> "Snacks & Sweets"
  - "Sweets & Chocolate" -> "Snacks & Sweets"
  - "Baby Food" -> "Baby & Pet"
  - "Pet Food"  -> "Baby & Pet"

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-06-30 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy import bindparam, text

# revision identifiers, used by Alembic.
revision: str = "e6f7a8b9c0d1"
down_revision: str | Sequence[str] | None = "d5e6f7a8b9c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Old label -> new leaf category. Includes 1:1 (unchanged) entries so the
# full set of 19 old labels is covered explicitly.
OLD_TO_NEW: dict[str, str] = {
    "Pasta & Rice": "Pasta & Rice",
    "Bread & Bakery": "Bread",
    "Dairy & Eggs": "Milk & Cream",
    "Meat & Poultry": "Poultry",
    "Fish & Seafood": "Fish & Seafood",
    "Fruits & Vegetables": "Vegetables",
    "Frozen Foods": "Frozen Meals",
    "Snacks & Chips": "Snacks & Sweets",
    "Sweets & Chocolate": "Snacks & Sweets",
    "Beverages": "Water & Soft Drinks",
    "Coffee & Tea": "Coffee & Tea",
    "Sauces & Condiments": "Sauces & Condiments",
    "Oils & Vinegars": "Oils & Vinegars",
    "Canned & Jarred": "Canned & Jarred",
    "Breakfast & Cereals": "Breakfast & Cereals",
    "Baby Food": "Baby & Pet",
    "Pet Food": "Baby & Pet",
    "Household & Cleaning": "Cleaning & Laundry",
    "Personal Care": "Personal Care",
}

# Lossy merges: two old labels collapse onto one new label, so a downgrade
# cannot recover which original each row had. We pick one representative
# original per merged new label (chosen below) and leave it at that value.
_LOSSY_NEW_LABELS = {"Snacks & Sweets", "Baby & Pet"}


def _update(old: str, new: str) -> None:
    stmt = text("UPDATE catalog SET category = :new WHERE category = :old").bindparams(
        bindparam("new", value=new),
        bindparam("old", value=old),
    )
    op.get_bind().execute(stmt)


def upgrade() -> None:
    for old, new in OLD_TO_NEW.items():
        if old == new:
            continue
        _update(old, new)


def downgrade() -> None:
    # Reverse the non-lossy, 1:1 mappings. Skip unchanged and lossy entries:
    # the lossy merges ("Snacks & Sweets", "Baby & Pet") cannot be split back
    # into their two original labels, so those rows are left at the new value.
    for old, new in OLD_TO_NEW.items():
        if old == new or new in _LOSSY_NEW_LABELS:
            continue
        _update(new, old)
