import { useParams, Link } from 'react-router-dom'
import { useCatalogItem } from '@/hooks/useCatalog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export const CatalogDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading, error } = useCatalogItem(id!)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12 flex items-center justify-center min-h-[400px]">
        <p className="text-on-surface-variant">Loading product...</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Product not found.</p>
        <Button
          asChild
          className="bg-primary hover:bg-primary-container text-primary-foreground font-semibold"
        >
          <Link to="/catalog">
            <Icon name="arrow_back" size={16} className="mr-2" />
            Back to Catalog
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12">
      <Button
        variant="ghost"
        asChild
        className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant mb-6"
      >
        <Link to="/catalog">
          <Icon name="arrow_back" size={16} className="mr-2" />
          Back to Catalog
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Image hero */}
        <div className="md:col-span-7 bg-surface-container-lowest rounded-lg overflow-hidden wireframe-border relative card-hover-shadow">
          <div className="w-full h-80 md:h-[480px] bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center">
            <Icon name="inventory_2" size={80} className="text-outline-variant/20" />
          </div>
          {item.nutriscore && (
            <span
              className={cn(
                'absolute top-4 right-4 px-4 py-2 rounded-full font-bold text-headline-md shadow-sm',
                {
                  'bg-nutri-a text-white': item.nutriscore.toLowerCase() === 'a',
                  'bg-nutri-b text-white': item.nutriscore.toLowerCase() === 'b',
                  'bg-nutri-c text-black': item.nutriscore.toLowerCase() === 'c',
                  'bg-nutri-d text-white': item.nutriscore.toLowerCase() === 'd',
                  'bg-nutri-e text-white': item.nutriscore.toLowerCase() === 'e',
                }
              )}
            >
              {item.nutriscore.toUpperCase()}
            </span>
          )}
        </div>

        {/* Price/actions */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            <Badge
              className={
                item.is_food ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }
            >
              {item.is_food ? 'Food' : 'Non-Food'}
            </Badge>
            {item.brand && <Badge variant="outline">{item.brand}</Badge>}
            {item.category && <Badge className="bg-muted text-foreground">{item.category}</Badge>}
          </div>
          <p className="text-on-surface-variant">{item.vendor_name}</p>
          <h1 className="text-headline-lg font-heading font-bold">
            {item.canonical_name || item.raw_name}
          </h1>
          {item.price && (
            <p className="text-headline-xl font-heading font-bold text-primary">
              &euro;{item.price.toFixed(2)}
            </p>
          )}
          {item.promotion_until_date && (
            <div className="inline-flex items-center gap-2 bg-error-container text-on-error-container px-3 py-1 rounded-full text-label-sm font-semibold w-fit">
              <Icon name="schedule" size={16} />
              Promo until {new Date(item.promotion_until_date).toLocaleDateString()}
            </div>
          )}
          {item.net_quantity_value && item.net_quantity_unit && (
            <div className="text-on-surface-variant">
              <span className="text-label-sm">Quantity</span>
              <p>
                {item.net_quantity_value} {item.net_quantity_unit}
              </p>
            </div>
          )}
          <div className="flex gap-3 mt-auto">
            <Button className="flex-1 h-12">Add to List</Button>
            <Button variant="outline" asChild className="flex-1 h-12 border-outline-variant">
              <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                View on Vendor Site <Icon name="open_in_new" size={16} className="ml-2" />
              </a>
            </Button>
          </div>
        </div>

        {/* Nutrition grid */}
        {item.nutrition && (
          <div className="md:col-span-8 bg-surface-container-low rounded-lg wireframe-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="nutrition" size={24} className="text-primary" />
              <h2 className="text-headline-md font-heading font-semibold">
                Nutritional Information (per 100g)
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {item.nutrition.energy_kcal && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Energy
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.energy_kcal} kcal
                  </span>
                </div>
              )}
              {item.nutrition.protein_g && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Protein
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.protein_g}g
                  </span>
                </div>
              )}
              {item.nutrition.carbs_g && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Carbohydrates
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.carbs_g}g
                  </span>
                </div>
              )}
              {item.nutrition.sugars_g !== undefined && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Sugars
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.sugars_g}g
                  </span>
                </div>
              )}
              {item.nutrition.fat_g && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Fat
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.fat_g}g
                  </span>
                </div>
              )}
              {item.nutrition.saturated_fat_g !== undefined && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Saturated Fat
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.saturated_fat_g}g
                  </span>
                </div>
              )}
              {item.nutrition.fiber_g && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Fiber
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.fiber_g}g
                  </span>
                </div>
              )}
              {item.nutrition.salt_g !== undefined && (
                <div className="p-4 wireframe-border rounded-lg bg-surface">
                  <span className="block text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Salt
                  </span>
                  <span className="text-headline-md font-heading font-semibold">
                    {item.nutrition.salt_g}g
                  </span>
                </div>
              )}
            </div>
            {item.nutrition.serving_size && (
              <p className="text-label-sm text-on-surface-variant mt-4">
                Serving size: {item.nutrition.serving_size}
              </p>
            )}
          </div>
        )}

        {/* Product details */}
        <div
          className={cn(
            item.nutrition ? 'md:col-span-4' : 'md:col-span-12',
            'dashed-outline p-6 rounded-lg'
          )}
        >
          <h3 className="text-label-md text-primary uppercase tracking-wider mb-4 font-semibold">
            Product Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-outline-variant pb-2">
              <span className="text-label-sm text-on-surface-variant">Raw Name</span>
              <span className="text-on-surface text-right">{item.raw_name}</span>
            </div>
            {item.canonical_name && (
              <div className="flex justify-between border-b border-outline-variant pb-2">
                <span className="text-label-sm text-on-surface-variant">Canonical Name</span>
                <span className="text-on-surface text-right">{item.canonical_name}</span>
              </div>
            )}
            {item.normalized_name && (
              <div className="flex justify-between border-b border-outline-variant pb-2">
                <span className="text-label-sm text-on-surface-variant">Normalized Name</span>
                <span className="text-on-surface text-right font-mono text-sm">
                  {item.normalized_name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="text-label-sm text-on-surface-variant mt-6">
        <p>Added: {new Date(item.created_at).toLocaleDateString()}</p>
        <p>Last updated: {new Date(item.updated_at).toLocaleDateString()}</p>
      </div>
    </div>
  )
}
