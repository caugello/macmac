import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { CategoryBadge } from '@/components/recipes/CategoryBadge'
import { FavoriteButton } from '@/components/recipes/FavoriteButton'
import { formatPrepTime } from '@/lib/recipeDifficulty'
import type { RecipeOut } from '@/lib/types'

interface RecipeDiscoveryCardProps {
  recipe: RecipeOut
}

/**
 * Recipe discovery card in the Pantry Fresh "07 — Recipe Library" system: a
 * compact, text-only white tile (no image). The top row carries a solid-colour
 * category badge on the left and the favorite heart on the right; below sit the
 * display title and a metadata row (prep time / calories). Missing fields are
 * omitted rather than invented.
 */
export const RecipeDiscoveryCard = ({ recipe }: RecipeDiscoveryCardProps) => {
  return (
    <Link to={`/recipes/${recipe.id}`} className="group block h-full">
      <Card tone="white" className="h-full flex flex-col p-4 transition-shadow hover:shadow-lg">
        <div className="flex items-center justify-between mb-3.5">
          <CategoryBadge category={recipe.category} />
          {/* Bare heart matching the design: coral when favorited, grey otherwise. */}
          <FavoriteButton
            recipe={recipe}
            className="w-auto h-auto rounded-none bg-transparent backdrop-blur-none hover:bg-transparent aria-[pressed=false]:text-[#CFCDBE]"
          />
        </div>

        <h3 className="text-title-lg font-display font-bold leading-tight text-ink line-clamp-2">
          {recipe.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-label-md font-semibold text-muted-foreground">
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
        </div>
      </Card>
    </Link>
  )
}
