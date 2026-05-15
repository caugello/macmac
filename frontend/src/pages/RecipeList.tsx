import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecipes } from '@/hooks/useRecipes'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { Plus } from 'lucide-react'

export const RecipeList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading, error } = useRecipes({ limit, offset: page * limit, search })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400">Loading recipes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">Error loading recipes. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Recipes</h1>
        <Button asChild className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold">
          <Link to="/recipes/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Recipe
          </Link>
        </Button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search recipes..." />

      {data && data.data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No recipes found.</p>
          <Button asChild className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold">
            <Link to="/recipes/new">Create your first recipe</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data.map((recipe) => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`}>
                <Card className="h-full bg-[#141824] border-gray-800 hover:border-[#00CEB8] transition-colors">
                  <CardHeader>
                    <CardTitle className="text-xl text-white">{recipe.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-gray-400">
                      {recipe.description || 'No description'}
                    </CardDescription>
                    <div className="pt-2 text-sm text-gray-500">
                      {recipe.ingredients.length} ingredient
                      {recipe.ingredients.length !== 1 ? 's' : ''}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination total={data?.total || 0} limit={limit} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
