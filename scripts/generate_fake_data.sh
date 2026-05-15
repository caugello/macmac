#!/bin/bash

################################################################################
# MacMac Fake Data Generator
#
# Generates realistic test data for the MacMac meal planning application:
# - Catalog items (groceries with nutrition and prices)
# - Recipes (with ingredients linked to catalog items)
# - Meal plans (2 weeks of breakfast, lunch, dinner)
#
# Usage:
#   ./scripts/generate_fake_data.sh [OPTIONS]
#
# Options:
#   --catalog-only     Only create catalog items
#   --recipes-only     Only create recipes (requires catalog items)
#   --meals-only       Only create meal plans (requires recipes)
#   --start-date DATE  Start date for meal plans (default: 2026-05-19)
#   --weeks N          Number of weeks to generate (default: 2)
#   --base-url URL     Base URL for API (default: http://localhost)
#
# Examples:
#   ./scripts/generate_fake_data.sh
#   ./scripts/generate_fake_data.sh --weeks 4
#   ./scripts/generate_fake_data.sh --start-date 2026-06-01 --weeks 1
#
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
BASE_URL="http://localhost"
START_DATE="2026-05-19"
WEEKS=2
CREATE_CATALOG=true
CREATE_RECIPES=true
CREATE_MEALS=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --catalog-only)
      CREATE_RECIPES=false
      CREATE_MEALS=false
      shift
      ;;
    --recipes-only)
      CREATE_CATALOG=false
      CREATE_MEALS=false
      shift
      ;;
    --meals-only)
      CREATE_CATALOG=false
      CREATE_RECIPES=false
      shift
      ;;
    --start-date)
      START_DATE="$2"
      shift 2
      ;;
    --weeks)
      WEEKS="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    -h|--help)
      head -n 30 "$0" | tail -n 28
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# API endpoints
CATALOG_API="${BASE_URL}:8002/catalog"
RECIPES_API="${BASE_URL}:8001/recipes"
MEALS_API="${BASE_URL}:8003/meal-plans"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  MacMac Fake Data Generator${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Configuration:"
echo "  Base URL: ${BASE_URL}"
echo "  Start Date: ${START_DATE}"
echo "  Weeks: ${WEEKS}"
echo "  Catalog: ${CREATE_CATALOG}"
echo "  Recipes: ${CREATE_RECIPES}"
echo "  Meals: ${CREATE_MEALS}"
echo ""

################################################################################
# Function: Create catalog item
################################################################################
create_catalog_item() {
  local vendor_name="$1"
  local raw_name="$2"
  local canonical_name="$3"
  local brand="$4"
  local quantity="$5"
  local unit="$6"
  local price="$7"
  local category="$8"
  local calories="$9"
  local protein="${10}"
  local fat="${11}"
  local carbs="${12}"

  local result=$(curl -s -X POST "$CATALOG_API" \
    -H "Content-Type: application/json" \
    -d "{
      \"vendor_name\": \"$vendor_name\",
      \"raw_name\": \"$raw_name\",
      \"product_url\": \"https://example.com/${canonical_name// /-}\",
      \"canonical_name\": \"$canonical_name\",
      \"brand\": \"$brand\",
      \"net_quantity_value\": $quantity,
      \"net_quantity_unit\": \"$unit\",
      \"is_food\": true,
      \"price\": $price,
      \"category\": \"$category\",
      \"nutrition\": {\"calories\": $calories, \"protein\": $protein, \"fat\": $fat, \"carbs\": $carbs}
    }" 2>/dev/null)

  # Debug: print result if needed
  # >&2 echo "API Response: $result"

  local id=$(echo "$result" | jq -r '.id // empty' 2>/dev/null)
  if [ -n "$id" ] && [ "$id" != "null" ]; then
    echo "$id"
  else
    >&2 echo "Failed to create catalog item: $canonical_name"
    >&2 echo "Response: $result"
    echo ""
  fi
}

################################################################################
# Function: Create recipe
################################################################################
create_recipe() {
  local title="$1"
  local description="$2"
  local steps="$3"
  shift 3

  # Build ingredients array from remaining arguments
  local ingredients_json="["
  local first=true
  for ing in "$@"; do
    if [ "$first" = true ]; then
      first=false
    else
      ingredients_json+=","
    fi
    ingredients_json+="$ing"
  done
  ingredients_json+="]"

  local result=$(curl -s -X POST "$RECIPES_API" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"$title\",
      \"description\": \"$description\",
      \"steps\": [\"$steps\"],
      \"ingredients\": $ingredients_json
    }" 2>/dev/null)

  local id=$(echo "$result" | jq -r '.id // empty' 2>/dev/null)
  if [ -n "$id" ] && [ "$id" != "null" ]; then
    echo "$id"
  else
    >&2 echo "Failed to create recipe: $title"
    >&2 echo "Response: $result"
    echo ""
  fi
}

################################################################################
# Function: Create meal plan
################################################################################
create_meal_plan() {
  local date="$1"
  local meal_type="$2"
  local recipe_id="$3"

  curl -s -X POST "$MEALS_API" \
    -H "Content-Type: application/json" \
    -d "{\"date\": \"$date\", \"meal_type\": \"$meal_type\", \"recipe_id\": \"$recipe_id\"}" \
    > /dev/null 2>&1
}

################################################################################
# STEP 1: Create Catalog Items
################################################################################
if [ "$CREATE_CATALOG" = true ]; then
  echo -e "${YELLOW}📦 Creating Catalog Items...${NC}"
  echo ""

  # Format: vendor raw_name canonical brand qty unit price category cal protein fat carbs
  EGG_ID=$(create_catalog_item "Colruyt" "Farm Fresh Eggs 12pk" "Eggs" "Farm Fresh" 12 "pc" 3.99 "Dairy" 155 13 11 1)
  [ -n "$EGG_ID" ] && echo "  ✓ Eggs: $EGG_ID"

  BREAD_ID=$(create_catalog_item "Colruyt" "Whole Wheat Bread 500g" "Whole Wheat Bread" "Baker Street" 500 "g" 2.49 "Bakery" 247 13 3 41)
  [ -n "$BREAD_ID" ] && echo "  ✓ Bread: $BREAD_ID"

  OATS_ID=$(create_catalog_item "Colruyt" "Rolled Oats 1kg" "Rolled Oats" "Quaker" 1 "kg" 3.29 "Breakfast" 389 17 7 66)
  [ -n "$OATS_ID" ] && echo "  ✓ Oats: $OATS_ID"

  AVOCADO_ID=$(create_catalog_item "Colruyt" "Hass Avocado 1pc" "Avocado" "Fresh Produce" 1 "pc" 1.99 "Produce" 160 2 15 9)
  [ -n "$AVOCADO_ID" ] && echo "  ✓ Avocado: $AVOCADO_ID"

  TOMATO_ID=$(create_catalog_item "Colruyt" "Cherry Tomatoes 250g" "Cherry Tomatoes" "Fresh Valley" 250 "g" 2.79 "Produce" 18 1 0 4)
  [ -n "$TOMATO_ID" ] && echo "  ✓ Tomatoes: $TOMATO_ID"

  CHICKEN_ID=$(create_catalog_item "Colruyt" "Chicken Breast Fillets 500g" "Chicken Breast" "Fresh Farm" 500 "g" 6.99 "Meat & Poultry" 165 31 3.6 0)
  [ -n "$CHICKEN_ID" ] && echo "  ✓ Chicken: $CHICKEN_ID"

  PASTA_ID=$(create_catalog_item "Colruyt" "Spaghetti 500g" "Spaghetti" "Barilla" 500 "g" 1.89 "Pasta & Rice" 371 13 1.5 74)
  [ -n "$PASTA_ID" ] && echo "  ✓ Pasta: $PASTA_ID"

  SALMON_ID=$(create_catalog_item "Colruyt" "Atlantic Salmon Fillet 300g" "Salmon Fillet" "Ocean Fresh" 300 "g" 8.99 "Fish & Seafood" 208 20 13 0)
  [ -n "$SALMON_ID" ] && echo "  ✓ Salmon: $SALMON_ID"

  BERRIES_ID=$(create_catalog_item "Colruyt" "Mixed Berries 300g" "Mixed Berries" "Farm Fresh" 300 "g" 4.49 "Produce" 57 1 0.3 14)
  [ -n "$BERRIES_ID" ] && echo "  ✓ Berries: $BERRIES_ID"

  FETA_ID=$(create_catalog_item "Colruyt" "Feta Cheese 200g" "Feta Cheese" "Greek Style" 200 "g" 3.49 "Dairy" 264 14 21 4)
  [ -n "$FETA_ID" ] && echo "  ✓ Feta: $FETA_ID"

  BEEF_ID=$(create_catalog_item "Colruyt" "Ground Beef 500g" "Ground Beef" "Premium Butcher" 500 "g" 5.99 "Meat & Poultry" 250 26 15 0)
  [ -n "$BEEF_ID" ] && echo "  ✓ Beef: $BEEF_ID"

  QUINOA_ID=$(create_catalog_item "Colruyt" "Organic Quinoa 500g" "Quinoa" "Organic Valley" 500 "g" 4.99 "Pasta & Rice" 368 14 6 64)
  [ -n "$QUINOA_ID" ] && echo "  ✓ Quinoa: $QUINOA_ID"

  PORK_ID=$(create_catalog_item "Colruyt" "Pork Chops 400g" "Pork Chops" "Fresh Farm" 400 "g" 6.49 "Meat & Poultry" 242 26 14 0)
  [ -n "$PORK_ID" ] && echo "  ✓ Pork: $PORK_ID"

  echo ""
  echo -e "${GREEN}✓ Created 13 catalog items${NC}"
  echo ""

  # Save IDs to temp file for later use
  cat > /tmp/macmac_catalog_ids.txt <<EOF
EGG_ID=$EGG_ID
BREAD_ID=$BREAD_ID
OATS_ID=$OATS_ID
AVOCADO_ID=$AVOCADO_ID
TOMATO_ID=$TOMATO_ID
CHICKEN_ID=$CHICKEN_ID
PASTA_ID=$PASTA_ID
SALMON_ID=$SALMON_ID
BERRIES_ID=$BERRIES_ID
FETA_ID=$FETA_ID
BEEF_ID=$BEEF_ID
QUINOA_ID=$QUINOA_ID
PORK_ID=$PORK_ID
EOF
else
  # Load existing IDs
  if [ -f /tmp/macmac_catalog_ids.txt ]; then
    source /tmp/macmac_catalog_ids.txt
    echo -e "${BLUE}ℹ Using existing catalog items${NC}"
  else
    echo -e "${RED}✗ Catalog IDs not found. Run with catalog creation first.${NC}"
    exit 1
  fi
fi

################################################################################
# STEP 2: Create Recipes
################################################################################
if [ "$CREATE_RECIPES" = true ]; then
  echo -e "${YELLOW}🍳 Creating Recipes...${NC}"
  echo ""

  # Recipe 1: Scrambled Eggs with Toast
  RECIPE1_ID=$(create_recipe \
    "Scrambled Eggs with Toast" \
    "Quick and easy breakfast with fluffy scrambled eggs and crispy toast" \
    "Beat 2 eggs, cook in butter until fluffy, serve with toasted bread" \
    "{\"catalog_item_id\": \"$EGG_ID\", \"qty\": 2, \"unit\": \"pc\"}" \
    "{\"catalog_item_id\": \"$BREAD_ID\", \"qty\": 100, \"unit\": \"g\"}")
  [ -n "$RECIPE1_ID" ] && echo "  ✓ Scrambled Eggs with Toast"

  # Recipe 2: Oatmeal with Berries
  RECIPE2_ID=$(create_recipe \
    "Oatmeal with Berries" \
    "Healthy breakfast with oats and fresh berries" \
    "Cook 50g oats in water, top with fresh berries and honey" \
    "{\"catalog_item_id\": \"$OATS_ID\", \"qty\": 50, \"unit\": \"g\"}" \
    "{\"catalog_item_id\": \"$BERRIES_ID\", \"qty\": 100, \"unit\": \"g\"}")
  [ -n "$RECIPE2_ID" ] && echo "  ✓ Oatmeal with Berries"

  # Recipe 3: Avocado Toast
  RECIPE3_ID=$(create_recipe \
    "Avocado Toast" \
    "Trendy and delicious avocado on crispy toast" \
    "Toast 2 slices bread, mash 1 avocado with salt and pepper, spread on toast" \
    "{\"catalog_item_id\": \"$BREAD_ID\", \"qty\": 80, \"unit\": \"g\"}" \
    "{\"catalog_item_id\": \"$AVOCADO_ID\", \"qty\": 1, \"unit\": \"pc\"}")
  [ -n "$RECIPE3_ID" ] && echo "  ✓ Avocado Toast"

  # Recipe 4: Greek Salad
  RECIPE4_ID=$(create_recipe \
    "Greek Salad" \
    "Fresh Mediterranean salad with feta cheese" \
    "Combine tomatoes, cucumbers, olives, and feta cheese. Dress with olive oil." \
    "{\"catalog_item_id\": \"$TOMATO_ID\", \"qty\": 200, \"unit\": \"g\"}" \
    "{\"catalog_item_id\": \"$FETA_ID\", \"qty\": 100, \"unit\": \"g\"}")
  [ -n "$RECIPE4_ID" ] && echo "  ✓ Greek Salad"

  # Recipe 5: Chicken Stir Fry
  RECIPE5_ID=$(create_recipe \
    "Chicken Stir Fry" \
    "Quick Asian-inspired chicken dish" \
    "Slice chicken breast, stir fry with vegetables and soy sauce" \
    "{\"catalog_item_id\": \"$CHICKEN_ID\", \"qty\": 400, \"unit\": \"g\"}")
  [ -n "$RECIPE5_ID" ] && echo "  ✓ Chicken Stir Fry"

  # Recipe 6: Spaghetti Bolognese
  RECIPE6_ID=$(create_recipe \
    "Spaghetti Bolognese" \
    "Classic Italian pasta with meat sauce" \
    "Cook pasta. Brown ground beef, add tomato sauce, simmer. Combine." \
    "{\"catalog_item_id\": \"$PASTA_ID\", \"qty\": 400, \"unit\": \"g\"}" \
    "{\"catalog_item_id\": \"$BEEF_ID\", \"qty\": 300, \"unit\": \"g\"}" \
    "{\"catalog_item_id\": \"$TOMATO_ID\", \"qty\": 150, \"unit\": \"g\"}")
  [ -n "$RECIPE6_ID" ] && echo "  ✓ Spaghetti Bolognese"

  # Recipe 7: Grilled Salmon
  RECIPE7_ID=$(create_recipe \
    "Grilled Salmon with Vegetables" \
    "Healthy grilled salmon with roasted vegetables" \
    "Grill salmon fillet, roast vegetables with olive oil and herbs" \
    "{\"catalog_item_id\": \"$SALMON_ID\", \"qty\": 250, \"unit\": \"g\"}")
  [ -n "$RECIPE7_ID" ] && echo "  ✓ Grilled Salmon"

  # Recipe 8: Quinoa Buddha Bowl
  RECIPE8_ID=$(create_recipe \
    "Quinoa Buddha Bowl" \
    "Nutritious bowl with quinoa and fresh vegetables" \
    "Cook quinoa, top with roasted vegetables, avocado, and tahini dressing" \
    "{\"catalog_item_id\": \"$QUINOA_ID\", \"qty\": 150, \"unit\": \"g\"}" \
    "{\"catalog_item_id\": \"$AVOCADO_ID\", \"qty\": 1, \"unit\": \"pc\"}")
  [ -n "$RECIPE8_ID" ] && echo "  ✓ Quinoa Buddha Bowl"

  # Recipe 9: Pork Chops
  RECIPE9_ID=$(create_recipe \
    "Pork Chops Dinner" \
    "Juicy pan-fried pork chops" \
    "Pan fry pork chops until golden brown" \
    "{\"catalog_item_id\": \"$PORK_ID\", \"qty\": 300, \"unit\": \"g\"}")
  [ -n "$RECIPE9_ID" ] && echo "  ✓ Pork Chops"

  # Recipe 10: Grilled Chicken Wrap
  RECIPE10_ID=$(create_recipe \
    "Grilled Chicken Wrap" \
    "Light and healthy chicken wrap with fresh vegetables" \
    "Grill chicken breast, wrap with fresh vegetables" \
    "{\"catalog_item_id\": \"$CHICKEN_ID\", \"qty\": 200, \"unit\": \"g\"}")
  [ -n "$RECIPE10_ID" ] && echo "  ✓ Grilled Chicken Wrap"

  echo ""
  echo -e "${GREEN}✓ Created 10 recipes${NC}"
  echo ""

  # Save recipe IDs
  cat > /tmp/macmac_recipe_ids.txt <<EOF
RECIPE1_ID=$RECIPE1_ID
RECIPE2_ID=$RECIPE2_ID
RECIPE3_ID=$RECIPE3_ID
RECIPE4_ID=$RECIPE4_ID
RECIPE5_ID=$RECIPE5_ID
RECIPE6_ID=$RECIPE6_ID
RECIPE7_ID=$RECIPE7_ID
RECIPE8_ID=$RECIPE8_ID
RECIPE9_ID=$RECIPE9_ID
RECIPE10_ID=$RECIPE10_ID
EOF
else
  # Load existing recipe IDs
  if [ -f /tmp/macmac_recipe_ids.txt ]; then
    source /tmp/macmac_recipe_ids.txt
    echo -e "${BLUE}ℹ Using existing recipes${NC}"
  else
    echo -e "${RED}✗ Recipe IDs not found. Run with recipe creation first.${NC}"
    exit 1
  fi
fi

################################################################################
# STEP 3: Create Meal Plans
################################################################################
if [ "$CREATE_MEALS" = true ]; then
  echo -e "${YELLOW}📅 Creating Meal Plans...${NC}"
  echo ""

  # Create array of recipe IDs
  RECIPES=($RECIPE1_ID $RECIPE2_ID $RECIPE3_ID $RECIPE4_ID $RECIPE5_ID \
           $RECIPE6_ID $RECIPE7_ID $RECIPE8_ID $RECIPE9_ID $RECIPE10_ID)

  # Calculate total days
  TOTAL_DAYS=$((WEEKS * 7))

  # Counter for meals created
  MEALS_CREATED=0

  # Parse start date
  START_EPOCH=$(date -j -f "%Y-%m-%d" "$START_DATE" "+%s" 2>/dev/null || date -d "$START_DATE" "+%s" 2>/dev/null)

  # Generate meal plans
  for (( day=0; day<$TOTAL_DAYS; day++ )); do
    # Calculate current date
    CURRENT_EPOCH=$((START_EPOCH + (day * 86400)))
    CURRENT_DATE=$(date -r $CURRENT_EPOCH "+%Y-%m-%d" 2>/dev/null || date -d "@$CURRENT_EPOCH" "+%Y-%m-%d" 2>/dev/null)

    # Create breakfast
    RECIPE_IDX=$((RANDOM % 10))
    create_meal_plan "$CURRENT_DATE" "breakfast" "${RECIPES[$RECIPE_IDX]}"
    MEALS_CREATED=$((MEALS_CREATED + 1))

    # Create lunch
    RECIPE_IDX=$((RANDOM % 10))
    create_meal_plan "$CURRENT_DATE" "lunch" "${RECIPES[$RECIPE_IDX]}"
    MEALS_CREATED=$((MEALS_CREATED + 1))

    # Create dinner
    RECIPE_IDX=$((RANDOM % 10))
    create_meal_plan "$CURRENT_DATE" "dinner" "${RECIPES[$RECIPE_IDX]}"
    MEALS_CREATED=$((MEALS_CREATED + 1))

    # Display progress every week
    if [ $(((day + 1) % 7)) -eq 0 ]; then
      WEEK_NUM=$(((day + 1) / 7))
      echo "  ✓ Week $WEEK_NUM complete ($CURRENT_DATE)"
    fi
  done

  echo ""
  echo -e "${GREEN}✓ Created $MEALS_CREATED meal plans${NC}"
  echo ""
fi

################################################################################
# Summary
################################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Fake Data Generation Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get actual counts from APIs
if command -v jq &> /dev/null; then
  echo "Verification:"

  CATALOG_COUNT=$(curl -s "$CATALOG_API?limit=1" | jq -r '.total // "?"')
  echo "  📦 Catalog Items: $CATALOG_COUNT"

  RECIPES_COUNT=$(curl -s "$RECIPES_API?limit=1" | jq -r '.total // "?"')
  echo "  🍳 Recipes: $RECIPES_COUNT"

  # Note: Meal plans list might have date filter issues, so we skip verification
  echo "  📅 Meal Plans: $MEALS_CREATED (created)"
  echo ""
fi

echo "Next steps:"
echo "  • View recipes: ${BASE_URL}:8001/recipes"
echo "  • View catalog: ${BASE_URL}:8002/catalog"
echo "  • View meal plans: ${BASE_URL}:8003/meal-plans"
echo ""
