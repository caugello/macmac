import { useParams, Link } from 'react-router-dom'
import { useCatalogItem } from '@/hooks/useCatalog'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'
import { ProductImage } from '@/components/catalog/ProductImage'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

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
    <div className="max-w-3xl mx-auto px-4 md:px-12 pt-6 pb-12">
      {/* Back navigation */}
      <Link
        to="/catalog"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors mb-6"
      >
        <Icon name="arrow_back" size={20} />
        <span className="text-label-md">Back to Catalog</span>
      </Link>

      {/* Hero image */}
      <div className="bg-surface-container-lowest rounded-lg overflow-hidden wireframe-border relative mb-6 aspect-square md:aspect-[4/3]">
        <ProductImage
          src={item.image_url}
          alt={item.canonical_name || item.raw_name}
          iconSize={80}
        />
      </div>

      {/* Product header */}
      <div className="mb-6">
        {/* Nutri-Score badge */}
        {item.nutriscore && (
          <div className="flex items-center gap-2 mb-3">
            <NutriscoreBadge score={item.nutriscore} size="lg" />
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Nutri-Score
            </span>
          </div>
        )}

        {/* Brand */}
        {item.brand && <p className="text-on-surface-variant text-label-md mb-1">{item.brand}</p>}

        {/* Product title */}
        <h1 className="text-headline-lg font-heading font-bold mb-1">
          {item.canonical_name || item.raw_name}
        </h1>

        {/* Vendor & weight */}
        <p className="text-on-surface-variant text-body-md">
          {item.vendor_name}
          {item.net_quantity_value && item.net_quantity_unit && (
            <span>
              &nbsp;&middot;&nbsp;{item.net_quantity_value}
              {item.net_quantity_unit}
            </span>
          )}
        </p>

        {/* Price */}
        {item.price && (
          <p className="text-headline-md font-heading font-bold mt-3">
            {item.price.toFixed(2)}&nbsp;&euro;
            <span className="text-body-md font-normal text-on-surface-variant"> / unit</span>
          </p>
        )}

        {/* Promo alert */}
        {item.promotion_until_date && (
          <div className="inline-flex items-center gap-2 bg-error-container text-on-error-container px-3 py-1.5 rounded-full text-label-sm font-semibold mt-3">
            <Icon name="schedule" size={16} />
            Promo until {new Date(item.promotion_until_date).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-8">
        <Button className="flex-1 h-12 gap-2">
          <Icon name="shopping_basket" size={20} />
          Add to List
        </Button>
        <Button variant="outline" asChild className="flex-1 h-12 gap-2 border-outline-variant">
          <a href={item.product_url} target="_blank" rel="noopener noreferrer">
            <Icon name="open_in_new" size={18} />
            View on Vendor Site
          </a>
        </Button>
      </div>

      {/* Nutritional Values */}
      {item.nutrition && (
        <section className="border-t border-outline-variant pt-6 mb-6">
          <h2 className="text-headline-md font-heading font-semibold mb-4">
            Nutritional Values (100g)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {item.nutrition.energy_kcal != null && (
              <div className="bg-surface-container-lowest wireframe-border rounded-lg p-4">
                <span className="block text-label-sm text-on-surface-variant mb-1">Energy</span>
                <span className="text-headline-md font-heading font-semibold">
                  {item.nutrition.energy_kcal} kcal
                </span>
              </div>
            )}
            {item.nutrition.fat_g != null && (
              <div className="bg-surface-container-lowest wireframe-border rounded-lg p-4">
                <span className="block text-label-sm text-on-surface-variant mb-1">Fat</span>
                <span className="text-headline-md font-heading font-semibold">
                  {item.nutrition.fat_g}g
                </span>
              </div>
            )}
            {item.nutrition.carbs_g != null && (
              <div className="bg-surface-container-lowest wireframe-border rounded-lg p-4">
                <span className="block text-label-sm text-on-surface-variant mb-1">Carbs</span>
                <span className="text-headline-md font-heading font-semibold">
                  {item.nutrition.carbs_g}g
                </span>
              </div>
            )}
            {item.nutrition.protein_g != null && (
              <div className="bg-surface-container-lowest wireframe-border rounded-lg p-4">
                <span className="block text-label-sm text-on-surface-variant mb-1">Protein</span>
                <span className="text-headline-md font-heading font-semibold">
                  {item.nutrition.protein_g}g
                </span>
              </div>
            )}
          </div>
          {item.nutrition.serving_size && (
            <p className="text-label-sm text-on-surface-variant mt-3">
              Serving size: {item.nutrition.serving_size}
            </p>
          )}
        </section>
      )}

      {/* Product Details */}
      <section className="border-t border-outline-variant pt-6">
        <h2 className="text-headline-md font-heading font-semibold mb-4">Product Details</h2>
        <ul className="divide-y divide-outline-variant">
          {item.net_quantity_value && item.net_quantity_unit && (
            <li className="flex justify-between py-3">
              <span className="text-on-surface-variant">Weight</span>
              <span className="font-semibold text-right">
                {item.net_quantity_value} {item.net_quantity_unit}
              </span>
            </li>
          )}
          {item.category && (
            <li className="flex justify-between py-3">
              <span className="text-on-surface-variant">Category</span>
              <span className="font-semibold text-right">{item.category}</span>
            </li>
          )}
          <li className="flex justify-between py-3">
            <span className="text-on-surface-variant">Type</span>
            <span className="font-semibold text-right">{item.is_food ? 'Food' : 'Non-Food'}</span>
          </li>
          <li className="flex justify-between py-3">
            <span className="text-on-surface-variant">Vendor</span>
            <span className="font-semibold text-right">{item.vendor_name}</span>
          </li>
          {item.canonical_name && item.canonical_name !== item.raw_name && (
            <li className="flex justify-between py-3">
              <span className="text-on-surface-variant">Raw Name</span>
              <span className="font-semibold text-right max-w-[60%]">{item.raw_name}</span>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
