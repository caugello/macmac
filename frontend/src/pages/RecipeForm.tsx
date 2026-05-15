import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCreateRecipe, useUpdateRecipe, useRecipe } from '@/hooks/useRecipes'
import { type IngredientCreate, type CatalogItemOut } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { IngredientEditor } from '@/components/recipes/IngredientEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const RecipeForm = () => {
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState<(IngredientCreate & { _catalog_item?: CatalogItemOut })[]>([])
  const [stepsText, setStepsText] = useState('')

  const navigate = useNavigate()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const { data: existingRecipe, isLoading } = useRecipe(id || '')

  // Load existing recipe data when in edit mode
  useEffect(() => {
    if (existingRecipe) {
      setTitle(existingRecipe.title)
      setDescription(existingRecipe.description || '')
      // Convert IngredientOut to IngredientCreate with display data
      setIngredients(
        existingRecipe.ingredients.map((ing) => ({
          catalog_item_id: ing.catalog_item_id,
          qty: ing.qty,
          unit: ing.unit,
          _catalog_item: {
            id: ing.catalog_item_id,
            canonical_name: ing.catalog_item_name,
            raw_name: ing.catalog_item_name,
          } as CatalogItemOut,
        }))
      )
      setStepsText(existingRecipe.steps?.join('\n') || '')
    }
  }, [existingRecipe])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (ingredients.length === 0) {
      alert('Please add at least one ingredient')
      return
    }

    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    // Strip _catalog_item helper before submitting
    const cleanIngredients: IngredientCreate[] = ingredients.map(({ catalog_item_id, qty, unit }) => ({
      catalog_item_id,
      qty,
      unit,
    }))

    const recipeData = {
      title,
      description: description || undefined,
      ingredients: cleanIngredients,
      steps: steps.length > 0 ? steps : undefined,
    }

    if (isEditMode && id) {
      updateRecipe.mutate(
        { id, data: recipeData },
        {
          onSuccess: () => navigate(`/recipes/${id}`),
          onError: (error) => {
            console.error('Failed to update recipe:', error)
            alert('Failed to update recipe. Please try again.')
          },
        }
      )
    } else {
      createRecipe.mutate(recipeData, {
        onSuccess: () => navigate('/recipes'),
        onError: (error) => {
          console.error('Failed to create recipe:', error)
          alert('Failed to create recipe. Please try again.')
        },
      })
    }
  }

  if (isEditMode && isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400">Loading recipe...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-white">{isEditMode ? 'Edit Recipe' : 'Create Recipe'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-[#141824] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2 text-gray-300">
                Recipe Title *
              </label>
              <Input
                id="title"
                placeholder="e.g., Chocolate Chip Cookies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={2}
                maxLength={200}
                className="bg-[#0a0e1a] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2 text-gray-300">
                Description
              </label>
              <Textarea
                id="description"
                placeholder="Describe your recipe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-[#0a0e1a] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#141824] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Ingredients *</CardTitle>
          </CardHeader>
          <CardContent>
            <IngredientEditor ingredients={ingredients} onChange={setIngredients} />
          </CardContent>
        </Card>

        <Card className="bg-[#141824] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter each step on a new line..."
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              rows={6}
              className="bg-[#0a0e1a] border-gray-700 text-white placeholder:text-gray-500"
            />
            <p className="text-sm text-gray-400 mt-2">
              Enter each step on a new line. Leave blank if not needed.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={createRecipe.isPending || updateRecipe.isPending} className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold">
            {isEditMode
              ? updateRecipe.isPending
                ? 'Updating...'
                : 'Update Recipe'
              : createRecipe.isPending
              ? 'Creating...'
              : 'Create Recipe'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEditMode ? `/recipes/${id}` : '/recipes')}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
