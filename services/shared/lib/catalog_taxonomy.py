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

# Flat, ordered list of every leaf category (36 total).
CATEGORIES: list[str] = [
    category for _icon, categories in TAXONOMY.values() for category in categories
]

# Reverse lookup: leaf category -> department.
CATEGORY_TO_DEPARTMENT: dict[str, str] = {
    category: department
    for department, (_icon, categories) in TAXONOMY.items()
    for category in categories
}
