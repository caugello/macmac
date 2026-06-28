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

interface BadgeProps {
  icon: string
  label: string
}

const MetaBadge = ({ icon, label }: BadgeProps) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 font-body text-caption font-semibold text-ink/70">
    <Icon name={icon} size={16} className="text-green" />
    {label}
  </span>
)

export const FeaturedRecipeCard = ({ recipe }: { recipe: RecipeOut }) => {
  const hue = getCardHue(recipe.title)
  const ingredientCount = recipe.ingredients.length

  return (
    <section aria-label="Featured recipe" className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="font-display text-title-lg font-semibold text-ink">Featured recipe</h2>
        <Link
          to="/recipes"
          className="flex min-h-[44px] items-center gap-1 px-2 font-body text-label-md font-semibold text-ink/70 transition-colors hover:text-ink"
        >
          View all
          <Icon name="chevron_right" size={18} />
        </Link>
      </div>

      <Link to={`/recipes/${recipe.id}`} className="group block flex-1">
        <Card
          tone="white"
          className="h-full overflow-hidden transition-transform hover:-translate-y-0.5 md:flex"
        >
          <div className="relative aspect-[16/9] overflow-hidden md:aspect-auto md:w-2/5">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="h-full min-h-[180px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className="flex h-full min-h-[180px] w-full items-center justify-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue} 40% 92%) 0%, hsl(${hue} 30% 85%) 100%)`,
                }}
              >
                <Icon name="restaurant_menu" size={56} className="text-ink/15" />
              </div>
            )}
            <CategoryBadge
              category={recipe.category}
              className="absolute left-3 top-3 backdrop-blur-sm"
            />
          </div>

          <div className="flex flex-col justify-center gap-3 p-5 md:flex-1 md:p-6">
            <h3 className="font-display text-title-lg font-bold text-ink line-clamp-2 md:text-headline-md">
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="font-body text-body-md text-ink/60 line-clamp-2">
                {recipe.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {recipe.prep_time != null && (
                <MetaBadge icon="schedule" label={formatPrepTime(recipe.prep_time)} />
              )}
              {recipe.calories != null && (
                <MetaBadge icon="local_fire_department" label={`${recipe.calories} kcal`} />
              )}
              {recipe.difficulty != null && (
                <MetaBadge icon="bar_chart" label={getDifficultyLabel(recipe.difficulty)} />
              )}
              {recipe.servings != null && (
                <MetaBadge
                  icon="group"
                  label={`${recipe.servings} ${recipe.servings === 1 ? 'serving' : 'servings'}`}
                />
              )}
              <MetaBadge
                icon="kitchen"
                label={`${ingredientCount} ${ingredientCount === 1 ? 'ingredient' : 'ingredients'}`}
              />
            </div>
          </div>
        </Card>
      </Link>
    </section>
  )
}
