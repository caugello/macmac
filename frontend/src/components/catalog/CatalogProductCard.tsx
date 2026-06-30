import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'
import { ProductImage } from '@/components/catalog/ProductImage'
import { Icon } from '@/components/ui/icon'
import { useMyList } from '@/hooks/useMyList'
import { cn } from '@/lib/utils'
import type { CatalogItemOut } from '@/lib/types'

interface CatalogProductCardProps {
  item: CatalogItemOut
}

/**
 * Catalog product card in the Pantry Fresh bento system: a rounded white tile
 * with the product image, Nutri-Score badge and coral promotion badge, then a
 * brand eyebrow, a display title and a €-prefixed price sharing a row with a
 * round lime add-to-list button. Bespoke to the Catalog list — not shared with
 * Product Detail.
 */
export const CatalogProductCard = ({ item }: CatalogProductCardProps) => {
  const { has, toggleItem } = useMyList()
  const name = item.canonical_name || item.raw_name
  const inList = has(item.id)

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleItem({
      id: item.id,
      name,
      brand: item.brand,
      price: item.price,
      imageUrl: item.image_url,
      nutriscore: item.nutriscore,
    })
  }

  return (
    <Link to={`/catalog/${item.id}`} className="group block h-full">
      <Card
        tone="white"
        className="overflow-hidden flex flex-col h-full transition-shadow hover:shadow-lg"
      >
        {/* Media */}
        <div className="aspect-square relative overflow-hidden bg-cream">
          <ProductImage
            src={item.image_url}
            alt={name}
            className="group-hover:scale-105 transition-transform duration-500"
          />

          {item.nutriscore && (
            <NutriscoreBadge score={item.nutriscore} size="sm" className="absolute top-3 left-3" />
          )}

          {item.promotion_until_date && (
            <Badge
              variant="promotion"
              className="absolute bottom-3 left-3 uppercase tracking-wider"
            >
              Promo
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-grow">
          {item.brand && (
            <span className="text-caption uppercase tracking-wider text-muted-foreground mb-1">
              {item.brand}
            </span>
          )}

          <h3 className="text-title-lg font-display font-bold leading-tight line-clamp-2">
            {name}
          </h3>

          {/* Price + add-to-list action */}
          <div className="mt-auto pt-3 flex items-end justify-between gap-2">
            {item.price != null ? (
              <span className="text-headline-md font-display font-bold text-ink">
                &euro;{item.price.toFixed(2)}
              </span>
            ) : (
              <span className="text-body-md text-muted-foreground">Price unavailable</span>
            )}

            <button
              type="button"
              onClick={handleToggle}
              aria-label={inList ? 'Remove from My List' : 'Add to My List'}
              aria-pressed={inList}
              className={cn(
                'w-9 h-9 shrink-0 flex items-center justify-center rounded-full active:scale-90 transition-all',
                inList ? 'bg-ink text-cream' : 'bg-lime text-ink hover:brightness-105'
              )}
            >
              <Icon name={inList ? 'check' : 'add'} size={20} filled />
            </button>
          </div>
        </div>
      </Card>
    </Link>
  )
}
