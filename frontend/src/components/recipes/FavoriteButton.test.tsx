import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FavoriteButton } from './FavoriteButton'
import * as useRecipesHook from '@/hooks/useRecipes'

const mockMutate = vi.fn()

vi.spyOn(useRecipesHook, 'useToggleFavorite').mockImplementation(
  () =>
    ({
      mutate: mockMutate,
      isPending: false,
    }) as unknown as ReturnType<typeof useRecipesHook.useToggleFavorite>
)

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), confirm: vi.fn() }),
}))

const recipe = { id: 'r1', title: 'Cake', is_favorite: false }

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an "Add to favorites" control when not favorited', () => {
    render(<FavoriteButton recipe={recipe} />)
    expect(screen.getByRole('button', { name: 'Add to favorites' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('renders a "Remove from favorites" control when favorited', () => {
    render(<FavoriteButton recipe={{ ...recipe, is_favorite: true }} />)
    expect(screen.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('toggles favorite on click with the current favorite state', async () => {
    const user = userEvent.setup()
    render(<FavoriteButton recipe={recipe} />)

    await user.click(screen.getByRole('button', { name: 'Add to favorites' }))

    expect(mockMutate).toHaveBeenCalledWith({ id: 'r1', isFavorite: false }, expect.anything())
  })

  it('renders the detail variant with a text label', () => {
    render(<FavoriteButton recipe={recipe} variant="detail" />)
    expect(screen.getByText('Favorite')).toBeInTheDocument()
  })
})
