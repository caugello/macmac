import { useState } from 'react'
import { useRecipes } from '@/hooks/useRecipes'
import { SearchBar } from '@/components/shared/SearchBar'
import { Icon } from '@/components/ui/icon'

interface RecipeSelectorModalProps {
  onSelect: (recipeId: string) => void
  onClose: () => void
}

export const RecipeSelectorModal = ({ onSelect, onClose }: RecipeSelectorModalProps) => {
  const [search, setSearch] = useState('')
  const { data } = useRecipes({ limit: 20, search })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-lg mx-4 bg-surface-container-lowest rounded-lg wireframe-border shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant">
          <h2 className="text-headline-md font-heading font-semibold">Select Recipe</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="px-4 pt-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search recipes..." />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {data?.data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
              <Icon name="restaurant_menu" size={40} className="opacity-30 mb-2" />
              <p className="text-body-md">No recipes found</p>
            </div>
          )}
          {data?.data.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onSelect(recipe.id)}
              className="w-full flex items-center gap-4 p-3 rounded-lg wireframe-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
            >
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center shrink-0">
                <Icon name="restaurant_menu" size={24} className="text-outline-variant/40" />
              </div>
              <div className="min-w-0">
                <p className="text-label-md font-semibold text-on-surface truncate">
                  {recipe.title}
                </p>
                <p className="text-label-sm text-on-surface-variant line-clamp-1">
                  {recipe.description || 'No description'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
