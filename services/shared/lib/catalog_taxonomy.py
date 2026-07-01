"""Single source of truth for the 2-level catalog taxonomy.

The catalog stores a single flat ``category`` per item (see
``services.catalog.models.CatalogItem``). Departments are a deterministic
function of category derived from the ordered mapping below — there is no
``department`` column. The enricher LLM picks a leaf category; the department
is folded in downstream from :data:`CATEGORY_TO_DEPARTMENT`.

Departments and their categories are ordered for stable display (the
department rail and mobile accordion render in this order).
"""

# Ordered mapping: department -> (Material Symbols icon, ordered categories).
# Order is significant — it drives the department rail / accordion order.
TAXONOMY: dict[str, tuple[str, list[str]]] = {
    "Produce": (
        "eco",
        [
            "Leafy Greens",
            "Fresh Fruit",
            "Vegetables",
            "Fresh Herbs",
            "Salads & Prepared",
            "Organic",
        ],
    ),
    "Dairy & Eggs": (
        "egg",
        [
            "Milk & Cream",
            "Cheese",
            "Yogurt & Desserts",
            "Butter & Margarine",
            "Eggs",
        ],
    ),
    "Meat & Fish": (
        "set_meal",
        [
            "Beef & Pork",
            "Poultry",
            "Fish & Seafood",
            "Charcuterie & Deli",
            "Plant-Based",
        ],
    ),
    "Bakery": (
        "bakery_dining",
        [
            "Bread",
            "Pastries & Viennoiserie",
            "Cakes & Desserts",
            "Wraps & Tortillas",
        ],
    ),
    "Pantry": (
        "kitchen",
        [
            "Pasta & Rice",
            "Sauces & Condiments",
            "Oils & Vinegars",
            "Canned & Jarred",
            "Breakfast & Cereals",
            "Snacks & Sweets",
            "Baking & Cooking",
            "Soups & Broths",
            "Herbs & Spices",
        ],
    ),
    "Frozen": (
        "ac_unit",
        [
            "Frozen Meals",
            "Frozen Vegetables & Fruit",
            "Ice Cream & Desserts",
        ],
    ),
    "Beverages": (
        "local_cafe",
        [
            "Water & Soft Drinks",
            "Juices",
            "Coffee & Tea",
            "Beer, Wine & Spirits",
        ],
    ),
    "Household": (
        "cleaning_services",
        [
            "Cleaning & Laundry",
            "Personal Care",
            "Baby & Pet",
        ],
    ),
}

# Flat, ordered list of every leaf category (39 total).
CATEGORIES: list[str] = [
    category for _icon, categories in TAXONOMY.values() for category in categories
]

# The single non-food department. Its categories are the non-food leaves; every
# other leaf is food. Derived from TAXONOMY so the split can never drift.
NON_FOOD_CATEGORIES: list[str] = TAXONOMY["Household"][1]

# Food leaves = every category not owned by the non-food department, in order.
FOOD_CATEGORIES: list[str] = [
    category for category in CATEGORIES if category not in set(NON_FOOD_CATEGORIES)
]

# Alcohol is the one food leaf a row may hold with is_food=False: the enricher
# flags alcohol non-food (it skips nutrition crawling) yet "Beer, Wine & Spirits"
# lives under the food Beverages department. It is a real food leaf already —
# verify membership here, never redefine the leaf.
ALCOHOL_CATEGORY = "Beer, Wine & Spirits"
assert ALCOHOL_CATEGORY in FOOD_CATEGORIES


def allowed_categories(is_food: bool) -> list[str]:
    """Leaf categories a row may be assigned, given its is_food flag.

    Non-food items may only be Household leaves — plus alcohol, the one food
    leaf the enricher flags non-food. Shared by the enricher guardrail and the
    re-categorization backfill so the food/non-food boundary can never drift.
    """
    if is_food:
        return FOOD_CATEGORIES
    return [*NON_FOOD_CATEGORIES, ALCOHOL_CATEGORY]


# Reverse lookup: leaf category -> department.
CATEGORY_TO_DEPARTMENT: dict[str, str] = {
    category: department
    for department, (_icon, categories) in TAXONOMY.items()
    for category in categories
}


def format_categories_bullets(categories: list[str] | None = None, indent: str = "    ") -> str:
    """Render a category list as an indented bullet list, one per line.

    Used to build the category enumeration in LLM prompts (the enricher's
    extraction prompt and the recategorize backfill) from a single source of
    truth, so the prompt list can never silently drift from the taxonomy.

    ``categories`` defaults to the full :data:`CATEGORIES` list, so existing
    callers keep their byte-identical output. Pass a subset (e.g.
    :data:`FOOD_CATEGORIES`) to scope the rendered bullets.
    """
    if categories is None:
        categories = CATEGORIES
    return "\n".join(f"{indent}- {category}" for category in categories)
