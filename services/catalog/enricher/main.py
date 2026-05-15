import asyncio
import json
import os
import re
import time
from typing import Any

from openai import AsyncOpenAI
from playwright.async_api import async_playwright

from services.catalog.enricher.db import create_catalog_item
from services.catalog.main import catalog_db
from services.config import get_config, get_config_for_service, get_config_for_service_dependency
from services.shared.constant import CATALOG_PROCESS_ENTITY_QUEUE
from services.shared.lib.db import get_db
from services.shared.lib.messaging_bus import MessagingBus
from services.shared.schemas.catalog import CatalogItemCreate

# Load configuration
config = get_config()
catalog_config = get_config_for_service("catalog")

# API key from environment (SECURITY REQUIREMENT)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Enricher configuration from config.yaml
OPENAI_MODEL = catalog_config.enricher.openai_model if catalog_config.enricher else "gpt-4o-mini"
BATCH_SIZE = catalog_config.enricher.batch_size if catalog_config.enricher else 5
DELAY_BETWEEN_REQUESTS = (
    catalog_config.enricher.delay_between_requests if catalog_config.enricher else 5
)
PAGE_TIMEOUT = catalog_config.enricher.page_timeout if catalog_config.enricher else 15000
BATCH_PAUSE = catalog_config.enricher.batch_pause if catalog_config.enricher else 60

# Global counters for rate limiting
items_processed = 0
batch_start_time = time.time()

# Regex for extracting quantity from URL
# Matches patterns like: 280g, 1kg, 500ml, 1.5l, 375g
URL_QTY_PATTERN = re.compile(r"-(\d+(?:[.,]\d+)?)(g|kg|ml|l|cl)(?:-|$)", re.IGNORECASE)


def normalize_unit(unit: str | None) -> str | None:
    """
    Normalize unit strings to valid UnitEnum values.
    Maps common variations to schema-compliant units.
    """
    if not unit:
        return None

    unit_lower = unit.lower().strip()

    # Direct mapping for variations
    unit_map = {
        # Pieces
        "piece": "pc",
        "pieces": "pc",
        "pcs": "pc",
        "stuks": "pc",
        "stuk": "pc",
        "st": "pc",
        # Weight
        "gram": "g",
        "grams": "g",
        "gr": "g",
        "kilo": "kg",
        "kilogram": "kg",
        # Volume
        "milliliter": "ml",
        "milliliters": "ml",
        "liter": "l",
        "liters": "l",
        "centiliter": "ml",  # Will be converted
        "cl": "ml",
        # Spoons
        "teaspoon": "tsp",
        "teaspoons": "tsp",
        "tablespoon": "tbsp",
        "tablespoons": "tbsp",
    }

    # Check if it's already valid
    valid_units = {"g", "kg", "ml", "l", "tsp", "tbsp", "pc", "pinch", "dash"}
    if unit_lower in valid_units:
        return unit_lower

    # Try mapping
    return unit_map.get(unit_lower)


def extract_quantity_from_url(url: str) -> tuple[float | None, str | None]:
    """
    Extract quantity and unit from product URL.
    Examples:
      - .../boni-zonnebloempitten-280g → (280.0, 'g')
      - .../pasta-500g → (500.0, 'g')
      - .../milk-1l → (1.0, 'l')
      - .../juice-1.5l → (1.5, 'l')
    """
    match = URL_QTY_PATTERN.search(url)
    if not match:
        return None, None

    qty_str = match.group(1).replace(",", ".")
    unit = match.group(2).lower()

    try:
        qty = float(qty_str)
    except ValueError:
        return None, None

    # Handle centiliters conversion before normalization
    if unit == "cl":
        qty = qty * 10
        unit = "ml"

    # Normalize unit to schema-compliant value
    normalized = normalize_unit(unit)
    if normalized:
        return qty, normalized

    return None, None


async def crawl_product_page(url: str) -> tuple[str | None, str | None, float | None, str | None]:
    """
    Crawl product page using Playwright with anti-detection measures.
    Mimics real browser behavior to bypass WAF/bot detection.
    Returns (html_content, final_url, extracted_price, info_link_url) or (None, None, None, None) if failed.
    """
    from urllib.parse import unquote

    # Decode URL to handle special characters properly
    url = unquote(url)

    try:
        async with async_playwright() as p:
            # Try webkit (Safari) - often less detected than Chromium
            browser = await p.webkit.launch(headless=True)

            # Create context with realistic Safari fingerprint
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                locale="fr-BE",
                timezone_id="Europe/Brussels",
                color_scheme="light",
                extra_http_headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "fr-BE,fr;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                },
            )

            page = await context.new_page()

            # Simple stealth script for Safari/webkit
            await page.add_init_script(
                """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """
            )

            # Step 1: Visit homepage first to establish session and get cookies
            base_url = "https://www.collectandgo.be/fr"
            print(f"  → Visiting homepage first")

            try:
                home_response = await page.goto(base_url, timeout=15000, wait_until="networkidle")
                if home_response and home_response.status == 200:
                    print(f"  → Homepage loaded successfully")
                    # Wait longer like a real user browsing
                    await asyncio.sleep(2.0)

                    # Scroll down homepage slowly
                    await page.evaluate("window.scrollTo({top: 400, behavior: 'smooth'})")
                    await asyncio.sleep(1.0)

                    await page.evaluate("window.scrollTo({top: 800, behavior: 'smooth'})")
                    await asyncio.sleep(1.0)
                else:
                    print(
                        f"  → Homepage returned status {home_response.status if home_response else 'None'}"
                    )
            except Exception as e:
                print(f"  → Warning: Could not load homepage: {e}")

            # Step 2: Navigate to product page (like clicking a link)
            # Wait a bit more before navigating
            await asyncio.sleep(1.5)

            print(f"  → Navigating to product page")
            try:
                response = await page.goto(
                    url, timeout=15000, wait_until="domcontentloaded", referer=base_url
                )
            except Exception as e:
                print(f"  → Navigation error: {e}")
                await browser.close()
                return None, None, None, None

            if not response:
                print(f"  → No response from {url}")
                await browser.close()
                return None, None, None, None

            # Check response status
            if response.status >= 400:
                print(f"  → HTTP {response.status} from {url}")
                print(f"  → Response headers: {response.headers}")
                await browser.close()
                return None, None, None, None

            # Get final URL after redirects
            final_url = page.url
            if final_url != url:
                print(f"  → Redirected to: {final_url}")

            # Mimic human behavior: random scroll
            await asyncio.sleep(
                0.5 + (asyncio.get_event_loop().time() % 1)
            )  # Random delay 0.5-1.5s

            # Scroll down slowly like a human
            await page.evaluate(
                """
                window.scrollTo({
                    top: document.body.scrollHeight / 3,
                    behavior: 'smooth'
                });
            """
            )
            await asyncio.sleep(0.3)

            # Wait for content to load
            await page.wait_for_timeout(1500)

            # Extract price from the main product page
            extracted_price = None
            try:
                # Wait for price element with specific selector
                await page.wait_for_selector(
                    'span.price-per-unit, [class*="price"]', timeout=3000, state="visible"
                )

                # Try to extract price from specific selector first
                price_element = await page.query_selector("span.price-per-unit")
                if price_element:
                    price_text = await price_element.inner_text()
                    # Clean price text: remove €, newlines, spaces, /pce, /kg, etc.
                    # Handle formats like "2.\n99\n/pce" or "€1,89/kg"
                    price_text = (
                        price_text.strip()
                        .replace("\n", "")
                        .replace("\r", "")
                        .replace("€", "")
                        .replace(" ", "")
                        .replace(",", ".")
                    )

                    # Remove unit suffixes like /pce, /kg, /l, etc.
                    import re

                    price_text = re.sub(r"/[a-z]+$", "", price_text)

                    try:
                        extracted_price = float(price_text)
                        print(f"  → Extracted price: €{extracted_price:.2f}")
                    except ValueError:
                        print(f"  → Could not parse price: {repr(price_text)}")
            except Exception as e:
                print(f"  → Could not extract price: {e}")

            # Scroll to bottom to trigger lazy loading
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(0.5)

            # Get main product page HTML
            html = await page.content()

            # Try to find the "plus d'infos" link while page is still open
            info_link_url = None
            try:
                info_link = await page.query_selector(
                    'a:has-text("plus d\'infos"), a:has-text("Plus d\'infos"), a:has-text("meer info"), a:has-text("Meer info")'
                )
                if info_link:
                    info_href = await info_link.get_attribute("href")
                    if info_href:
                        # Make absolute URL if relative
                        if info_href.startswith("/"):
                            base = final_url.split("/")[0] + "//" + final_url.split("/")[2]
                            info_link_url = base + info_href
                        elif not info_href.startswith("http"):
                            info_link_url = final_url.rsplit("/", 1)[0] + "/" + info_href
                        else:
                            info_link_url = info_href
                        print(f"  → Found product info link: {info_link_url}")
            except Exception as e:
                print(f"  → Could not find product info link: {e}")

            await browser.close()
            return html, final_url, extracted_price, info_link_url

    except Exception as e:
        print(f"  → Error crawling {url}: {e}")
        return None, None, None


async def crawl_nutrition_page(info_url: str, main_page_url: str) -> tuple[str | None, str | None]:
    """
    Crawl the detailed nutrition info page for a food product.
    Returns (detailed_html, nutrition_table_text) or (None, None) if failed.
    """
    from urllib.parse import unquote

    if not info_url:
        print(f"  → No product info link provided")
        return None, None

    info_url = unquote(info_url)

    print(f"  → Crawling nutrition page: {info_url}")

    try:
        async with async_playwright() as p:
            browser = await p.webkit.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                locale="fr-BE",
                timezone_id="Europe/Brussels",
            )

            page = await context.new_page()
            await page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
            )

            # Navigate to nutrition page
            response = await page.goto(
                info_url, timeout=PAGE_TIMEOUT, wait_until="domcontentloaded", referer=main_page_url
            )

            if not response or response.status >= 400:
                print(
                    f"  → Failed to load nutrition page (status {response.status if response else 'None'})"
                )
                await browser.close()
                return None, None

            # Wait and scroll to load nutrition table
            await page.wait_for_timeout(2000)
            await page.evaluate(
                "window.scrollTo({top: document.body.scrollHeight / 2, behavior: 'smooth'})"
            )
            await asyncio.sleep(0.8)
            await page.evaluate(
                "window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})"
            )
            await asyncio.sleep(1.0)

            # Extract nutrition table text
            nutrition_table_text = None
            try:
                await page.wait_for_selector("table", timeout=5000, state="visible")
                tables = await page.query_selector_all("table")
                for table in tables:
                    table_text = await table.inner_text()
                    if any(
                        keyword in table_text.lower()
                        for keyword in [
                            "valeur nutritionnelle",
                            "voedingswaarde",
                            "nutrition",
                            "energie",
                            "energy",
                            "protéine",
                            "protein",
                            "kcal",
                            "glucide",
                            "carbohydrate",
                            "lipide",
                            "fat",
                            "par 100",
                        ]
                    ):
                        nutrition_table_text = table_text
                        print(f"  → Extracted nutrition table ({len(table_text)} chars)")
                        break
            except Exception as e:
                print(f"  → Could not extract nutrition table: {e}")

            detailed_html = await page.content()
            await browser.close()
            return detailed_html, nutrition_table_text

    except Exception as e:
        print(f"  → Error crawling nutrition page: {e}")
        return None, None


def preprocess_html(html_content: str) -> str:
    """
    Extract relevant sections from HTML and remove noise.
    Focus on product info, price, and nutrition sections.
    Prioritizes extracted nutrition table if present.
    """
    from bs4 import BeautifulSoup

    # Check for extracted nutrition table at the top
    nutrition_table = ""
    if html_content.startswith("<!-- EXTRACTED NUTRITION TABLE -->"):
        parts = html_content.split("\n\n", 2)
        if len(parts) >= 3:
            nutrition_table = parts[1]  # The nutrition table text
            html_content = parts[2]  # Rest of HTML

    # Check if this is combined HTML (main page + detailed info page)
    html_parts = html_content.split("<!-- DETAILED PRODUCT INFO PAGE -->")

    processed_parts = []
    for part_html in html_parts:
        soup = BeautifulSoup(part_html, "html.parser")

        # Remove script and style elements
        for script in soup(["script", "style", "noscript"]):
            script.decompose()

        # Try to find product-specific sections
        relevant_sections = []

        # Look for product details, price, nutrition sections
        for selector in [
            '[class*="product"]',
            '[class*="Product"]',
            '[class*="price"]',
            '[class*="Price"]',
            '[class*="nutrition"]',
            '[class*="Nutrition"]',
            '[class*="voedingswaarde"]',
            '[class*="Voedingswaarde"]',
            '[class*="valeur"]',
            '[class*="Valeur"]',
            '[class*="detail"]',
            '[class*="Detail"]',
            '[class*="info"]',
            '[class*="Info"]',
            "main",
            "article",
            "table",
        ]:
            elements = soup.select(selector)
            for elem in elements:
                text = elem.get_text(separator=" ", strip=True)
                if len(text) > 20:  # Skip empty or tiny sections
                    relevant_sections.append(text)

        # Also look for text containing nutrition keywords
        for keyword in ["valeurs nutritionnelles", "voedingswaarde", "per 100", "par 100"]:
            for elem in soup.find_all(string=lambda text: text and keyword.lower() in text.lower()):
                parent = elem.find_parent(["div", "section", "table", "article"])
                if parent:
                    text = parent.get_text(separator=" ", strip=True)
                    if len(text) > 20 and text not in relevant_sections:
                        relevant_sections.append(text)

        if relevant_sections:
            combined = " ".join(relevant_sections[:15])  # Top 15 sections
            processed_parts.append(combined)
        else:
            # Fallback: clean full text
            text = soup.get_text(separator=" ", strip=True)
            processed_parts.append(text[:50000])

    # Join both parts with delimiter
    result = "\n\n=== DETAILED PRODUCT INFO PAGE ===\n\n".join(processed_parts)

    # Prepend nutrition table if we extracted it
    if nutrition_table:
        result = f"=== NUTRITION TABLE (EXTRACTED) ===\n{nutrition_table}\n\n{result}"

    # Limit total to ~150k chars to allow room for both pages
    return result[:150000]


async def extract_with_llm(
    raw_name: str,
    product_url: str,
    html_content: str,
    url_qty: float | None = None,
    url_unit: str | None = None,
    extracted_price: float | None = None,
) -> dict[str, Any]:
    """
    Use OpenAI to extract structured product data from HTML.
    Returns a dict with extracted fields.
    """
    if not OPENAI_API_KEY:
        print("  → WARNING: OPENAI_API_KEY not set, skipping LLM extraction")
        return {}

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    # Preprocess HTML to focus on relevant sections
    processed_html = preprocess_html(html_content) if html_content else ""

    # Mention extracted data in the prompt so LLM doesn't waste tokens on it
    extracted_hint = ""
    if url_qty and url_unit:
        extracted_hint += f"\n- Quantity: {url_qty} {url_unit}"
    if extracted_price:
        extracted_hint += f"\n- Price: €{extracted_price:.2f}"

    if extracted_hint:
        extracted_hint = (
            f"\n\nPRE-EXTRACTED DATA (use this data, already confirmed):{extracted_hint}"
        )

    system_prompt = f"""You are a product data extraction assistant for Belgian grocery websites (Collect&Go, Delhaize, Carrefour).

Extract structured product information and return a JSON object with these fields:

{{
  "brand": "string or null - Brand name (e.g., BONI, Delhaize, Soubry, Lu, Lotus, Coca-Cola)",
  "canonical_name": "string or null - Clean product name without brand, quantity, or promotional text",
  "category": "string or null - Use ONE of these categories:
    - Pasta & Rice
    - Bread & Bakery
    - Dairy & Eggs
    - Meat & Poultry
    - Fish & Seafood
    - Fruits & Vegetables
    - Frozen Foods
    - Snacks & Chips
    - Sweets & Chocolate
    - Beverages
    - Coffee & Tea
    - Sauces & Condiments
    - Oils & Vinegars
    - Canned & Jarred
    - Breakfast & Cereals
    - Baby Food
    - Pet Food
    - Household & Cleaning
    - Personal Care",
  "net_quantity_value": "number or null - Numeric quantity (e.g., 375.0)",
  "net_quantity_unit": "string or null - MUST BE EXACTLY ONE OF: g, kg, ml, l, tsp, tbsp, pc, pinch, dash",
  "price": "number or null - Current price as decimal (e.g., 1.89, 0.99, 12.50)",
  "currency": "string - Always EUR for Belgian sites",
  "nutrition": {{
    "energy_kcal": "number or null - Energy in kcal per 100g/100ml",
    "protein_g": "number or null - Protein in grams per 100g/100ml",
    "carbs_g": "number or null - Carbohydrates in grams per 100g/100ml",
    "sugars_g": "number or null - Sugars in grams per 100g/100ml",
    "fat_g": "number or null - Fat in grams per 100g/100ml",
    "saturated_fat_g": "number or null - Saturated fat in grams per 100g/100ml",
    "fiber_g": "number or null - Fiber in grams per 100g/100ml",
    "salt_g": "number or null - Salt in grams per 100g/100ml",
    "serving_size": "string or null - Usually '100g' or '100ml'"
  }} or null if no nutrition table found,
  "is_food": "boolean - true for edible products, false for household/pet/personal care"
}}

EXTRACTION RULES:
1. PRICE: If "PRE-EXTRACTED DATA" section shows a price, USE THAT VALUE - it was extracted directly from the DOM.
   Otherwise, look for price elements in HTML (often in spans/divs with 'price' class). Belgian sites show prices like "€1,89" or "1.89€"
2. NUTRITION:
   - If you see "=== NUTRITION TABLE (EXTRACTED) ===" at the top, use that data first - it's the clean nutrition table
   - The table is under "Valeurs nutritionelles" (French) or "Voedingswaarde" (Dutch) header
   - Look for "Par 100 g" or "Per 100 g" values
   - Common row labels: Energie/Energy (kcal), Protéines/Protein (g), Glucides/Carbohydrates (g), Sucres/Sugars (g),
     Lipides/Fat (g), Acides gras saturés/Saturated fat (g), Fibres/Fiber (g), Sel/Salt (g)
   - Extract ONLY if you find real numeric values - do NOT estimate or invent values
3. BRAND: Extract from product name or look for brand mentions
4. CANONICAL NAME: Remove brand, quantity, promotional words (BIO, PROMO, NEW, etc.)
5. CATEGORY: Choose the BEST FIT category from the list above - be specific but not overly narrow
6. QUANTITY: Look for weight/volume info (e.g., "375g", "1L", "12 stuks"). Use URL data if not in HTML
7. IS_FOOD: false only for cleaning products, pet food, diapers, cosmetics, etc.

FEW-SHOT EXAMPLES:

Example 1 - Raw: "SOUBRY Pasta Giglio Rustica 375g"
{{
  "brand": "SOUBRY",
  "canonical_name": "Pasta Giglio Rustica",
  "category": "Pasta & Rice",
  "net_quantity_value": 375.0,
  "net_quantity_unit": "g",
  "price": 0.90,
  "currency": "EUR",
  "nutrition": {{"energy_kcal": 350, "protein_g": 12.5, "carbs_g": 70.0, "sugars_g": 2.0, "fat_g": 2.5, "saturated_fat_g": 0.5, "fiber_g": 3.0, "salt_g": 0.01, "serving_size": "100g"}},
  "is_food": true
}}

Example 2 - Raw: "BONI Zonnebloempitten 280g"
{{
  "brand": "BONI",
  "canonical_name": "Zonnebloempitten",
  "category": "Snacks & Chips",
  "net_quantity_value": 280.0,
  "net_quantity_unit": "g",
  "price": 1.49,
  "currency": "EUR",
  "nutrition": {{"energy_kcal": 584, "protein_g": 21.0, "carbs_g": 20.0, "sugars_g": 2.7, "fat_g": 51.0, "saturated_fat_g": 5.5, "fiber_g": 8.6, "salt_g": 0.01, "serving_size": "100g"}},
  "is_food": true
}}

Example 3 - Raw: "Coca-Cola Regular 12x33cl"
{{
  "brand": "Coca-Cola",
  "canonical_name": "Regular",
  "category": "Beverages",
  "net_quantity_value": 330.0,
  "net_quantity_unit": "ml",
  "price": 5.99,
  "currency": "EUR",
  "nutrition": null,
  "is_food": true
}}

CRITICAL:
- DO NOT invent data - use null if not clearly present
- Extract nutrition ONLY from actual nutrition tables (Voedingswaarde/Nutrition), not from product descriptions
- Convert comma decimals to period (1,89 → 1.89)
- For pieces/stuks, use unit "pc" not "pieces"
- Return valid JSON only{extracted_hint}"""

    user_prompt = f"""Product: {raw_name}
URL: {product_url}

Page Content:
{processed_html}

Extract product data as JSON following the rules and examples above."""

    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,  # Slightly higher for better context understanding
            response_format={"type": "json_object"},
        )

        extracted_data = json.loads(response.choices[0].message.content)

        # Validate and sanitize extracted data types
        if extracted_data.get("price") is not None:
            try:
                extracted_data["price"] = float(extracted_data["price"])
            except (ValueError, TypeError):
                print(f"  → Invalid price value: {extracted_data.get('price')}")
                extracted_data["price"] = None

        if extracted_data.get("net_quantity_value") is not None:
            try:
                extracted_data["net_quantity_value"] = float(extracted_data["net_quantity_value"])
            except (ValueError, TypeError):
                print(f"  → Invalid quantity value: {extracted_data.get('net_quantity_value')}")
                extracted_data["net_quantity_value"] = None

        # Normalize unit to schema-compliant value
        if extracted_data.get("net_quantity_unit"):
            normalized_unit = normalize_unit(extracted_data["net_quantity_unit"])
            if normalized_unit:
                extracted_data["net_quantity_unit"] = normalized_unit
            else:
                print(f"  → Invalid unit '{extracted_data['net_quantity_unit']}', setting to null")
                extracted_data["net_quantity_unit"] = None

        # Validate nutrition data types if present
        if extracted_data.get("nutrition") and isinstance(extracted_data["nutrition"], dict):
            nutrition = extracted_data["nutrition"]
            for key in [
                "energy_kcal",
                "protein_g",
                "carbs_g",
                "sugars_g",
                "fat_g",
                "saturated_fat_g",
                "fiber_g",
                "salt_g",
            ]:
                if nutrition.get(key) is not None:
                    try:
                        nutrition[key] = float(nutrition[key])
                    except (ValueError, TypeError):
                        nutrition[key] = None

            # Log extracted nutrition values
            print(f"  → LLM extracted nutrition:")
            for key, value in nutrition.items():
                if value is not None:
                    print(f"     • {key}: {value}")
        else:
            print(f"  → No nutrition data extracted by LLM")

        return extracted_data

    except json.JSONDecodeError as e:
        print(f"  → JSON decode error: {e}")
        print(f"  → Raw response: {response.choices[0].message.content[:200]}")
        return {}
    except Exception as e:
        print(f"  → Error with LLM extraction: {e}")
        return {}


async def enrich_catalog_item(
    vendor_name: str,
    raw_name: str,
    product_url: str,
) -> CatalogItemCreate:
    """
    Enrich catalog item using Playwright + OpenAI LLM.
    Implements rate limiting to avoid WAF blocks.
    """
    global items_processed, batch_start_time

    # Rate limiting: pause between batches
    items_processed += 1
    if items_processed % BATCH_SIZE == 0:
        elapsed = time.time() - batch_start_time
        if elapsed < BATCH_PAUSE:
            sleep_time = BATCH_PAUSE - elapsed
            print(f"Batch {items_processed // BATCH_SIZE} complete. Pausing {sleep_time:.1f}s...")
            await asyncio.sleep(sleep_time)
        batch_start_time = time.time()

    # Delay between individual requests
    if items_processed > 1:
        await asyncio.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"[{items_processed}] Enriching: {raw_name}")

    # Step 1: Extract quantity/unit from URL (fast, no API calls)
    url_qty, url_unit = extract_quantity_from_url(product_url)
    if url_qty:
        print(f"  → URL extraction: {url_qty}{url_unit}")

    # Step 2: Crawl main product page with Playwright
    html_content, final_url, extracted_price, info_link_url = await crawl_product_page(product_url)

    if not html_content:
        print(f"  → Failed to crawl, using URL extraction only")
        # Return minimal data
        return CatalogItemCreate(
            vendor_name=vendor_name,
            raw_name=raw_name,
            product_url=product_url,
            is_food=True,
            net_quantity_value=url_qty,
            net_quantity_unit=url_unit,
            price=extracted_price,
            currency="EUR",
        )

    # If redirected, try extracting quantity from final URL too
    if final_url and final_url != product_url:
        final_qty, final_unit = extract_quantity_from_url(final_url)
        if final_qty and not url_qty:
            url_qty, url_unit = final_qty, final_unit
            print(f"  → Final URL extraction: {url_qty}{url_unit}")

    # Step 3: Initial LLM extraction to determine if it's food
    print(f"  → Determining if product is food...")
    extracted_data = await extract_with_llm(
        raw_name, final_url or product_url, html_content, url_qty, url_unit, extracted_price
    )
    is_food = extracted_data.get("is_food", True)

    # Step 4: If it's food, crawl the nutrition info page
    if is_food:
        print(f"  → Product is food, crawling nutrition page...")
        detailed_html, nutrition_table_text = await crawl_nutrition_page(
            info_link_url, final_url or product_url
        )

        if detailed_html:
            # Combine main HTML with detailed info
            combined_html = (
                html_content + "\n\n<!-- DETAILED PRODUCT INFO PAGE -->\n" + detailed_html
            )

            # Add nutrition table prominently if extracted
            if nutrition_table_text:
                combined_html = (
                    f"<!-- EXTRACTED NUTRITION TABLE -->\n{nutrition_table_text}\n\n"
                    + combined_html
                )
                print(f"  → Added nutrition table to HTML")

            # Re-extract with combined HTML for nutrition data
            print(f"  → Extracting nutrition data with LLM...")
            extracted_data = await extract_with_llm(
                raw_name,
                final_url or product_url,
                combined_html,
                url_qty,
                url_unit,
                extracted_price,
            )
        else:
            print(f"  → Could not fetch nutrition page, using main page data")
    else:
        print(f"  → Product is not food, skipping nutrition crawl")

    # Step 5: Normalize extracted data (LLM data takes priority, URL data as fallback)
    canonical_name = extracted_data.get("canonical_name") or raw_name
    brand = extracted_data.get("brand")
    category = extracted_data.get("category")

    # Use LLM-extracted quantity if available, otherwise fall back to URL extraction
    net_quantity_value = extracted_data.get("net_quantity_value") or url_qty
    net_quantity_unit = extracted_data.get("net_quantity_unit") or url_unit

    # Use extracted price if LLM didn't find one
    price = extracted_data.get("price") or extracted_price
    currency = extracted_data.get("currency", "EUR")
    nutrition = extracted_data.get("nutrition")
    # is_food already determined above in step 3

    # Log what we're about to save
    print(f"  → Preparing to save:")
    print(f"     • Brand: {brand}")
    print(f"     • Category: {category}")
    print(f"     • Is food: {is_food}")
    print(f"     • Price: {price}")
    if nutrition:
        print(f"     • Nutrition data: {len(nutrition)} fields")
        print(f"     • Nutrition JSON: {json.dumps(nutrition, indent=2)}")
    else:
        print(f"     • Nutrition data: None")

    # Normalize the canonical name for search
    normalized_name = None
    if canonical_name:
        normalized_name = (
            canonical_name.lower().replace(" ", "_").replace("-", "_").replace("'", "").strip("_")
        )

    # Use final URL after redirect (from crawl_product_page)
    final_product_url = final_url if final_url else product_url

    return CatalogItemCreate(
        vendor_name=vendor_name,
        raw_name=raw_name,
        product_url=final_product_url,
        canonical_name=canonical_name if canonical_name != raw_name else None,
        normalized_name=normalized_name,
        brand=brand,
        net_quantity_value=net_quantity_value,
        net_quantity_unit=net_quantity_unit,
        is_food=is_food,
        price=price,
        currency=currency,
        category=category,
        nutrition=nutrition,
    )


def write_to_db(payload: dict, ch):
    """
    Callback for RabbitMQ message processing.
    Enriches the item and writes to database.
    Only processes French (/fr/) URLs to avoid duplicates.
    """
    import traceback

    # Skip Dutch URLs - only process French to avoid duplicates
    product_url = payload.get("product_url", "")
    if "/nl/" in product_url:
        print(f"⊘ Skipping Dutch URL: {payload.get('raw_name', 'unknown')}")
        return

    # Only process French URLs
    if "/fr/" not in product_url:
        print(f"⊘ Skipping non-French URL: {payload.get('raw_name', 'unknown')}")
        return

    # Run async enrichment in event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        enriched_item = loop.run_until_complete(
            enrich_catalog_item(
                raw_name=payload["raw_name"],
                vendor_name=payload["vendor_name"],
                product_url=product_url,
            )
        )

        # Skip non-food items - don't store them in the catalog
        if enriched_item and not enriched_item.is_food:
            print(
                f"⊘ Skipping non-food item: {enriched_item.canonical_name or enriched_item.raw_name}"
            )
            print(f"  → Category: {enriched_item.category}")
            return

        with get_db(catalog_db) as db:
            if enriched_item:
                item = create_catalog_item(enriched_item, db)

                # Safe formatting with type checking
                if item.net_quantity_value and item.net_quantity_unit:
                    # Handle enum or string unit
                    unit_str = (
                        item.net_quantity_unit.value
                        if hasattr(item.net_quantity_unit, "value")
                        else item.net_quantity_unit
                    )
                    qty_str = f"{item.net_quantity_value}{unit_str}"
                else:
                    qty_str = "N/A"

                # Handle price carefully - ensure it's a number
                if item.price is not None:
                    try:
                        price_str = f"€{float(item.price):.2f}"
                    except (ValueError, TypeError):
                        price_str = f"€{item.price} (invalid)"
                else:
                    price_str = "N/A"

                category_str = item.category or "N/A"
                nutrition_str = "✓" if item.nutrition else "✗"

                print(f"✓ Saved: {item.canonical_name or item.raw_name}")
                print(f"  → {qty_str} | {price_str} | {category_str} | Nutrition: {nutrition_str}")

                # Detailed nutrition logging
                if item.nutrition:
                    print(f"  → Nutrition values saved to DB:")
                    nutrition_json = (
                        item.nutrition
                        if isinstance(item.nutrition, dict)
                        else json.loads(item.nutrition)
                    )
                    for key, value in nutrition_json.items():
                        if value is not None:
                            print(f"     • {key}: {value}")
                else:
                    print(f"  → WARNING: No nutrition data was saved to database!")

    except json.JSONDecodeError as e:
        print(f"✗ JSON error for {payload.get('raw_name', 'unknown')}: {e}")
    except ValueError as e:
        print(f"✗ Value error for {payload.get('raw_name', 'unknown')}: {e}")
    except Exception as e:
        print(f"✗ Error processing {payload.get('raw_name', 'unknown')}: {type(e).__name__}: {e}")
        print(traceback.format_exc())
    finally:
        loop.close()


if __name__ == "__main__":
    if not OPENAI_API_KEY:
        print("ERROR: OPENAI_API_KEY environment variable not set!")
        print("Set it with: export OPENAI_API_KEY='sk-...'")
        exit(1)

    print(f"Starting enricher with OpenAI model: {OPENAI_MODEL}")
    print(
        f"Rate limits: {BATCH_SIZE} items/batch, {DELAY_BETWEEN_REQUESTS}s delay, {BATCH_PAUSE}s pause"
    )

    config = get_config_for_service_dependency("catalog", "crawler")
    bus = MessagingBus(config.url)
    bus.declare_queue(CATALOG_PROCESS_ENTITY_QUEUE)
    bus.consume(CATALOG_PROCESS_ENTITY_QUEUE, write_to_db)
    bus.start()
