#!/bin/bash

################################################################################
# MacMac Fake Data Cleaner
#
# Clears all test data from the MacMac databases.
# WARNING: This will delete ALL data, not just fake data!
#
# Usage:
#   ./scripts/clear_fake_data.sh [OPTIONS]
#
# Options:
#   --force           Skip confirmation prompt
#   --base-url URL    Base URL for API (default: http://localhost)
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BASE_URL="http://localhost"
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    -h|--help)
      head -n 15 "$0" | tail -n 13
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠️  WARNING: Data Deletion${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "This will DELETE ALL data from:"
echo "  • Meal Plans database (all meal schedules)"
echo "  • Recipes database (all recipes)"
echo "  • Catalog database (all grocery items)"
echo ""
echo "Base URL: ${BASE_URL}"
echo ""

if [ "$FORCE" = false ]; then
  read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
  echo ""
  if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
  fi
fi

echo -e "${YELLOW}Clearing databases...${NC}"
echo ""

################################################################################
# Clear via SQL (fastest method)
################################################################################

echo "🗑️  Clearing meal plans..."
PGPASSWORD=dbpass psql -h 0.0.0.0 -p 5434 -U dbuser -d meal_plans -c "TRUNCATE TABLE meal_plans CASCADE;" 2>&1 | grep -v "TRUNCATE TABLE" || true
echo "  ✓ Meal plans cleared"

echo "🗑️  Clearing recipes..."
PGPASSWORD=dbpass psql -h 0.0.0.0 -p 5432 -U dbuser -d recipes -c "TRUNCATE TABLE recipes, recipe_ingredients CASCADE;" 2>&1 | grep -v "TRUNCATE TABLE" || true
echo "  ✓ Recipes cleared"

echo "🗑️  Clearing catalog..."
PGPASSWORD=dbpass psql -h 0.0.0.0 -p 5433 -U dbuser -d catalog -c "TRUNCATE TABLE catalog_items CASCADE;" 2>&1 | grep -v "TRUNCATE TABLE" || true
echo "  ✓ Catalog cleared"

# Clean up temporary ID files
rm -f /tmp/macmac_catalog_ids.txt
rm -f /tmp/macmac_recipe_ids.txt

echo ""
echo -e "${GREEN}✅ All data cleared successfully!${NC}"
echo ""
echo "Verification:"

# Check counts
CATALOG_COUNT=$(PGPASSWORD=dbpass psql -h 0.0.0.0 -p 5433 -U dbuser -d catalog -t -c "SELECT COUNT(*) FROM catalog_items;" 2>/dev/null | tr -d ' ' || echo "?")
RECIPES_COUNT=$(PGPASSWORD=dbpass psql -h 0.0.0.0 -p 5432 -U dbuser -d recipes -t -c "SELECT COUNT(*) FROM recipes;" 2>/dev/null | tr -d ' ' || echo "?")
MEALS_COUNT=$(PGPASSWORD=dbpass psql -h 0.0.0.0 -p 5434 -U dbuser -d meal_plans -t -c "SELECT COUNT(*) FROM meal_plans;" 2>/dev/null | tr -d ' ' || echo "?")

echo "  📦 Catalog Items: $CATALOG_COUNT"
echo "  🍳 Recipes: $RECIPES_COUNT"
echo "  📅 Meal Plans: $MEALS_COUNT"
echo ""

if [ "$CATALOG_COUNT" = "0" ] && [ "$RECIPES_COUNT" = "0" ] && [ "$MEALS_COUNT" = "0" ]; then
  echo -e "${GREEN}All databases are clean!${NC}"
else
  echo -e "${YELLOW}Note: Some data may remain in other tables.${NC}"
fi
echo ""
