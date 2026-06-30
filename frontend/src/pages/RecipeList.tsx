import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecipes, useRecipeCategoryCounts } from '@/hooks/useRecipes'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { RecipeCategoryFilter } from '@/components/recipes/RecipeCategoryFilter'
import { RecipeDiscoveryCard } from '@/components/recipes/RecipeDiscoveryCard'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { RecipeCategoryEnum } from '@/lib/types'

export const RecipeList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedCategories, setSelectedCategories] = useState<RecipeCategoryEnum[]>([])
  const [showCategories, setShowCategories] = useState(false)
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
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-display font-bold text-ink mb-6">
          All recipes
        </h1>
        <p className="sr-only">Loading recipes...</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} tone="white" className="p-4 space-y-3">
              <div className="h-4 w-16 rounded-full skeleton-shimmer" />
              <div className="h-5 w-3/4 rounded skeleton-shimmer" />
              <div className="h-3 w-1/2 rounded skeleton-shimmer" />
            </Card>
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

  const recipes = data?.data ?? []
  const isEmpty = recipes.length === 0
  const total = data?.total ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-display font-bold text-ink">
            All recipes
          </h1>
          <p className="text-body-lg text-muted-foreground">
            {total} {total === 1 ? 'recipe' : 'recipes'} saved
          </p>
        </div>
        <Link
          to="/recipes/new"
          className="hidden md:inline-flex items-center gap-2 shrink-0 bg-ink text-cream px-5 h-12 rounded-full text-label-md font-semibold hover:-translate-y-px hover:ambient-shadow transition-all"
        >
          <Icon name="add" size={20} className="text-lime" />
          New recipe
        </Link>
      </header>

      {/* Search with tune/filter toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search recipes..." />
        </div>
        <button
          type="button"
          onClick={() => setShowCategories((v) => !v)}
          aria-pressed={showCategories}
          aria-label="Toggle category filters"
          className={cn(
            'w-14 h-14 flex items-center justify-center rounded-full transition-colors shrink-0',
            showCategories || selectedCategories.length > 0
              ? 'bg-ink text-cream'
              : 'bg-white text-muted-foreground border border-border hover:bg-surface-container'
          )}
        >
          <Icon name="tune" size={22} />
        </button>
      </div>

      {/* Category filter chips (revealed via the tune control) */}
      {(showCategories || selectedCategories.length > 0) && (
        <RecipeCategoryFilter
          selected={selectedCategories}
          onToggle={toggleCategory}
          counts={categoryCounts}
          className="mt-4"
        />
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Card tone="white" className="w-full max-w-sm p-12 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-lime flex items-center justify-center">
              <Icon name="restaurant_menu" size={36} className="text-ink" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-headline-md font-display font-bold text-ink">
                Your kitchen awaits
              </p>
              <p className="text-body-md text-muted-foreground">
                Add your first recipe and start building your collection.
              </p>
            </div>
            <Link
              to="/recipes/new"
              className="bg-ink text-cream px-6 py-2.5 rounded-full text-label-md font-semibold hover:-translate-y-px hover:ambient-shadow transition-all"
            >
              Create a recipe
            </Link>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6 stagger-grid">
            {recipes.map((recipe) => (
              <RecipeDiscoveryCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          <Pagination total={total} limit={limit} page={page} onPageChange={setPage} />
        </>
      )}

      {/* Create FAB — stacked above the global My List launcher */}
      <Link
        to="/recipes/new"
        className="fixed bottom-36 right-4 md:bottom-24 z-40 px-6 py-4 bg-lime text-ink rounded-full ambient-shadow flex items-center gap-2 hover:-translate-y-px active:scale-95 transition-all"
      >
        <Icon name="add" size={20} />
        <span className="text-label-md font-semibold">Create Recipe</span>
      </Link>
    </div>
  )
}
