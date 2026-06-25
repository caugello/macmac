import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecipes, useRecipeCategoryCounts } from '@/hooks/useRecipes'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { RecipeCategoryFilter } from '@/components/recipes/RecipeCategoryFilter'
import { FeaturedRecipeCard } from '@/components/recipes/FeaturedRecipeCard'
import { RecipeDiscoveryCard } from '@/components/recipes/RecipeDiscoveryCard'
import { Icon } from '@/components/ui/icon'
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
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-heading font-bold mb-6">
          Recipes
        </h1>
        <p className="sr-only">Loading recipes...</p>
        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden ambient-shadow mb-8">
          <div className="grid md:grid-cols-2">
            <div className="aspect-[16/10] md:aspect-auto md:min-h-[20rem] skeleton-shimmer" />
            <div className="p-6 md:p-8 space-y-4">
              <div className="h-5 w-1/3 rounded bg-surface-container skeleton-shimmer" />
              <div className="h-6 w-2/3 rounded bg-surface-container skeleton-shimmer" />
              <div className="h-4 w-full rounded bg-surface-container skeleton-shimmer" />
              <div className="h-4 w-4/5 rounded bg-surface-container skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-surface-container-lowest rounded-2xl overflow-hidden ambient-shadow"
            >
              <div className="aspect-[4/3] skeleton-shimmer" />
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

  const recipes = data?.data ?? []
  const isEmpty = recipes.length === 0
  // Promote the first recipe to a hero card only on the unfiltered first page,
  // so paging/search/category results render as a uniform grid.
  const showFeatured =
    page === 0 && !search && selectedCategories.length === 0 && recipes.length > 0
  const featured = showFeatured ? recipes[0] : null
  const gridRecipes = showFeatured ? recipes.slice(1) : recipes

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
      <header className="mb-6 space-y-1.5">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-heading font-bold text-on-surface">
          Recipes
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Discover and cook from your collection.
        </p>
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
          className={`w-14 h-14 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
            showCategories || selectedCategories.length > 0
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
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
          {featured && (
            <section aria-label="Featured recipe" className="mt-6">
              <FeaturedRecipeCard recipe={featured} />
            </section>
          )}

          {gridRecipes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6 stagger-grid">
              {gridRecipes.map((recipe) => (
                <RecipeDiscoveryCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}

          <Pagination total={data?.total || 0} limit={limit} page={page} onPageChange={setPage} />
        </>
      )}

      {/* FAB */}
      <Link
        to="/recipes/new"
        className="fixed bottom-36 right-4 md:bottom-24 md:right-4 z-40 px-6 py-4 bg-primary text-on-primary rounded-xl shadow-lg flex items-center gap-2 hover:shadow-xl active:scale-95 transition-all"
      >
        <Icon name="add" size={20} />
        <span className="font-label-md">Create Recipe</span>
      </Link>
    </div>
  )
}
