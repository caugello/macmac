"""Tests for the catalog taxonomy constant and the departments handler."""

import importlib.util
import pathlib

import pytest

from services.catalog.crud import create_catalog_item, list_catalog_departments
from services.shared.lib.catalog_taxonomy import (
    CATEGORIES,
    CATEGORY_TO_DEPARTMENT,
    FOOD_CATEGORIES,
    NON_FOOD_CATEGORIES,
    TAXONOMY,
    format_categories_bullets,
)
from services.shared.schemas.catalog import CatalogItemCreate

# Expected shape, asserted independently of the constant to catch drift.
EXPECTED_DEPARTMENT_SIZES = {
    "Produce": 6,
    "Dairy & Eggs": 5,
    "Meat & Fish": 5,
    "Bakery": 4,
    "Pantry": 6,
    "Frozen": 3,
    "Beverages": 4,
    "Household": 3,
}


# ===== Taxonomy constant =====


@pytest.mark.unit
def test_taxonomy_has_eight_departments():
    assert len(TAXONOMY) == 8
    assert list(TAXONOMY) == list(EXPECTED_DEPARTMENT_SIZES)


@pytest.mark.unit
def test_taxonomy_has_thirty_six_categories():
    assert len(CATEGORIES) == 36


@pytest.mark.unit
def test_taxonomy_department_sizes():
    sizes = {dept: len(categories) for dept, (_icon, categories) in TAXONOMY.items()}
    assert sizes == EXPECTED_DEPARTMENT_SIZES


@pytest.mark.unit
def test_taxonomy_no_duplicate_categories():
    assert len(CATEGORIES) == len(set(CATEGORIES))


@pytest.mark.unit
def test_every_department_has_an_icon():
    for _dept, (icon, _categories) in TAXONOMY.items():
        assert isinstance(icon, str) and icon


@pytest.mark.unit
def test_reverse_lookup_covers_every_category():
    assert set(CATEGORY_TO_DEPARTMENT) == set(CATEGORIES)
    assert len(CATEGORY_TO_DEPARTMENT) == 36


@pytest.mark.unit
def test_reverse_lookup_maps_to_owning_department():
    for dept, (_icon, categories) in TAXONOMY.items():
        for category in categories:
            assert CATEGORY_TO_DEPARTMENT[category] == dept


@pytest.mark.unit
def test_beer_wine_spirits_is_one_category():
    # The comma must not split this into separate categories.
    assert "Beer, Wine & Spirits" in CATEGORIES


# ===== Food / non-food split (derived from the Household department) =====


@pytest.mark.unit
def test_non_food_categories_are_the_household_department():
    assert NON_FOOD_CATEGORIES == TAXONOMY["Household"][1]


@pytest.mark.unit
def test_food_and_non_food_partition_categories_exactly():
    # No overlap, and together they reconstruct the full ordered leaf set.
    assert set(FOOD_CATEGORIES).isdisjoint(NON_FOOD_CATEGORIES)
    assert set(FOOD_CATEGORIES) | set(NON_FOOD_CATEGORIES) == set(CATEGORIES)
    assert len(FOOD_CATEGORIES) + len(NON_FOOD_CATEGORIES) == len(CATEGORIES)


@pytest.mark.unit
def test_food_categories_preserve_taxonomy_order():
    # Food leaves keep their original relative order from CATEGORIES.
    assert FOOD_CATEGORIES == [c for c in CATEGORIES if c not in set(NON_FOOD_CATEGORIES)]


# ===== Departments handler =====


async def _seed(db, items):
    for pid, category in items:
        await create_catalog_item(
            CatalogItemCreate(
                vendor_name="test_vendor",
                vendor_product_id=pid,
                raw_name=f"Product {pid}",
                product_url=f"https://example.com/products/{pid}",
                is_food=True,
                category=category,
            ),
            db,
        )


@pytest.mark.asyncio
@pytest.mark.unit
async def test_departments_returns_full_taxonomy_when_empty(mock_catalog_db):
    result = await list_catalog_departments(mock_catalog_db)

    assert len(result.departments) == 8
    total_categories = sum(len(d.categories) for d in result.departments)
    assert total_categories == 36
    # Every count is zero on an empty catalog.
    assert all(d.count == 0 for d in result.departments)
    assert all(c.count == 0 for d in result.departments for c in d.categories)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_departments_preserve_taxonomy_order(mock_catalog_db):
    result = await list_catalog_departments(mock_catalog_db)

    assert [d.name for d in result.departments] == list(TAXONOMY)
    for dept_model in result.departments:
        _icon, expected_categories = TAXONOMY[dept_model.name]
        assert [c.name for c in dept_model.categories] == expected_categories
        assert dept_model.icon == _icon


@pytest.mark.asyncio
@pytest.mark.unit
async def test_departments_fold_counts(mock_catalog_db):
    await _seed(
        mock_catalog_db,
        [
            ("a", "Leafy Greens"),
            ("b", "Leafy Greens"),
            ("c", "Vegetables"),
            ("d", "Milk & Cream"),
        ],
    )

    result = await list_catalog_departments(mock_catalog_db)
    by_name = {d.name: d for d in result.departments}

    produce = by_name["Produce"]
    assert produce.count == 3  # 2 Leafy Greens + 1 Vegetables
    produce_cats = {c.name: c.count for c in produce.categories}
    assert produce_cats["Leafy Greens"] == 2
    assert produce_cats["Vegetables"] == 1
    assert produce_cats["Fresh Fruit"] == 0

    dairy = by_name["Dairy & Eggs"]
    assert dairy.count == 1
    assert {c.name: c.count for c in dairy.categories}["Milk & Cream"] == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_departments_ignore_unknown_categories(mock_catalog_db):
    # A legacy/unknown category must not appear and must not crash the fold.
    await _seed(mock_catalog_db, [("x", "Legacy Category"), ("y", "Leafy Greens")])

    result = await list_catalog_departments(mock_catalog_db)
    by_name = {d.name: d for d in result.departments}

    assert by_name["Produce"].count == 1
    assert sum(d.count for d in result.departments) == 1


# ===== Migration mapping =====


def _load_migration():
    path = pathlib.Path(
        "services/catalog/alembic/versions/e6f7a8b9c0d1_remap_catalog_categories_to_taxonomy.py"
    )
    spec = importlib.util.spec_from_file_location("catalog_taxonomy_migration", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


# The 19 legacy labels the migration must cover.
OLD_LABELS = {
    "Pasta & Rice",
    "Bread & Bakery",
    "Dairy & Eggs",
    "Meat & Poultry",
    "Fish & Seafood",
    "Fruits & Vegetables",
    "Frozen Foods",
    "Snacks & Chips",
    "Sweets & Chocolate",
    "Beverages",
    "Coffee & Tea",
    "Sauces & Condiments",
    "Oils & Vinegars",
    "Canned & Jarred",
    "Breakfast & Cereals",
    "Baby Food",
    "Pet Food",
    "Household & Cleaning",
    "Personal Care",
}


@pytest.mark.unit
def test_migration_covers_all_nineteen_old_labels():
    module = _load_migration()
    assert set(module.OLD_TO_NEW) == OLD_LABELS
    assert len(module.OLD_TO_NEW) == 19


@pytest.mark.unit
def test_migration_targets_are_valid_leaf_categories():
    module = _load_migration()
    for new in module.OLD_TO_NEW.values():
        assert new in CATEGORIES


@pytest.mark.unit
def test_migration_lossy_merges():
    module = _load_migration()
    # Two old labels collapse onto each lossy target.
    assert module.OLD_TO_NEW["Snacks & Chips"] == "Snacks & Sweets"
    assert module.OLD_TO_NEW["Sweets & Chocolate"] == "Snacks & Sweets"
    assert module.OLD_TO_NEW["Baby Food"] == "Baby & Pet"
    assert module.OLD_TO_NEW["Pet Food"] == "Baby & Pet"
    assert module._LOSSY_NEW_LABELS == {"Snacks & Sweets", "Baby & Pet"}


# ===== Drift guard: format_categories_bullets shared by the enricher prompt =====


@pytest.mark.unit
def test_format_categories_bullets_matches_every_category():
    lines = format_categories_bullets().split("\n")
    assert lines == [f"    - {category}" for category in CATEGORIES]
    assert len(lines) == 36


@pytest.mark.unit
def test_format_categories_bullets_respects_indent():
    lines = format_categories_bullets(indent="  ").split("\n")
    assert lines == [f"  - {category}" for category in CATEGORIES]


@pytest.mark.unit
def test_format_categories_bullets_default_is_byte_identical_full_list():
    # Default (no arg) must render the full 36-leaf list exactly — the enricher
    # prompt depends on this. Byte-identical to passing CATEGORIES explicitly.
    assert format_categories_bullets() == format_categories_bullets(CATEGORIES)
    assert format_categories_bullets() == "\n".join(f"    - {category}" for category in CATEGORIES)


@pytest.mark.unit
def test_format_categories_bullets_renders_only_the_subset():
    food = format_categories_bullets(FOOD_CATEGORIES)
    assert food == "\n".join(f"    - {category}" for category in FOOD_CATEGORIES)
    # A non-food leaf never appears in the food-scoped bullets, and vice-versa.
    for category in NON_FOOD_CATEGORIES:
        assert f"- {category}" not in food
    non_food = format_categories_bullets(NON_FOOD_CATEGORIES)
    assert non_food == "\n".join(f"    - {category}" for category in NON_FOOD_CATEGORIES)
    for category in FOOD_CATEGORIES:
        assert f"- {category}" not in non_food


@pytest.mark.unit
def test_enricher_prompt_interpolates_the_helper():
    # The enricher's extraction prompt must build its category list from the
    # helper, not a hardcoded copy that can silently drift from the taxonomy.
    source = pathlib.Path("services/catalog/enricher/main.py").read_text()
    assert "{format_categories_bullets()}" in source
    # No stray hardcoded bullet lines survived the drift-guard refactor.
    for category in CATEGORIES:
        assert f"    - {category}\n" not in source


@pytest.mark.unit
def test_rendered_enricher_bullets_cover_every_category():
    # The rendered block (what the LLM actually sees) enumerates all 36 leaves.
    rendered = format_categories_bullets()
    for category in CATEGORIES:
        assert f"    - {category}" in rendered
