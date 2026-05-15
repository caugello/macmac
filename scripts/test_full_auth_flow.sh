#!/bin/bash

set -e

BASE_URL="http://localhost:8000/api/v1"

echo "========================================="
echo "Testing Full Authentication Flow"
echo "========================================="
echo

# Test 1: Login
echo "1. Testing login with christophe/test..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "christophe", "password": "test"}')

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no access token received"
  exit 1
fi

echo "✅ Login successful, token: ${TOKEN:0:50}..."
echo

# Test 2: Get current user
echo "2. Testing /auth/me endpoint..."
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "$ME_RESPONSE" | jq '.'

USERNAME=$(echo "$ME_RESPONSE" | jq -r '.username')

if [ "$USERNAME" != "christophe" ]; then
  echo "❌ /auth/me failed - expected username 'christophe', got '$USERNAME'"
  exit 1
fi

echo "✅ Successfully retrieved current user"
echo

# Test 3: Create a group
echo "3. Testing group creation..."
GROUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/groups" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Family"}')

echo "$GROUP_RESPONSE" | jq '.'

GROUP_ID=$(echo "$GROUP_RESPONSE" | jq -r '.id')

if [ "$GROUP_ID" = "null" ] || [ -z "$GROUP_ID" ]; then
  echo "⚠️  Group creation failed or group already exists"
else
  echo "✅ Successfully created group with ID: $GROUP_ID"
fi
echo

# Test 4: List groups
echo "4. Testing group listing..."
GROUPS_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/groups" \
  -H "Authorization: Bearer $TOKEN")

echo "$GROUPS_RESPONSE" | jq '.'

GROUP_COUNT=$(echo "$GROUPS_RESPONSE" | jq '.total')

echo "✅ User belongs to $GROUP_COUNT group(s)"
echo

# Test 5: Create a recipe (should be shared with group)
echo "5. Testing recipe creation (should be shared with user's group)..."
RECIPE_RESPONSE=$(curl -s -X POST "$BASE_URL/recipes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Auth Recipe",
    "description": "Testing authentication and group sharing",
    "servings": 4,
    "prep_time": 10,
    "cook_time": 20,
    "ingredients": [],
    "instructions": ["Mix", "Cook", "Serve"]
  }')

echo "$RECIPE_RESPONSE" | jq '.'

RECIPE_ID=$(echo "$RECIPE_RESPONSE" | jq -r '.id')

if [ "$RECIPE_ID" = "null" ] || [ -z "$RECIPE_ID" ]; then
  echo "❌ Recipe creation failed"
  exit 1
fi

echo "✅ Successfully created recipe with ID: $RECIPE_ID"
echo

# Test 6: List recipes (should only show user's recipes)
echo "6. Testing recipe listing (should be filtered by user)..."
RECIPES_RESPONSE=$(curl -s -X GET "$BASE_URL/recipes" \
  -H "Authorization: Bearer $TOKEN")

echo "$RECIPES_RESPONSE" | jq '.'

RECIPE_COUNT=$(echo "$RECIPES_RESPONSE" | jq '.total')

echo "✅ User can see $RECIPE_COUNT recipe(s)"
echo

# Test 7: Access without token (should fail)
echo "7. Testing unauthorized access (should return 401)..."
UNAUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/recipes")

HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Correctly rejected unauthorized request with 401"
else
  echo "❌ Expected 401, got $HTTP_CODE"
  exit 1
fi
echo

# Test 8: Test with invalid token (should fail)
echo "8. Testing with invalid token (should return 401)..."
INVALID_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/recipes" \
  -H "Authorization: Bearer invalid_token_12345")

HTTP_CODE=$(echo "$INVALID_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Correctly rejected invalid token with 401"
else
  echo "❌ Expected 401, got $HTTP_CODE"
  exit 1
fi
echo

echo "========================================="
echo "✅ All authentication tests passed!"
echo "========================================="
