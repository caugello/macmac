import { ProductImage } from '@/components/catalog/ProductImage'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'

interface ProductDetailHeroProps {
  imageUrl: string | null
  alt: string
  nutriscore: string | null
  isPromo: boolean
}

/**
 * Ivory Flux product-detail hero panel.
 * Mobile: full-width rounded image. Desktop: tall left column.
 */
export const ProductDetailHero = ({
  imageUrl,
  alt,
  nutriscore,
  isPromo,
}: ProductDetailHeroProps) => {
  return (
    <div className="relative w-full aspect-square lg:aspect-auto lg:h-full lg:min-h-[480px] rounded-2xl overflow-hidden bg-surface-container-lowest wireframe-border">
      <ProductImage src={imageUrl} alt={alt} iconSize={96} />

      {isPromo && (
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-primary text-on-primary text-caption font-bold px-3 py-1.5 rounded-full shadow-sm">
          Promo
        </span>
      )}

      {nutriscore && (
        <div className="absolute top-4 right-4">
          <NutriscoreBadge score={nutriscore} size="lg" className="shadow-sm" />
        </div>
      )}
    </div>
  )
}
