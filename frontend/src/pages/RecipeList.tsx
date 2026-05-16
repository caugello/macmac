import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecipes } from '@/hooks/useRecipes'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { Icon } from '@/components/ui/icon'

const filterChips = ['All', 'Ingredients', 'Vegetarian', 'Quick']
const sortOptions = ['Newest', 'A-Z', 'Z-A']

export const RecipeList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [activeFilter, setActiveFilter] = useState('All')
  const [showSort, setShowSort] = useState(false)
  const [activeSort, setActiveSort] = useState('Newest')
  const limit = 20

  const { data, isLoading, error } = useRecipes({ limit, offset: page * limit, search })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
        <h1 className="text-headline-xl font-heading font-bold mb-6">Recipes</h1>
        <p className="sr-only">Loading recipes...</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-surface-container-lowest wireframe-border rounded-lg overflow-hidden"
            >
              <div className="aspect-square skeleton-shimmer" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-surface-container skeleton-shimmer" />
                <div className="h-3 w-full rounded bg-surface-container skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded bg-surface-container skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32 flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Error loading recipes. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
      <h1 className="text-headline-xl font-heading font-bold mb-6">Recipes</h1>

      {/* Search with filter icon */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search recipes..." />
        </div>
        <button className="w-14 h-14 flex items-center justify-center rounded-lg wireframe-border bg-surface-container-lowest hover:bg-surface-container-low transition-colors shrink-0">
          <Icon name="filter_list" size={22} className="text-on-surface-variant" />
        </button>
      </div>

      {/* Filter pills + sort */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mt-4">
        {filterChips.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className={`px-4 py-2 rounded-full text-label-md font-medium whitespace-nowrap transition-colors ${
              activeFilter === chip
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {chip}
          </button>
        ))}

        {/* Sort button */}
        <div className="ml-auto shrink-0 relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-label-md font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            {activeSort}
            <Icon name="expand_more" size={18} />
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest wireframe-border rounded-lg shadow-lg z-20 min-w-[120px]">
              {sortOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setActiveSort(opt)
                    setShowSort(false)
                  }}
                  className={`block w-full text-left px-4 py-2.5 text-label-md transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    activeSort === opt
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {data && data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-full max-w-sm dashed-outline rounded-lg p-12 flex flex-col items-center gap-4">
            <Icon name="restaurant_menu" size={64} className="text-outline-variant/40" />
            <p className="text-on-surface-variant text-body-lg">No recipes found.</p>
            <Link
              to="/recipes/new"
              className="text-primary font-semibold text-label-md hover:underline"
            >
              Create your first recipe
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {data?.data.map((recipe) => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="group">
                <div className="bg-surface-container-lowest wireframe-border rounded-lg overflow-hidden card-hover-shadow">
                  <div className="aspect-square relative overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Icon name="restaurant_menu" size={48} className="text-outline-variant/30" />
                    </div>
                    <span className="absolute bottom-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm text-primary text-label-sm px-2 py-1 rounded-full border border-outline-variant">
                      {recipe.ingredients.length} ingredient
                      {recipe.ingredients.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-label-md font-heading font-semibold text-on-surface line-clamp-2 min-h-[2.8em]">
                      {recipe.title}
                    </h3>
                    <p className="text-label-sm text-on-surface-variant line-clamp-2 mt-1">
                      {recipe.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/30">
                      <span className="text-label-sm text-on-surface-variant">
                        {new Date(recipe.created_at).toLocaleDateString()}
                      </span>
                      <Icon name="favorite" size={18} className="text-outline-variant" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination total={data?.total || 0} limit={limit} page={page} onPageChange={setPage} />
        </>
      )}

      {/* FAB */}
      <Link
        to="/recipes/new"
        className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-40 px-6 py-4 bg-primary text-on-primary rounded-xl shadow-lg flex items-center gap-2 hover:shadow-xl active:scale-95 transition-all"
      >
        <Icon name="add" size={20} />
        <span className="font-label-md">Create Recipe</span>
      </Link>
    </div>
  )
}
