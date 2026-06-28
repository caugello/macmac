import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
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
 * Recipe discovery card in the Pantry Fresh bento system: a rounded white tile
 * with an image header (hue placeholder fallback) carrying a category badge,
 * a display title, optional description, and a metadata footer (prep time /
 * calories / difficulty / servings / ingredient count). Missing fields are
 * omitted rather than invented.
 */
export const RecipeDiscoveryCard = ({ recipe }: RecipeDiscoveryCardProps) => {
  const hue = getCardHue(recipe.title)
  const ingredientCount = recipe.ingredients.length

  return (
    <Link to={`/recipes/${recipe.id}`} className="group block h-full">
      <Card
        tone="white"
        className="h-full flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-cream">
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
              <Icon name="restaurant_menu" size={44} className="text-ink/20" />
            </div>
          )}
          <CategoryBadge
            category={recipe.category}
            className="absolute top-3 left-3 backdrop-blur-sm"
          />
          <span
            className="absolute top-3 right-3 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/80 backdrop-blur-[20px] text-ink group-hover:bg-ink group-hover:text-cream transition-colors"
            aria-hidden="true"
          >
            <Icon name="bookmark" size={20} />
          </span>
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="text-title-lg font-display font-bold leading-tight text-ink line-clamp-2">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mt-1.5 text-body-md text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}

          <div className="mt-auto pt-4 flex flex-wrap items-center gap-3 text-label-md text-muted-foreground">
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
      </Card>
    </Link>
  )
}
