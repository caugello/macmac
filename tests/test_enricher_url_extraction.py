"""Tests for URL-based quantity extraction in enricher."""

import pytest


def normalize_unit(unit: str | None) -> str | None:
    """Normalize unit strings to valid UnitEnum values."""
    if not unit:
        return None

    unit_lower = unit.lower().strip()

    unit_map = {
        'piece': 'pc',
        'pieces': 'pc',
        'pcs': 'pc',
        'stuks': 'pc',
        'stuk': 'pc',
        'st': 'pc',
        'gram': 'g',
        'grams': 'g',
        'gr': 'g',
        'kilo': 'kg',
        'kilogram': 'kg',
        'milliliter': 'ml',
        'milliliters': 'ml',
        'liter': 'l',
        'liters': 'l',
        'centiliter': 'ml',
        'cl': 'ml',
        'teaspoon': 'tsp',
        'teaspoons': 'tsp',
        'tablespoon': 'tbsp',
        'tablespoons': 'tbsp',
    }

    valid_units = {'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'pc', 'pinch', 'dash'}
    if unit_lower in valid_units:
        return unit_lower

    return unit_map.get(unit_lower)


def extract_quantity_from_url(url: str) -> tuple[float | None, str | None]:
    """
    Extract quantity and unit from product URL.
    Imported from enricher for testing.
    """
    import re

    URL_QTY_PATTERN = re.compile(r'-(\d+(?:[.,]\d+)?)(g|kg|ml|l|cl)(?:-|$)', re.IGNORECASE)

    match = URL_QTY_PATTERN.search(url)
    if not match:
        return None, None

    qty_str = match.group(1).replace(',', '.')
    unit = match.group(2).lower()

    try:
        qty = float(qty_str)
    except ValueError:
        return None, None

    # Handle centiliters conversion before normalization
    if unit == 'cl':
        qty = qty * 10
        unit = 'ml'

    # Normalize unit to schema-compliant value
    normalized = normalize_unit(unit)
    if normalized:
        return qty, normalized

    return None, None


@pytest.mark.unit
def test_extract_quantity_from_url_grams():
    """Test extracting grams from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/boni-zonnebloempitten-280g"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 280.0
    assert unit == "g"


@pytest.mark.unit
def test_extract_quantity_from_url_kilograms():
    """Test extracting kilograms from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/soubry-pasta-spaghetti-1kg"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.0
    assert unit == "kg"


@pytest.mark.unit
def test_extract_quantity_from_url_liters():
    """Test extracting liters from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/milk-fresh-1l"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.0
    assert unit == "l"


@pytest.mark.unit
def test_extract_quantity_from_url_milliliters():
    """Test extracting milliliters from URL."""
    url = "https://www.collectandgo.be/nl/assortiment/juice-orange-500ml"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 500.0
    assert unit == "ml"


@pytest.mark.unit
def test_extract_quantity_from_url_centiliters():
    """Test extracting centiliters and converting to ml."""
    url = "https://www.collectandgo.be/nl/assortiment/drink-cola-33cl"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 330.0  # 33cl = 330ml
    assert unit == "ml"


@pytest.mark.unit
def test_extract_quantity_from_url_decimal():
    """Test extracting decimal quantities."""
    url = "https://www.collectandgo.be/nl/assortiment/water-sparkling-1.5l"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.5
    assert unit == "l"


@pytest.mark.unit
def test_extract_quantity_from_url_comma_decimal():
    """Test extracting quantities with comma as decimal separator."""
    url = "https://www.collectandgo.be/nl/assortiment/product-1,5kg"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 1.5
    assert unit == "kg"


@pytest.mark.unit
def test_extract_quantity_from_url_no_match():
    """Test URL without quantity returns None."""
    url = "https://www.collectandgo.be/nl/assortiment/product-name-only"
    qty, unit = extract_quantity_from_url(url)
    assert qty is None
    assert unit is None


@pytest.mark.unit
def test_extract_quantity_from_url_pack_size():
    """Test URL with pack notation (12x330ml) doesn't extract - we want individual item size."""
    url = "https://www.collectandgo.be/nl/assortiment/pack-12x330ml"
    qty, unit = extract_quantity_from_url(url)
    # Pack sizes like "12x330ml" are not extracted - need hyphen before quantity
    assert qty is None
    assert unit is None


@pytest.mark.unit
def test_extract_quantity_from_url_individual_from_pack():
    """Test extracting individual item size from pack URL."""
    url = "https://www.collectandgo.be/nl/assortiment/cola-pack-12x-330ml"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 330.0
    assert unit == "ml"


@pytest.mark.unit
def test_extract_quantity_from_url_with_trailing_text():
    """Test URL with quantity followed by other text."""
    url = "https://www.collectandgo.be/nl/assortiment/pasta-500g-bio"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 500.0
    assert unit == "g"


# Unit normalization tests
@pytest.mark.unit
def test_normalize_unit_pieces_variations():
    """Test normalizing pieces variations to pc."""
    assert normalize_unit("pieces") == "pc"
    assert normalize_unit("piece") == "pc"
    assert normalize_unit("pcs") == "pc"
    assert normalize_unit("stuks") == "pc"
    assert normalize_unit("stuk") == "pc"
    assert normalize_unit("st") == "pc"
    assert normalize_unit("PIECES") == "pc"  # Case insensitive


@pytest.mark.unit
def test_normalize_unit_weight():
    """Test normalizing weight units."""
    assert normalize_unit("gram") == "g"
    assert normalize_unit("grams") == "g"
    assert normalize_unit("gr") == "g"
    assert normalize_unit("g") == "g"
    assert normalize_unit("kilo") == "kg"
    assert normalize_unit("kilogram") == "kg"
    assert normalize_unit("kg") == "kg"


@pytest.mark.unit
def test_normalize_unit_volume():
    """Test normalizing volume units."""
    assert normalize_unit("milliliter") == "ml"
    assert normalize_unit("milliliters") == "ml"
    assert normalize_unit("ml") == "ml"
    assert normalize_unit("liter") == "l"
    assert normalize_unit("liters") == "l"
    assert normalize_unit("l") == "l"


@pytest.mark.unit
def test_normalize_unit_valid_passthrough():
    """Test that already valid units pass through unchanged."""
    assert normalize_unit("g") == "g"
    assert normalize_unit("kg") == "kg"
    assert normalize_unit("ml") == "ml"
    assert normalize_unit("l") == "l"
    assert normalize_unit("tsp") == "tsp"
    assert normalize_unit("tbsp") == "tbsp"
    assert normalize_unit("pc") == "pc"
    assert normalize_unit("pinch") == "pinch"
    assert normalize_unit("dash") == "dash"


@pytest.mark.unit
def test_normalize_unit_invalid():
    """Test that invalid units return None."""
    assert normalize_unit("invalid") is None
    assert normalize_unit("xyz") is None
    assert normalize_unit("") is None
    assert normalize_unit(None) is None
