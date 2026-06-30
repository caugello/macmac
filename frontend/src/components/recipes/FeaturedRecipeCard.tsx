import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { CategoryBadge } from '@/components/recipes/CategoryBadge'
import { FavoriteButton } from '@/components/recipes/FavoriteButton'
import { getDifficultyLabel, formatPrepTime } from '@/lib/recipeDifficulty'
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
 * Large hero tile for the most recent recipe in the Pantry Fresh bento system:
 * an ink-toned card with a full-bleed image (hue placeholder fallback), a lime
 * "Featured" pill, the display title, description and metadata pills (prep time
 * / calories / difficulty / servings / ingredient count).
 *
 * Only metadata that the recipe actually provides is rendered; missing fields
 * are omitted rather than fabricated.
 */
export const FeaturedRecipeCard = ({ recipe }: FeaturedRecipeCardProps) => {
  const hue = getCardHue(recipe.title)
  const ingredientCount = recipe.ingredients.length

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="group block"
      aria-label={`Featured recipe: ${recipe.title}`}
    >
      <Card tone="ink" className="overflow-hidden transition-shadow hover:shadow-lg">
        <div className="grid md:grid-cols-2">
          {/* Image area */}
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[20rem] overflow-hidden bg-cream">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue} 45% 90%) 0%, hsl(${hue} 35% 82%) 100%)`,
                }}
              >
                <Icon name="restaurant_menu" size={72} className="text-ink/20" />
              </div>
            )}
            <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1 text-label-md font-semibold text-ink">
              <Icon name="star" size={16} filled />
              Featured
            </span>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <CategoryBadge category={recipe.category} />
              <FavoriteButton recipe={recipe} className="shrink-0 -mt-1 -mr-1" />
            </div>

            <h2 className="mt-3 text-headline-md font-display font-bold text-cream line-clamp-2">
              {recipe.title}
            </h2>

            {recipe.description && (
              <p className="mt-2 text-body-md text-cream/70 line-clamp-3">{recipe.description}</p>
            )}

            <div className="mt-auto pt-5 flex flex-wrap items-center gap-2">
              {recipe.prep_time != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-label-md font-medium text-cream">
                  <Icon name="schedule" size={16} />
                  {formatPrepTime(recipe.prep_time)}
                </span>
              )}
              {recipe.calories != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-label-md font-medium text-cream">
                  <Icon name="local_fire_department" size={16} />
                  {recipe.calories} kcal
                </span>
              )}
              {recipe.difficulty != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-label-md font-medium text-cream">
                  <Icon name="bar_chart" size={16} />
                  {getDifficultyLabel(recipe.difficulty)}
                </span>
              )}
              {recipe.servings != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-label-md font-medium text-cream">
                  <Icon name="group" size={16} />
                  {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
                </span>
              )}
              {ingredientCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-label-md font-medium text-cream">
                  <Icon name="grocery" size={16} />
                  {ingredientCount} {ingredientCount === 1 ? 'ingredient' : 'ingredients'}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
