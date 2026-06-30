import { useToggleFavorite } from '@/hooks/useRecipes'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { RecipeOut } from '@/lib/types'

interface FavoriteButtonProps {
  recipe: Pick<RecipeOut, 'id' | 'is_favorite' | 'title'>
  /**
   * "overlay" renders a circular button suited to sitting on top of a card
   * image; "detail" renders a larger pill-style button for the detail view.
   */
  variant?: 'overlay' | 'detail'
  className?: string
}

/**
 * Heart toggle for a recipe's per-user favorite state.
 *
 * The toggle is optimistic (handled by useToggleFavorite), so the icon flips
 * immediately. When rendered inside a clickable card the click is stopped from
 * bubbling to the wrapping link/navigation.
 */
export const FavoriteButton = ({ recipe, variant = 'overlay', className }: FavoriteButtonProps) => {
  const toggleFavorite = useToggleFavorite()
  const { toast } = useToast()
  const isFavorite = recipe.is_favorite

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite.mutate(
      { id: recipe.id, isFavorite },
      {
        onError: () =>
          toast(isFavorite ? 'Failed to remove favorite' : 'Failed to add favorite', 'error'),
      }
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggleFavorite.isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'inline-flex items-center justify-center transition-colors disabled:opacity-60',
        variant === 'overlay' &&
          'w-11 h-11 rounded-full bg-white/80 backdrop-blur-[20px] hover:bg-white',
        variant === 'detail' &&
          'gap-2 h-12 px-5 rounded-full border border-border bg-white hover:bg-surface-container text-label-md font-semibold',
        isFavorite ? 'text-coral' : 'text-ink',
        className
      )}
    >
      <Icon name="favorite" size={variant === 'detail' ? 18 : 20} filled={isFavorite} />
      {variant === 'detail' && <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>}
    </button>
  )
}
