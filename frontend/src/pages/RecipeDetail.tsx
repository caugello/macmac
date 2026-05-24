import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/use-toast'

export const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading, error } = useRecipe(id!)
  const deleteRecipe = useDeleteRecipe()
  const { toast, confirm } = useToast()

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete recipe?',
      message:
        'This action cannot be undone. The recipe and all its data will be permanently removed.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return

    deleteRecipe.mutate(id!, {
      onSuccess: () => {
        toast('Recipe deleted', 'success')
        navigate('/recipes')
      },
      onError: () => toast('Failed to delete recipe', 'error'),
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-12 pt-6 pb-12">
        <div className="aspect-video w-full rounded-lg skeleton-shimmer mb-6" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 rounded skeleton-shimmer" />
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-1/2 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-12 pt-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Icon name="error_outline" size={48} className="text-outline-variant/40" />
        <p className="text-on-surface-variant text-body-lg">Recipe not found.</p>
        <Button asChild variant="outline" className="border-outline-variant rounded-full">
          <Link to="/recipes">
            <Icon name="arrow_back" size={16} className="mr-2" />
            Back to Recipes
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-12 pt-6 pb-12 space-y-8">
      {/* Hero image placeholder */}
      <div className="aspect-video w-full rounded-lg overflow-hidden wireframe-border relative max-w-3xl">
        <div className="w-full h-full bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center">
          <Icon name="restaurant_menu" size={64} className="text-outline-variant/20" />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          asChild
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
        >
          <Link to="/recipes">
            <Icon name="arrow_back" size={16} className="mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            asChild
            className="border-outline-variant text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
          >
            <Link to={`/recipes/${id}/edit`}>
              <Icon name="edit" size={16} className="mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteRecipe.isPending}>
            <Icon name="delete" size={16} className="mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Title and description */}
      <div>
        <h1 className="text-headline-xl font-heading font-bold mb-2">{recipe.title}</h1>
        {recipe.description && (
          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            {recipe.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-4 text-label-sm text-on-surface-variant">
          {recipe.servings != null && (
            <span className="flex items-center gap-1">
              <Icon name="group" size={16} />
              {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon name="shopping_basket" size={16} />
            {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
          </span>
          {recipe.steps && recipe.steps.length > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="format_list_numbered" size={16} />
              {recipe.steps.length} step{recipe.steps.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Two-column layout: ingredients sidebar + steps */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 lg:gap-8">
        {/* Ingredients */}
        <div className="lg:sticky lg:top-20 lg:self-start bg-surface-container-low rounded-lg wireframe-border p-6 space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="shopping_basket" size={24} className="text-primary" />
            <h2 className="text-headline-md font-heading font-semibold">Ingredients</h2>
          </div>
          {recipe.ingredients.map((ing, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-3 border-b border-outline-variant/50 last:border-b-0"
            >
              <input
                type="checkbox"
                className="w-6 h-6 rounded border-outline text-primary focus:ring-primary accent-primary shrink-0"
              />
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-label-md font-semibold whitespace-nowrap">
                {ing.qty} {ing.unit}
              </span>
              <span className="text-on-surface">{ing.catalog_item_name}</span>
            </div>
          ))}
        </div>

        {/* Steps */}
        {recipe.steps && recipe.steps.length > 0 ? (
          <div className="space-y-0">
            <div className="flex items-center gap-2 mb-6">
              <Icon name="restaurant" size={24} className="text-primary" />
              <h2 className="text-headline-md font-heading font-semibold">Steps</h2>
            </div>
            {recipe.steps.map((step, i) => (
              <div key={i}>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    {i < recipe.steps!.length - 1 && (
                      <div className="w-0.5 flex-1 bg-outline-variant mt-2" />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className="text-label-md font-semibold text-on-surface uppercase tracking-wider mb-1">
                      Step {i + 1}
                    </p>
                    <p className="text-body-md text-on-surface-variant">{step}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Meta footer */}
      <div className="dashed-outline rounded-lg p-4 flex items-center justify-between text-label-sm text-on-surface-variant">
        <span>Created: {new Date(recipe.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(recipe.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
