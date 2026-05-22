"""Unit conversion utilities for ingredient aggregation."""

from services.shared.schemas.generic import UnitEnum

_TO_BASE: dict[UnitEnum, tuple[str, float]] = {
    UnitEnum.GRAM: ("mass", 1.0),
    UnitEnum.KILOGRAM: ("mass", 1000.0),
    UnitEnum.MILLILITER: ("volume", 1.0),
    UnitEnum.LITER: ("volume", 1000.0),
}

_DISCRETE_UNITS = {
    UnitEnum.PIECE,
    UnitEnum.TEASPOON,
    UnitEnum.TABLESPOON,
    UnitEnum.PINCH,
    UnitEnum.DASH,
}


def units_compatible(a: str, b: str) -> bool:
    try:
        enum_a = UnitEnum(a)
        enum_b = UnitEnum(b)
    except ValueError:
        return a == b
    if enum_a in _DISCRETE_UNITS or enum_b in _DISCRETE_UNITS:
        return enum_a == enum_b
    info_a = _TO_BASE.get(enum_a)
    info_b = _TO_BASE.get(enum_b)
    if info_a is None or info_b is None:
        return a == b
    return info_a[0] == info_b[0]


def to_base_unit(qty: float, unit: str) -> tuple[float, str]:
    try:
        enum_unit = UnitEnum(unit)
    except ValueError:
        return qty, unit
    info = _TO_BASE.get(enum_unit)
    if info is None:
        return qty, unit
    dimension, factor = info
    base_unit = UnitEnum.GRAM.value if dimension == "mass" else UnitEnum.MILLILITER.value
    return qty * factor, base_unit


def to_display_unit(qty: float, base_unit: str) -> tuple[float, str]:
    if base_unit == UnitEnum.GRAM.value and qty >= 1000:
        return qty / 1000.0, UnitEnum.KILOGRAM.value
    if base_unit == UnitEnum.MILLILITER.value and qty >= 1000:
        return qty / 1000.0, UnitEnum.LITER.value
    return qty, base_unit
