// Mirror services/shared/schemas/generic.py
export enum UnitEnum {
  GRAM = 'g',
  KILOGRAM = 'kg',
  MILLILITER = 'ml',
  LITER = 'l',
  TEASPOON = 'tsp',
  TABLESPOON = 'tbsp',
  PIECE = 'pc',
  PINCH = 'pinch',
  DASH = 'dash',
}

// Mirror services/shared/schemas/ingredient.py
export interface IngredientCreate {
  catalog_item_id: string
  qty: number
  unit: UnitEnum
}

export interface IngredientOut {
  catalog_item_id: string
  catalog_item_name: string
  qty: number
  unit: UnitEnum
}

// Mirror services/shared/schemas/recipe.py
export enum RecipeCategoryEnum {
  BREAKFAST = 'breakfast',
  MAIN = 'main',
  DESSERT = 'dessert',
  SNACK = 'snack',
  APPETIZER = 'appetizer',
  BEVERAGE = 'beverage',
  OTHER = 'other',
}

export interface RecipeCreate {
  title: string
  description?: string
  servings?: number
  category?: RecipeCategoryEnum
  ingredients: IngredientCreate[]
  steps?: string[]
}

export interface RecipeUpdate {
  title?: string
  description?: string
  servings?: number
  // `null` explicitly clears the category back to Uncategorized; `undefined` leaves it unchanged.
  category?: RecipeCategoryEnum | null
  ingredients?: IngredientCreate[]
  steps?: string[]
}

export interface RecipeOut {
  id: string
  title: string
  normalized_title: string
  description: string | null
  servings: number | null
  category: RecipeCategoryEnum | null
  ingredients: IngredientOut[]
  steps: string[] | null
  created_at: string
  updated_at: string
}

export interface RecipeListResponse {
  total: number
  limit: number | null
  offset: number | null
  data: RecipeOut[]
}

// Mirror services/shared/schemas/catalog.py
export interface CatalogItemCreate {
  vendor_name: string
  raw_name: string
  product_url: string
  canonical_name?: string
  normalized_name?: string
  brand?: string
  net_quantity_value?: number
  net_quantity_unit?: UnitEnum
  is_food: boolean
  price?: number
  currency?: string
  category?: string
  nutrition?: NutritionData
  nutriscore?: string
  nutriscore_svg?: string
  promotion_until_date?: string
  image_url?: string
}

export interface NutritionData {
  energy_kcal?: number
  protein_g?: number
  carbs_g?: number
  sugars_g?: number
  fat_g?: number
  saturated_fat_g?: number
  fiber_g?: number
  salt_g?: number
  serving_size?: string
}

export interface CatalogItemOut {
  id: string
  vendor_name: string
  raw_name: string
  product_url: string
  canonical_name: string | null
  normalized_name: string | null
  brand: string | null
  net_quantity_value: number | null
  net_quantity_unit: UnitEnum | null
  is_food: boolean
  price: number | null
  currency: string | null
  category: string | null
  nutrition: NutritionData | null
  nutriscore: string | null
  nutriscore_svg: string | null
  promotion_until_date: string | null
  image_url: string | null
  last_enriched_at: string | null
  created_at: string
  updated_at: string
}

export interface CatalogItemListResponse {
  total: number
  limit: number | null
  offset: number | null
  data: CatalogItemOut[]
}

export interface CatalogCategoriesResponse {
  categories: string[]
}

export interface DeleteResponse {
  success: boolean
}

// ===== MEAL PLANS =====

export enum MealTypeEnum {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
}

export interface MealPlanCreate {
  date: string // ISO 8601 YYYY-MM-DD
  meal_type: MealTypeEnum
  recipe_id: string
  notes?: string
}

export interface MealPlanUpdate {
  date?: string
  meal_type?: MealTypeEnum
  recipe_id?: string
  notes?: string
}

export interface MealPlanOut {
  id: string
  date: string
  meal_type: MealTypeEnum
  recipe_id: string
  recipe_title: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MealPlanListResponse {
  total: number
  data: MealPlanOut[]
}

export interface CopyDayRequest {
  source_date: string
  target_date: string
}

export interface CopyWeekRequest {
  source_week_start: string
  target_week_start: string
}

export interface CopyResponse {
  copied_count: number
  message: string
}

export interface ShoppingListRequest {
  start_date: string
  end_date: string
}

export interface ShoppingListItem {
  catalog_item_id: string
  catalog_item_name: string
  total_qty: number
  unit: string
  price: number | null
  line_total: number | null
  category: string | null
  is_on_promotion: boolean
  promotion_until_date: string | null
  package_size: number | null
  package_unit: string | null
  packages_needed: number | null
  last_enriched_at: string | null
}

export interface ShoppingListResponse {
  date_range: { start_date: string; end_date: string }
  items_by_category: Record<string, ShoppingListItem[]>
  total_items: number
  estimated_total: number | null
}
