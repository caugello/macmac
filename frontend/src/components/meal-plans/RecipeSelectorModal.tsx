import { useState } from 'react'
import { useRecipes } from '@/hooks/useRecipes'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchBar } from '@/components/shared/SearchBar'
import { X } from 'lucide-react'

interface RecipeSelectorModalProps {
  onSelect: (recipeId: string) => void
  onClose: () => void
}

export const RecipeSelectorModal = ({ onSelect, onClose }: RecipeSelectorModalProps) => {
  const [search, setSearch] = useState('')
  const { data } = useRecipes({ limit: 20, search })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0f1419] border border-gray-700 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Select Recipe</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search recipes..." />

        <div className="mt-4 space-y-2">
          {data?.data.map((recipe) => (
            <Card
              key={recipe.id}
              className="bg-[#141824] border-gray-800 hover:border-[#00CEB8] cursor-pointer"
              onClick={() => onSelect(recipe.id)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-base text-white">{recipe.title}</CardTitle>
                {recipe.description && (
                  <p className="text-sm text-gray-400 mt-1">{recipe.description}</p>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
