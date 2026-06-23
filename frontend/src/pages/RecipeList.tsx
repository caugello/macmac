import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecipes, useRecipeCategoryCounts } from '@/hooks/useRecipes'
import { FilterChips } from '@/components/shared/FilterChips'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { RecipeCategoryFilter } from '@/components/recipes/RecipeCategoryFilter'
import { CategoryBadge } from '@/components/recipes/CategoryBadge'
import { Icon } from '@/components/ui/icon'
import { RecipeCategoryEnum } from '@/lib/types'

const filterChips = ['All', 'Ingredients', 'Vegetarian', 'Quick']
const sortOptions = ['Newest', 'A-Z', 'Z-A']

const cardHues = [15, 25, 35, 140, 30, 45, 10, 200, 50, 20]
const getCardHue = (title: string) => {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return cardHues[Math.abs(hash) % cardHues.length]
}

export const RecipeList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedCategories, setSelectedCategories] = useState<RecipeCategoryEnum[]>([])
  const [showSort, setShowSort] = useState(false)
  const [activeSort, setActiveSort] = useState('Newest')
  const limit = 20

  const categoryParam = selectedCategories.length > 0 ? selectedCategories.join(',') : undefined

  const { data, isLoading, error } = useRecipes({
    limit,
    offset: page * limit,
    search,
    category: categoryParam,
  })

  // Server-side counts (scoped to the current search) so chips stay accurate
  // regardless of how many recipes the user has and stable as categories toggle.
  const { data: countData } = useRecipeCategoryCounts({ search })
  const categoryCounts = countData?.counts ?? {}

  const toggleCategory = (category: RecipeCategoryEnum) => {
    setPage(0)
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
        <h1 className="text-headline-lg font-heading font-bold mb-6">Recipes</h1>
        <p className="sr-only">Loading recipes...</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-surface-container-lowest wireframe-border rounded-xl overflow-hidden"
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
      <h1 className="text-headline-lg font-heading font-bold mb-6">Recipes</h1>

      {/* Search with filter icon */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search recipes..." />
        </div>
        <button className="w-14 h-14 flex items-center justify-center rounded-lg wireframe-border bg-surface-container-lowest hover:bg-surface-container-low transition-colors shrink-0">
          <Icon name="filter_list" size={22} className="text-on-surface-variant" />
        </button>
      </div>

      {/* Category filter chips */}
      <RecipeCategoryFilter
        selected={selectedCategories}
        onToggle={toggleCategory}
        counts={categoryCounts}
        className="mt-4"
      />

      {/* Filter pills + sort */}
      <div className="flex items-start gap-2 mt-4">
        <FilterChips
          items={filterChips}
          activeItem={activeFilter}
          onItemChange={setActiveFilter}
          className="flex-1 min-w-0"
        />

        {/* Sort button */}
        <div className="shrink-0 relative pt-3">
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
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-primary/5 to-transparent p-12 flex flex-col items-center gap-5 border border-outline-variant/50">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="restaurant_menu" size={36} className="text-primary" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-headline-md font-heading font-semibold">Your kitchen awaits</p>
              <p className="text-body-md text-on-surface-variant">
                Add your first recipe and start building your collection.
              </p>
            </div>
            <Link
              to="/recipes/new"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-label-md font-semibold hover:brightness-110 transition-all"
            >
              Create a recipe
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 mt-6 stagger-grid">
            {data?.data.map((recipe) => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="group">
                <div className="bg-surface-container-lowest wireframe-border rounded-xl overflow-hidden card-hover-shadow">
                  <div className="aspect-square relative overflow-hidden">
                    <div
                      className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500"
                      style={{
                        background: `linear-gradient(135deg, hsl(${getCardHue(recipe.title)} 40% 92%) 0%, hsl(${getCardHue(recipe.title)} 30% 85%) 100%)`,
                      }}
                    >
                      <Icon name="restaurant_menu" size={48} className="text-outline-variant/30" />
                    </div>
                    <CategoryBadge
                      category={recipe.category}
                      className="absolute top-2 left-2 backdrop-blur-sm"
                    />
                    <span className="absolute bottom-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm text-primary text-sm md:text-caption px-2 py-1 rounded-full border border-outline-variant">
                      {recipe.ingredients.length} ingredient
                      {recipe.ingredients.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-label-md font-heading font-semibold text-on-surface line-clamp-2 min-h-[2.8em]">
                      {recipe.title}
                    </h3>
                    {recipe.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {recipe.ingredients.slice(0, 3).map((ing, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant"
                          >
                            {ing.catalog_item_name}
                          </span>
                        ))}
                        {recipe.ingredients.length > 3 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                            +{recipe.ingredients.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/30">
                      <span className="text-sm md:text-caption text-on-surface-variant">
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
        className="fixed bottom-32 right-6 md:bottom-12 md:right-12 z-40 px-6 py-4 bg-primary text-on-primary rounded-xl shadow-lg flex items-center gap-2 hover:shadow-xl active:scale-95 transition-all"
      >
        <Icon name="add" size={20} />
        <span className="font-label-md">Create Recipe</span>
      </Link>
    </div>
  )
}
