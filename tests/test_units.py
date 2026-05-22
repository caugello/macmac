"""Tests for unit conversion utilities."""

import pytest

from services.shared.lib.units import to_base_unit, to_display_unit, units_compatible


@pytest.mark.unit
class TestToBaseUnit:
    def test_grams_unchanged(self):
        assert to_base_unit(500.0, "g") == (500.0, "g")

    def test_kilograms_to_grams(self):
        assert to_base_unit(1.0, "kg") == (1000.0, "g")

    def test_milliliters_unchanged(self):
        assert to_base_unit(250.0, "ml") == (250.0, "ml")

    def test_liters_to_milliliters(self):
        assert to_base_unit(2.0, "l") == (2000.0, "ml")

    def test_discrete_unit_unchanged(self):
        assert to_base_unit(3.0, "pc") == (3.0, "pc")

    def test_unknown_unit_unchanged(self):
        assert to_base_unit(1.0, "cup") == (1.0, "cup")


@pytest.mark.unit
class TestToDisplayUnit:
    def test_grams_below_threshold(self):
        assert to_display_unit(500.0, "g") == (500.0, "g")

    def test_grams_above_threshold(self):
        assert to_display_unit(1500.0, "g") == (1.5, "kg")

    def test_grams_exactly_threshold(self):
        assert to_display_unit(1000.0, "g") == (1.0, "kg")

    def test_milliliters_below_threshold(self):
        assert to_display_unit(750.0, "ml") == (750.0, "ml")

    def test_milliliters_above_threshold(self):
        assert to_display_unit(2000.0, "ml") == (2.0, "l")

    def test_discrete_unit_passthrough(self):
        assert to_display_unit(5.0, "pc") == (5.0, "pc")


@pytest.mark.unit
class TestUnitsCompatible:
    def test_mass_units_compatible(self):
        assert units_compatible("g", "kg") is True

    def test_volume_units_compatible(self):
        assert units_compatible("ml", "l") is True

    def test_same_unit_compatible(self):
        assert units_compatible("g", "g") is True

    def test_cross_dimension_incompatible(self):
        assert units_compatible("g", "ml") is False

    def test_discrete_and_mass_incompatible(self):
        assert units_compatible("pc", "g") is False

    def test_same_discrete_compatible(self):
        assert units_compatible("pc", "pc") is True

    def test_different_discrete_incompatible(self):
        assert units_compatible("tsp", "tbsp") is False

    def test_unknown_same_compatible(self):
        assert units_compatible("cup", "cup") is True

    def test_unknown_different_incompatible(self):
        assert units_compatible("cup", "bowl") is False
