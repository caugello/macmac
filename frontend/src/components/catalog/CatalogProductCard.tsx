import { Link } from 'react-router-dom'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'
import { ProductImage } from '@/components/catalog/ProductImage'
import { Icon } from '@/components/ui/icon'
import type { CatalogItemOut } from '@/lib/types'

interface CatalogProductCardProps {
  item: CatalogItemOut
}

/**
 * Catalog product card matching the Stitch "Catalog - Ivory Flux" design:
 * rounded image with an overlaid favorite (heart) action, an eyebrow brand line,
 * a confident editorial title, a muted material/description line and a prominent
 * price. Bespoke to the Catalog list — not shared with Product Detail.
 */
export const CatalogProductCard = ({ item }: CatalogProductCardProps) => {
  const name = item.canonical_name || item.raw_name

  // Editorial "material" line: quantity + category, à la the Stitch descriptions.
  const quantity =
    item.net_quantity_value != null && item.net_quantity_unit
      ? `${item.net_quantity_value} ${item.net_quantity_unit}`
      : null
  const description = [quantity, item.category].filter(Boolean).join(' · ')

  return (
    <Link to={`/catalog/${item.id}`} className="group block h-full">
      <article className="bg-surface-container-lowest wireframe-border rounded-xl overflow-hidden card-hover-shadow flex flex-col h-full">
        {/* Media */}
        <div className="aspect-square relative overflow-hidden">
          <ProductImage
            src={item.image_url}
            alt={name}
            className="group-hover:scale-105 transition-transform duration-500"
          />

          {item.nutriscore && (
            <NutriscoreBadge score={item.nutriscore} size="sm" className="absolute top-3 left-3" />
          )}

          {item.promotion_until_date && (
            <span className="absolute bottom-3 left-3 bg-primary-container text-on-primary-container text-caption font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
              Promo
            </span>
          )}

          {/* Favorite action — matches the Stitch heart, top-right floating glass */}
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            aria-label="Add to favorites"
            className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-[20px] text-on-surface-variant hover:text-primary active:scale-90 transition-all"
          >
            <Icon name="favorite" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-grow">
          {item.brand && (
            <span className="text-caption uppercase tracking-wider text-on-surface-variant mb-1">
              {item.brand}
            </span>
          )}

          <h3 className="text-title-lg font-heading font-semibold leading-tight line-clamp-2">
            {name}
          </h3>

          {description && (
            <p className="text-body-md text-on-surface-variant line-clamp-1 mt-1">{description}</p>
          )}

          <div className="mt-auto pt-3">
            {item.price != null ? (
              <span className="text-headline-md font-heading font-bold text-primary">
                {item.price.toFixed(2)}&nbsp;&euro;
              </span>
            ) : (
              <span className="text-body-md text-on-surface-variant">Price unavailable</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
