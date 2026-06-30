import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/use-toast'
import { getDifficultyLabel, formatPrepTime } from '@/lib/recipeDifficulty'
import { getCategoryMeta } from '@/lib/recipeCategory'

interface QuickStat {
  icon: string
  label: string
  value: string
  tone: 'white' | 'lime' | 'ink' | 'coral' | 'soft-purple'
}

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
      <div className="max-w-5xl mx-auto px-4 md:px-12 pt-6 pb-32">
        <div className="aspect-video w-full rounded-bento skeleton-shimmer mb-6 max-w-3xl" />
        <div className="space-y-4">
          <div className="h-10 w-2/3 rounded-bento skeleton-shimmer" />
          <div className="h-4 w-full rounded-full skeleton-shimmer" />
          <div className="h-4 w-1/2 rounded-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-12 pt-6 pb-32 flex items-center justify-center min-h-[400px]">
        <Card tone="white" className="w-full max-w-sm p-12 flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-soft-purple flex items-center justify-center">
            <Icon name="error_outline" size={36} className="text-ink" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-headline-md font-display font-bold text-ink">Recipe not found.</p>
            <p className="text-body-md text-muted-foreground">
              This recipe may have been removed or never existed.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/recipes">
              <Icon name="arrow_back" size={16} className="mr-2" />
              Back to Recipes
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  const quickStats: QuickStat[] = []
  if (recipe.prep_time != null) {
    quickStats.push({
      icon: 'schedule',
      label: 'Prep time',
      value: formatPrepTime(recipe.prep_time),
      tone: 'lime',
    })
  }
  if (recipe.calories != null) {
    quickStats.push({
      icon: 'local_fire_department',
      label: 'Calories',
      value: `${recipe.calories} kcal`,
      tone: 'coral',
    })
  }
  if (recipe.difficulty != null) {
    quickStats.push({
      icon: 'bar_chart',
      label: 'Difficulty',
      value: getDifficultyLabel(recipe.difficulty),
      tone: 'white',
    })
  }
  if (recipe.servings != null) {
    quickStats.push({
      icon: 'group',
      label: 'Servings',
      value: `${recipe.servings} serving${recipe.servings !== 1 ? 's' : ''}`,
      tone: 'white',
    })
  }
  quickStats.push({
    icon: 'shopping_basket',
    label: 'Ingredients',
    value: `${recipe.ingredients.length} item${recipe.ingredients.length !== 1 ? 's' : ''}`,
    tone: 'soft-purple',
  })
  if (recipe.steps && recipe.steps.length > 0) {
    quickStats.push({
      icon: 'format_list_numbered',
      label: 'Steps',
      value: `${recipe.steps.length} step${recipe.steps.length !== 1 ? 's' : ''}`,
      tone: 'ink',
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-12 pt-6 pb-32 space-y-8">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/recipes">
            <Icon name="arrow_back" size={16} className="mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
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

      {/* Hero image (falls back to placeholder when no image) */}
      <div className="aspect-video w-full rounded-bento overflow-hidden relative">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-lime flex items-center justify-center">
            <Icon name="restaurant_menu" size={72} className="text-ink/30" />
          </div>
        )}
      </div>

      {/* Title and description */}
      <div>
        {recipe.category && (
          <p className="text-label-md font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {getCategoryMeta(recipe.category).label}
          </p>
        )}
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-display font-bold text-ink mb-2">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="text-body-lg text-muted-foreground leading-relaxed max-w-2xl">
            {recipe.description}
          </p>
        )}
      </div>

      {/* Quick-stats bento row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {quickStats.map((stat) => (
          <Card
            key={stat.label}
            tone={stat.tone}
            className="p-4 flex flex-col gap-2 min-h-[96px] justify-between"
          >
            <Icon name={stat.icon} size={24} />
            <div>
              <p className="text-caption uppercase tracking-wider opacity-70">{stat.label}</p>
              <p className="text-title-lg font-display font-bold leading-tight">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Two-column layout: ingredients sidebar + steps */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 lg:gap-8">
        {/* Ingredients checklist */}
        <Card tone="white" className="lg:sticky lg:top-20 lg:self-start p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-9 h-9 rounded-full bg-lime flex items-center justify-center shrink-0">
              <Icon name="shopping_basket" size={20} className="text-ink" />
            </span>
            <h2 className="text-headline-md font-display font-bold text-ink">Ingredients</h2>
          </div>
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                <label className="flex items-center gap-3 py-3 border-b border-border last:border-b-0 cursor-pointer min-h-[44px] group">
                  <span className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      className="peer appearance-none w-6 h-6 rounded-full border-2 border-ink/30 checked:border-ink checked:bg-ink transition-colors cursor-pointer"
                    />
                    <Icon
                      name="check"
                      size={16}
                      className="absolute text-cream opacity-0 peer-checked:opacity-100 pointer-events-none"
                    />
                  </span>
                  <span className="bg-lime text-ink rounded-full px-3 py-1 text-label-md font-bold whitespace-nowrap">
                    {ing.qty} {ing.unit}
                  </span>
                  <span className="text-ink peer-checked:line-through peer-checked:text-muted-foreground transition-colors">
                    {ing.catalog_item_name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Card>

        {/* Steps */}
        {recipe.steps && recipe.steps.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-9 h-9 rounded-full bg-coral flex items-center justify-center shrink-0">
                <Icon name="restaurant" size={20} className="text-white" />
              </span>
              <h2 className="text-headline-md font-display font-bold text-ink">Steps</h2>
            </div>
            <div className="space-y-0">
              {recipe.steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-ink text-cream flex items-center justify-center text-title-lg font-display font-bold shrink-0">
                      {i + 1}
                    </div>
                    {i < recipe.steps!.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-2" />
                    )}
                  </div>
                  <div className="pb-8 pt-1">
                    <p className="text-label-md font-bold text-ink uppercase tracking-wider mb-1">
                      Step {i + 1}
                    </p>
                    <p className="text-body-md text-muted-foreground">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Meta footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground px-1">
        <span>Created: {new Date(recipe.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(recipe.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
