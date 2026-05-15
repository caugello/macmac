import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trash2, Pencil } from 'lucide-react'

export const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading, error } = useRecipe(id!)
  const deleteRecipe = useDeleteRecipe()

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    deleteRecipe.mutate(id!, {
      onSuccess: () => navigate('/recipes'),
      onError: () => alert('Failed to delete recipe'),
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400">Loading recipe...</p>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-400">Recipe not found.</p>
        <Button asChild className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold">
          <Link to="/recipes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipes
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          asChild
          className="text-gray-300 hover:text-white hover:bg-gray-800"
        >
          <Link to="/recipes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            asChild
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <Link to={`/recipes/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteRecipe.isPending}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-bold mb-2 text-white">{recipe.title}</h1>
        {recipe.description && <p className="text-lg text-gray-400">{recipe.description}</p>}
      </div>

      <Card className="bg-[#141824] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-[#00CEB8]/20 text-[#00CEB8] border-[#00CEB8]/30"
                >
                  {ing.qty} {ing.unit}
                </Badge>
                <span className="text-gray-300">{ing.catalog_item_name}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recipe.steps && recipe.steps.length > 0 && (
        <Card className="bg-[#141824] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 list-decimal list-inside">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-gray-400">
                  <span className="text-gray-300 ml-2">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-gray-500">
        <p>Created: {new Date(recipe.created_at).toLocaleDateString()}</p>
        <p>Last updated: {new Date(recipe.updated_at).toLocaleDateString()}</p>
      </div>
    </div>
  )
}
