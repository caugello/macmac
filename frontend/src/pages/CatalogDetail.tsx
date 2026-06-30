import { useParams, Link } from 'react-router-dom'
import { useCatalogItem } from '@/hooks/useCatalog'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'
import { ProductDetailHero } from '@/components/catalog/ProductDetailHero'
import { ProductDetailNutrition } from '@/components/catalog/ProductDetailNutrition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { useMyList } from '@/hooks/useMyList'

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
  const { has, toggleItem } = useMyList()

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading product...</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Product not found.</p>
        <Button asChild>
          <Link to="/catalog">
            <Icon name="arrow_back" size={18} className="mr-2" />
            Back to Catalog
          </Link>
        </Button>
      </div>
    )
  }

  const title = item.canonical_name || item.raw_name
  const fresh = freshnessBadge(item.last_enriched_at)
  const inList = has(item.id)

  const handleToggleList = () => {
    toggleItem({
      id: item.id,
      name: title,
      brand: item.brand,
      price: item.price,
      imageUrl: item.image_url,
      nutriscore: item.nutriscore,
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-16">
      {/* Back navigation */}
      <Link
        to="/catalog"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-ink transition-colors mb-6"
      >
        <Icon name="arrow_back" size={20} />
        <span className="text-label-md font-semibold">Back to Catalog</span>
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
            <div className="flex items-center gap-3 mb-4">
              <NutriscoreBadge score={item.nutriscore} size="lg" />
              <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                Nutri-Score
              </span>
            </div>
          )}

          {item.brand && (
            <p className="text-muted-foreground text-label-md font-semibold uppercase tracking-wider mb-1">
              {item.brand}
            </p>
          )}

          <h1 className="text-headline-lg-mobile md:text-headline-lg font-display font-bold text-ink mb-2">
            {title}
          </h1>

          <p className="text-muted-foreground text-body-md">
            {item.vendor_name}
            {item.net_quantity_value && item.net_quantity_unit && (
              <span>
                &nbsp;&middot;&nbsp;{item.net_quantity_value}
                {item.net_quantity_unit}
              </span>
            )}
          </p>

          {item.price && (
            <p className="text-display-md font-display font-bold mt-4 text-ink">
              &euro;{item.price.toFixed(2)}
            </p>
          )}

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {item.promotion_until_date && (
              <Badge variant="promotion" className="gap-1.5 px-3 py-1.5 text-caption">
                <Icon name="schedule" size={16} />
                Promo until {new Date(item.promotion_until_date).toLocaleDateString()}
              </Badge>
            )}
            {fresh && (
              <Badge
                variant={fresh.stale ? 'destructive' : 'accent'}
                className="gap-1.5 px-3 py-1.5 text-caption"
              >
                <Icon name={fresh.stale ? 'warning' : 'check_circle'} size={16} />
                {fresh.label}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant={inList ? 'outline' : 'accent'}
              onClick={handleToggleList}
              aria-pressed={inList}
              className="flex-1"
            >
              <Icon name="shopping_cart" size={18} filled={inList} className="mr-2" />
              {inList ? 'In My List' : 'Add to My List'}
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                <Icon name="open_in_new" size={18} className="mr-2" />
                View on Vendor Site
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Lower sections: nutrition + details side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-10 lg:mt-14">
        {item.nutrition && <ProductDetailNutrition nutrition={item.nutrition} />}

        <section>
          <h2 className="text-headline-md font-display font-bold text-ink mb-4">Product Details</h2>
          <Card tone="white" className="p-5">
            <ul className="divide-y divide-border">
              {item.net_quantity_value && item.net_quantity_unit && (
                <li className="flex justify-between py-3 first:pt-0">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-semibold text-ink text-right">
                    {item.net_quantity_value} {item.net_quantity_unit}
                  </span>
                </li>
              )}
              {item.category && (
                <li className="flex justify-between py-3 first:pt-0">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-semibold text-ink text-right">{item.category}</span>
                </li>
              )}
              <li className="flex justify-between py-3 first:pt-0">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold text-ink text-right">
                  {item.is_food ? 'Food' : 'Non-Food'}
                </span>
              </li>
              <li className="flex justify-between py-3 first:pt-0">
                <span className="text-muted-foreground">Vendor</span>
                <span className="font-semibold text-ink text-right">{item.vendor_name}</span>
              </li>
              {item.canonical_name && item.canonical_name !== item.raw_name && (
                <li className="flex justify-between py-3 first:pt-0">
                  <span className="text-muted-foreground">Raw Name</span>
                  <span className="font-semibold text-ink text-right max-w-[60%]">
                    {item.raw_name}
                  </span>
                </li>
              )}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  )
}
