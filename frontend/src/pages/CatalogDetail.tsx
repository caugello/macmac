import { useParams, Link } from 'react-router-dom'
import { useCatalogItem } from '@/hooks/useCatalog'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'
import { ProductDetailHero } from '@/components/catalog/ProductDetailHero'
import { ProductDetailNutrition } from '@/components/catalog/ProductDetailNutrition'
import { Icon } from '@/components/ui/icon'

const STALE_DAYS = 7

function freshnessBadge(lastEnrichedAt: string | null): {
  label: string
  stale: boolean
} | null {
  if (!lastEnrichedAt) return null
  const diffMs = Date.now() - new Date(lastEnrichedAt).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 1) return { label: 'Updated today', stale: false }
  if (days === 1) return { label: 'Updated yesterday', stale: false }
  return { label: `Updated ${days} days ago`, stale: days >= STALE_DAYS }
}

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
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 h-12 px-5 rounded-full bg-primary text-on-primary font-semibold transition-all hover:-translate-y-px hover:ambient-shadow"
        >
          <Icon name="arrow_back" size={18} />
          Back to Catalog
        </Link>
      </div>
    )
  }

  const title = item.canonical_name || item.raw_name
  const fresh = freshnessBadge(item.last_enriched_at)

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-16">
      {/* Back navigation */}
      <Link
        to="/catalog"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors mb-6"
      >
        <Icon name="arrow_back" size={20} />
        <span className="text-label-md">Back to Catalog</span>
      </Link>

      {/* Hero + info: stacked on mobile, two-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <ProductDetailHero
          imageUrl={item.image_url}
          alt={title}
          nutriscore={item.nutriscore}
          isPromo={!!item.promotion_until_date}
        />

        {/* Product information */}
        <div className="lg:sticky lg:top-6">
          {item.nutriscore && (
            <div className="flex items-center gap-2 mb-3">
              <NutriscoreBadge score={item.nutriscore} size="lg" />
              <span className="text-caption text-on-surface-variant uppercase tracking-wider">
                Nutri-Score
              </span>
            </div>
          )}

          {item.brand && (
            <p className="text-on-surface-variant text-label-md uppercase tracking-wider mb-1">
              {item.brand}
            </p>
          )}

          <h1 className="text-headline-lg-mobile md:text-headline-lg font-heading font-bold mb-2">
            {title}
          </h1>

          <p className="text-on-surface-variant text-body-md">
            {item.vendor_name}
            {item.net_quantity_value && item.net_quantity_unit && (
              <span>
                &nbsp;&middot;&nbsp;{item.net_quantity_value}
                {item.net_quantity_unit}
              </span>
            )}
          </p>

          {item.price && (
            <p className="text-display-md font-heading font-bold mt-4 text-primary">
              {item.price.toFixed(2)}&nbsp;&euro;
              <span className="text-body-md font-normal text-on-surface-variant"> / unit</span>
            </p>
          )}

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {item.promotion_until_date && (
              <div className="inline-flex items-center gap-2 bg-error-container text-on-error-container px-3 py-1.5 rounded-full text-caption font-semibold">
                <Icon name="schedule" size={16} />
                Promo until {new Date(item.promotion_until_date).toLocaleDateString()}
              </div>
            )}
            {fresh && (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-semibold ${
                  fresh.stale
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-secondary-container text-on-secondary-container'
                }`}
              >
                <Icon name={fresh.stale ? 'warning' : 'check_circle'} size={16} />
                {fresh.label}
              </div>
            )}
          </div>

          {/* Vendor site button */}
          <a
            href={item.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 h-12 rounded-full bg-primary text-on-primary font-semibold transition-all hover:-translate-y-px hover:ambient-shadow active:scale-[0.98]"
          >
            <Icon name="open_in_new" size={18} />
            View on Vendor Site
          </a>
        </div>
      </div>

      {/* Lower sections: nutrition + details side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-10 lg:mt-14">
        {item.nutrition && <ProductDetailNutrition nutrition={item.nutrition} />}

        <section>
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
    </div>
  )
}
