#!/usr/bin/env bash
set -e

API="http://localhost:8000/api/v1/recipes"

create() {
  TITLE="$1"; DATA="$2"

  echo "🍽 Creating: $TITLE"

  RESPONSE=$(curl -s -o /tmp/res.json -w "%{http_code}" -X POST "$API" \
      -H "Content-Type: application/json" \
      --data "$DATA")

  if [[ "$RESPONSE" == "200" || "$RESPONSE" == "201" ]]; then
      ID=$(jq -r '.id' < /tmp/res.json)
      echo "   ✔ Success → ID=$ID"
      IDs+=("$ID")
  else
      echo "   ❌ Failed ($RESPONSE)"
      cat /tmp/res.json
  fi
  echo
}

IDs=()

# ------------------------------------------------------------------- #
#               REAL RECIPES — NOW WITH VALID UNITS                   #
# ------------------------------------------------------------------- #

create "Spaghetti Carbonara" '{
  "title":"Spaghetti Carbonara",
  "ingredients":[
    {"name":"spaghetti","qty":400,"unit":"g"},
    {"name":"guanciale","qty":150,"unit":"g"},
    {"name":"egg yolk","qty":4,"unit":"pc"},
    {"name":"pecorino romano","qty":80,"unit":"g"},
    {"name":"black pepper","qty":1,"unit":"tsp"}
  ],
  "steps":["boil pasta","cook guanciale","mix with yolks + cheese"]
}'

create "Butter Chicken" '{
  "title":"Butter Chicken",
  "ingredients":[
    {"name":"chicken thigh","qty":600,"unit":"g"},
    {"name":"yogurt","qty":150,"unit":"ml"},
    {"name":"garam masala","qty":2,"unit":"tsp"},
    {"name":"tomato puree","qty":300,"unit":"ml"},
    {"name":"cream","qty":200,"unit":"ml"}
  ],
  "steps":["marinate chicken","cook sauce","combine and simmer"]
}'

create "Pesto Genovese" '{
  "title":"Pesto Genovese",
  "ingredients":[
    {"name":"basil leaves","qty":60,"unit":"g"},
    {"name":"pine nuts","qty":30,"unit":"g"},
    {"name":"parmesan","qty":50,"unit":"g"},
    {"name":"olive oil","qty":80,"unit":"ml"},
    {"name":"garlic","qty":1,"unit":"pc"}
  ],
  "steps":["grind basil + pine nuts","add cheese + oil","season to taste"]
}'

create "Chili Con Carne" '{
  "title":"Chili Con Carne",
  "ingredients":[
    {"name":"ground beef","qty":500,"unit":"g"},
    {"name":"kidney beans","qty":400,"unit":"g"},
    {"name":"tomatoes","qty":400,"unit":"ml"},
    {"name":"onion","qty":1,"unit":"pc"},
    {"name":"chili powder","qty":2,"unit":"tsp"}
  ],
  "steps":["brown beef","simmer 45m","add beans"]
}'

create "Pad Thai" '{
  "title":"Pad Thai",
  "ingredients":[
    {"name":"rice noodles","qty":200,"unit":"g"},
    {"name":"shrimp","qty":200,"unit":"g"},
    {"name":"bean sprouts","qty":150,"unit":"g"},
    {"name":"eggs","qty":2,"unit":"pc"},
    {"name":"tamarind paste","qty":2,"unit":"tbsp"}
  ],
  "steps":["soak noodles","stir fry","add sauce + toppings"]
}'

echo "===================================================="
echo "🟡 UPDATE ONE (${IDs[2]})"
curl -s -X PATCH "$API/${IDs[2]}" -H "Content-Type: application/json" \
    -d '{"description":"Updated with lemon zest"}' | jq

echo "===================================================="
echo "🔍 GET ONE (${IDs[2]})"
curl -s "$API/${IDs[2]}" | jq

echo "===================================================="
echo "❌ DELETE ONE (${IDs[4]})"
curl -s -X DELETE "$API/${IDs[4]}" | jq || echo "Deleted"

echo "===================================================="
echo "📋 FINAL LIST"
curl -s "$API?limit=50" | jq

