import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'
import { CategoryBadge } from '@/components/recipes/CategoryBadge'
import type { RecipeOut } from '@/lib/types'

const cardHues = [15, 25, 35, 140, 30, 45, 10, 200, 50, 20]
const getCardHue = (title: string) => {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return cardHues[Math.abs(hash) % cardHues.length]
}

interface FeaturedRecipeCardProps {
  recipe: RecipeOut
}

/**
 * Large hero card for the most recent recipe, modeled on the Stitch "Ivory Flux"
 * featured card: full-bleed image area, title, description, real metadata badges
 * (servings / ingredient count) and a bookmark affordance.
 *
 * Only metadata that the recipe actually provides is rendered — there is no
 * duration or difficulty field on RecipeOut, so those badges are intentionally
 * omitted rather than fabricated.
 */
export const FeaturedRecipeCard = ({ recipe }: FeaturedRecipeCardProps) => {
  const hue = getCardHue(recipe.title)
  const ingredientCount = recipe.ingredients.length

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="group block bg-surface-container-lowest rounded-2xl overflow-hidden ambient-shadow card-hover-shadow"
      aria-label={`Featured recipe: ${recipe.title}`}
    >
      <div className="grid md:grid-cols-2">
        {/* Image area */}
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[20rem] overflow-hidden">
          <div
            className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 45% 90%) 0%, hsl(${hue} 35% 82%) 100%)`,
            }}
          >
            <Icon name="restaurant_menu" size={72} className="text-outline-variant/30" />
          </div>
          <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1 text-label-md font-semibold text-primary">
            <Icon name="star" size={16} filled />
            Featured
          </span>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <CategoryBadge category={recipe.category} />
            <span
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 -mt-1 -mr-1 rounded-full text-on-surface-variant group-hover:text-primary transition-colors"
              aria-hidden="true"
            >
              <Icon name="bookmark" size={24} />
            </span>
          </div>

          <h2 className="mt-3 text-headline-md font-heading font-bold text-on-surface line-clamp-2">
            {recipe.title}
          </h2>

          {recipe.description && (
            <p className="mt-2 text-body-md text-on-surface-variant line-clamp-3">
              {recipe.description}
            </p>
          )}

          <div className="mt-auto pt-5 flex flex-wrap items-center gap-2">
            {recipe.servings != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-label-md font-medium text-on-surface-variant">
                <Icon name="group" size={16} />
                {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
              </span>
            )}
            {ingredientCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-label-md font-medium text-on-surface-variant">
                <Icon name="grocery" size={16} />
                {ingredientCount} {ingredientCount === 1 ? 'ingredient' : 'ingredients'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
