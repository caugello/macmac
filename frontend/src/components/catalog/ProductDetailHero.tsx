import { ProductImage } from '@/components/catalog/ProductImage'
import { Badge } from '@/components/ui/badge'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'

interface ProductDetailHeroProps {
  imageUrl: string | null
  alt: string
  nutriscore: string | null
  isPromo: boolean
}

/**
 * Pantry Fresh product-detail hero panel: a rounded bento tile holding the
 * product image, with a coral promotion badge and the large Nutri-Score badge
 * floating over the corners. Mobile: full-width square. Desktop: tall column.
 */
export const ProductDetailHero = ({
  imageUrl,
  alt,
  nutriscore,
  isPromo,
}: ProductDetailHeroProps) => {
  return (
    <div className="relative w-full aspect-square lg:aspect-auto lg:h-full lg:min-h-[480px] rounded-bento overflow-hidden bg-cream border border-border">
      <ProductImage src={imageUrl} alt={alt} iconSize={96} />

      {isPromo && (
        <Badge variant="promotion" className="absolute top-4 left-4 uppercase tracking-wider">
          Promo
        </Badge>
      )}

      {nutriscore && (
        <div className="absolute top-4 right-4">
          <NutriscoreBadge score={nutriscore} size="lg" className="shadow-sm" />
        </div>
      )}
    </div>
  )
}
