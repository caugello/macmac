import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'
import { CategoryBadge } from '@/components/recipes/CategoryBadge'
import { getDifficultyLabel, formatPrepTime } from '@/lib/recipeDifficulty'
import type { RecipeOut } from '@/lib/types'

const cardHues = [15, 25, 35, 140, 30, 45, 10, 200, 50, 20]
const getCardHue = (title: string) => {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return cardHues[Math.abs(hash) % cardHues.length]
}

interface RecipeDiscoveryCardProps {
  recipe: RecipeOut
}

/**
 * Grid card for the Stitch "Ivory Flux" recipe discovery layout: image header
 * (with hue placeholder fallback) with category badge, title, optional
 * description, and a metadata footer (prep time / calories / difficulty /
 * servings / ingredient count). Missing fields are omitted rather than invented.
 */
export const RecipeDiscoveryCard = ({ recipe }: RecipeDiscoveryCardProps) => {
  const hue = getCardHue(recipe.title)
  const ingredientCount = recipe.ingredients.length

  return (
    <Link to={`/recipes/${recipe.id}`} className="group block">
      <article className="h-full flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden ambient-shadow card-hover-shadow">
        <div className="relative aspect-[4/3] overflow-hidden">
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
              <Icon name="restaurant_menu" size={44} className="text-outline-variant/30" />
            </div>
          )}
          <CategoryBadge
            category={recipe.category}
            className="absolute top-3 left-3 backdrop-blur-sm"
          />
          <span
            className="absolute top-2 right-2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-lowest/85 backdrop-blur-sm text-on-surface-variant group-hover:text-primary transition-colors"
            aria-hidden="true"
          >
            <Icon name="bookmark" size={18} />
          </span>
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="text-title-lg font-heading font-semibold text-on-surface line-clamp-2">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mt-1.5 text-body-md text-on-surface-variant line-clamp-2">
              {recipe.description}
            </p>
          )}

          <div className="mt-auto pt-4 flex flex-wrap items-center gap-3 text-label-md text-on-surface-variant">
            {recipe.prep_time != null && (
              <span className="inline-flex items-center gap-1">
                <Icon name="schedule" size={16} />
                {formatPrepTime(recipe.prep_time)}
              </span>
            )}
            {recipe.calories != null && (
              <span className="inline-flex items-center gap-1">
                <Icon name="local_fire_department" size={16} />
                {recipe.calories} kcal
              </span>
            )}
            {recipe.difficulty != null && (
              <span className="inline-flex items-center gap-1">
                <Icon name="bar_chart" size={16} />
                {getDifficultyLabel(recipe.difficulty)}
              </span>
            )}
            {recipe.servings != null && (
              <span className="inline-flex items-center gap-1">
                <Icon name="group" size={16} />
                {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
              </span>
            )}
            {ingredientCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon name="grocery" size={16} />
                {ingredientCount} {ingredientCount === 1 ? 'ingredient' : 'ingredients'}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
