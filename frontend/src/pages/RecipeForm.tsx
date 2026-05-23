import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCreateRecipe, useUpdateRecipe, useRecipe } from '@/hooks/useRecipes'
import { type IngredientCreate, type CatalogItemOut } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { IngredientEditor } from '@/components/recipes/IngredientEditor'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/use-toast'

export const RecipeForm = () => {
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState<
    (IngredientCreate & { _catalog_item?: CatalogItemOut })[]
  >([])
  const [stepsText, setStepsText] = useState('')

  const navigate = useNavigate()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const { data: existingRecipe, isLoading } = useRecipe(id || '')
  const { toast } = useToast()

  useEffect(() => {
    if (existingRecipe) {
      setTitle(existingRecipe.title)
      setDescription(existingRecipe.description || '')
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
      toast('Please add at least one ingredient', 'error')
      return
    }

    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const cleanIngredients: IngredientCreate[] = ingredients.map(
      ({ catalog_item_id, qty, unit }) => ({
        catalog_item_id,
        qty,
        unit,
      })
    )

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
          onSuccess: () => {
            toast('Recipe updated', 'success')
            navigate(`/recipes/${id}`)
          },
          onError: (error) => {
            console.error('Failed to update recipe:', error)
            toast('Failed to update recipe. Please try again.', 'error')
          },
        }
      )
    } else {
      createRecipe.mutate(recipeData, {
        onSuccess: () => {
          toast('Recipe created', 'success')
          navigate('/recipes')
        },
        onError: (error) => {
          console.error('Failed to create recipe:', error)
          toast('Failed to create recipe. Please try again.', 'error')
        },
      })
    }
  }

  if (isEditMode && isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-12 pt-6 pb-12">
        <div className="h-8 w-48 rounded skeleton-shimmer mb-8" />
        <div className="aspect-video rounded-lg skeleton-shimmer mb-8" />
        <div className="space-y-4">
          <div className="h-14 rounded skeleton-shimmer" />
          <div className="h-24 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-12 pt-6 pb-12">
      <h1 className="text-headline-xl font-heading font-bold mb-8">
        {isEditMode ? 'Edit Recipe' : 'Create Recipe'}
      </h1>

      {/* Image placeholder */}
      <div className="w-full aspect-square sm:aspect-video rounded-lg dashed-outline bg-surface-container-low flex flex-col items-center justify-center gap-2 cursor-pointer mb-8 hover:bg-surface-container transition-colors">
        <Icon name="add_a_photo" size={48} className="text-on-surface-variant/40" />
        <span className="text-label-md text-on-surface-variant">Add a photo</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Information */}
        <div className="bg-surface-container-lowest wireframe-border rounded-lg p-6">
          <h2 className="text-headline-md font-heading font-semibold mb-4">General Information</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-label-md font-semibold mb-2 text-on-surface"
              >
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
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-label-md font-semibold mb-2 text-on-surface"
              >
                Description
              </label>
              <Textarea
                id="description"
                placeholder="Describe your recipe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-surface-container-lowest wireframe-border rounded-lg p-6">
          <h2 className="text-headline-md font-heading font-semibold mb-4">Ingredients *</h2>
          <IngredientEditor ingredients={ingredients} onChange={setIngredients} />
        </div>

        {/* Steps */}
        <div className="bg-surface-container-lowest wireframe-border rounded-lg p-6">
          <h2 className="text-headline-md font-heading font-semibold mb-4">Steps</h2>
          <Textarea
            placeholder="Enter each step on a new line..."
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={6}
          />
          <p className="text-label-sm text-on-surface-variant mt-2">
            Enter each step on a new line. Leave blank if not needed.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={createRecipe.isPending || updateRecipe.isPending}
            className="w-full rounded-full h-14 text-lg font-semibold"
          >
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
            className="w-full rounded-full h-14 border-outline-variant"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
