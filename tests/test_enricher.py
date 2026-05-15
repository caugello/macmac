"""Tests for catalog enricher functionality."""

import pytest

from services.catalog.enricher.main import (
    extract_quantity_from_url,
    normalize_unit,
)

# ===== UNIT TESTS - normalize_unit =====


@pytest.mark.unit
def test_normalize_unit_grams():
    """Test normalizing gram units."""
    assert normalize_unit("g") == "g"
    assert normalize_unit("gr") == "g"
    assert normalize_unit("gram") == "g"
    assert normalize_unit("grams") == "g"
    assert normalize_unit("G") == "g"
    assert normalize_unit("GR") == "g"


@pytest.mark.unit
def test_normalize_unit_kilograms():
    """Test normalizing kilogram units."""
    assert normalize_unit("kg") == "kg"
    assert normalize_unit("KG") == "kg"
    assert normalize_unit("kilo") == "kg"
    assert normalize_unit("kilogram") == "kg"


@pytest.mark.unit
def test_normalize_unit_volume():
    """Test normalizing volume units."""
    assert normalize_unit("ml") == "ml"
    assert normalize_unit("ML") == "ml"
    assert normalize_unit("milliliter") == "ml"
    assert normalize_unit("milliliters") == "ml"
    assert normalize_unit("l") == "l"
    assert normalize_unit("L") == "l"
    assert normalize_unit("liter") == "l"
    assert normalize_unit("liters") == "l"


@pytest.mark.unit
def test_normalize_unit_pieces():
    """Test normalizing piece units."""
    assert normalize_unit("pc") == "pc"
    assert normalize_unit("piece") == "pc"
    assert normalize_unit("pieces") == "pc"
    assert normalize_unit("pcs") == "pc"
    assert normalize_unit("stuks") == "pc"
    assert normalize_unit("stuk") == "pc"
    assert normalize_unit("st") == "pc"


@pytest.mark.unit
def test_normalize_unit_spoons():
    """Test normalizing spoon units."""
    assert normalize_unit("tsp") == "tsp"
    assert normalize_unit("teaspoon") == "tsp"
    assert normalize_unit("teaspoons") == "tsp"
    assert normalize_unit("tbsp") == "tbsp"
    assert normalize_unit("tablespoon") == "tbsp"
    assert normalize_unit("tablespoons") == "tbsp"


@pytest.mark.unit
def test_normalize_unit_special():
    """Test normalizing special units."""
    assert normalize_unit("pinch") == "pinch"
    assert normalize_unit("dash") == "dash"


@pytest.mark.unit
def test_normalize_unit_invalid():
    """Test that invalid units return None."""
    assert normalize_unit("invalid") is None
    assert normalize_unit("oz") is None
    assert normalize_unit("lbs") is None
    assert normalize_unit("") is None
    assert normalize_unit(None) is None


# ===== UNIT TESTS - extract_quantity_from_url =====


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
def test_extract_quantity_from_url_with_trailing_text():
    """Test URL with quantity followed by other text."""
    url = "https://www.collectandgo.be/nl/assortiment/pasta-500g-bio"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 500.0
    assert unit == "g"


@pytest.mark.unit
def test_extract_quantity_from_url_magret():
    """Test extracting from the magret de canard example."""
    url = "https://www.collectandgo.be/nl/assortiment/boni-selection-magret-de-canard-fume-80g"
    qty, unit = extract_quantity_from_url(url)
    assert qty == 80.0
    assert unit == "g"
