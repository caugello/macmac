import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { getDifficultyLabel, formatPrepTime } from '@/lib/recipeDifficulty'
import type { RecipeOut } from '@/lib/types'

const cardHues = [15, 25, 35, 140, 30, 45, 10, 200, 50, 20]
const getCardHue = (title: string) => {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return cardHues[Math.abs(hash) % cardHues.length]
}

const HeroMeta = ({ icon, label }: { icon: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5 font-body text-caption font-semibold text-cream/90">
    <Icon name={icon} size={17} className="text-lime" />
    {label}
  </span>
)

interface TonightCardProps {
  recipe: RecipeOut
  /** Lime eyebrow pill text, e.g. "TONIGHT · DINNER" or "FEATURED". */
  eyebrow: string
}

/**
 * Dark "Tonight" bento hero (design screen 01). Shows the night's dinner — or the
 * newest recipe as a fallback — over the recipe image with a readability scrim.
 */
export const TonightCard = ({ recipe, eyebrow }: TonightCardProps) => {
  const hue = getCardHue(recipe.title)
  const ingredientCount = recipe.ingredients.length

  return (
    <section aria-label="Featured recipe" className="h-full">
      <Card
        tone="ink"
        className="relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden p-0"
      >
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 45% 30%) 0%, hsl(${hue} 35% 16%) 100%)`,
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(23,24,15,0.15) 0%, rgba(23,24,15,0.55) 55%, rgba(23,24,15,0.92) 100%)',
          }}
          aria-hidden
        />

        <span className="absolute left-4 top-4 rounded-full bg-lime px-3 py-1.5 font-body text-caption font-extrabold uppercase tracking-wide text-ink">
          {eyebrow}
        </span>

        <div className="relative flex flex-col gap-3 p-5 md:p-6">
          <h2 className="font-display text-headline-md font-bold leading-tight text-cream line-clamp-2 md:text-headline-lg">
            {recipe.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {recipe.prep_time != null && (
              <HeroMeta icon="schedule" label={formatPrepTime(recipe.prep_time)} />
            )}
            {recipe.servings != null && (
              <HeroMeta icon="group" label={`Serves ${recipe.servings}`} />
            )}
            {recipe.difficulty != null && (
              <HeroMeta icon="bar_chart" label={getDifficultyLabel(recipe.difficulty)} />
            )}
            <HeroMeta
              icon="kitchen"
              label={`${ingredientCount} ${ingredientCount === 1 ? 'ingredient' : 'ingredients'}`}
            />
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link
              to={`/recipes/${recipe.id}`}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-body text-label-md font-bold text-ink transition-transform hover:-translate-y-px"
            >
              <Icon name="restaurant_menu" size={18} />
              View recipe
            </Link>
            <Link
              to="/meal-plans"
              className="flex min-h-[44px] items-center rounded-xl border border-white/45 bg-white/10 px-4 py-2.5 font-body text-label-md font-bold text-cream transition-colors hover:bg-white/20"
            >
              Open planner
            </Link>
          </div>
        </div>
      </Card>
    </section>
  )
}
