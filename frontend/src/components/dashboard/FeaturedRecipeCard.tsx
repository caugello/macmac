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

interface BadgeProps {
  icon: string
  label: string
}

const MetaBadge = ({ icon, label }: BadgeProps) => (
  <span className="inline-flex items-center gap-1.5 bg-surface-container text-on-surface-variant text-caption font-semibold px-2.5 py-1 rounded-full">
    <Icon name={icon} size={16} className="text-primary" />
    {label}
  </span>
)

export const FeaturedRecipeCard = ({ recipe }: { recipe: RecipeOut }) => {
  const hue = getCardHue(recipe.title)
  const ingredientCount = recipe.ingredients.length

  return (
    <section aria-label="Featured recipe" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-lg font-heading font-semibold text-on-surface">
          Featured recipe
        </h2>
        <Link
          to="/recipes"
          className="text-label-md font-semibold text-primary hover:brightness-110 transition-all flex items-center gap-1 min-h-[44px] px-2"
        >
          View all
          <Icon name="chevron_right" size={18} />
        </Link>
      </div>

      <Link to={`/recipes/${recipe.id}`} className="group block">
        <article className="bg-surface-container-lowest rounded-xl ambient-shadow card-hover-shadow overflow-hidden md:flex">
          <div className="relative aspect-[16/9] md:aspect-auto md:w-2/5 overflow-hidden">
            <div
              className="w-full h-full min-h-[180px] flex items-center justify-center group-hover:scale-105 transition-transform duration-500"
              style={{
                background: `linear-gradient(135deg, hsl(${hue} 40% 92%) 0%, hsl(${hue} 30% 85%) 100%)`,
              }}
            >
              <Icon name="restaurant_menu" size={56} className="text-outline-variant/40" />
            </div>
            <CategoryBadge
              category={recipe.category}
              className="absolute top-3 left-3 backdrop-blur-sm"
            />
          </div>

          <div className="p-5 md:p-6 md:flex-1 flex flex-col justify-center gap-3">
            <h3 className="text-title-lg md:text-headline-md font-heading font-bold text-on-surface line-clamp-2">
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="text-body-md text-on-surface-variant line-clamp-2">
                {recipe.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
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
        </article>
      </Link>
    </section>
  )
}
