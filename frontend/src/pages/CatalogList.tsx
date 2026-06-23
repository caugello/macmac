import { useState, useCallback } from 'react'
import { useCatalog, useCatalogCategories } from '@/hooks/useCatalog'
import { CatalogProductCard } from '@/components/catalog/CatalogProductCard'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { FilterChips } from '@/components/shared/FilterChips'
import { Icon } from '@/components/ui/icon'

const ALL_PRODUCTS = 'All Products'

export const CatalogList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [activeCategory, setActiveCategory] = useState(ALL_PRODUCTS)
  const limit = 20

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(0)
  }, [])

  const categoryParam = activeCategory === ALL_PRODUCTS ? undefined : activeCategory

  const { data: categoriesData } = useCatalogCategories()
  const { data, isLoading, error } = useCatalog({
    limit,
    offset: page * limit,
    search: search || undefined,
    category: categoryParam,
  })

  const categories = [ALL_PRODUCTS, ...(categoriesData?.categories ?? [])]

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat)
    setPage(0)
  }, [])

  // Editorial intro lifted from the Stitch "Catalog - Ivory Flux" header.
  const header = (
    <header className="mb-6">
      <h1 className="text-headline-lg-mobile md:text-headline-lg font-heading font-bold">
        Catalog
      </h1>
      <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl">
        Discover premium selections curated for your kitchen. Ethereal design meets practical
        utility.
      </p>
    </header>
  )

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
        {header}
        <SearchBar value="" onChange={() => {}} placeholder="Search products..." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-gutter mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest wireframe-border rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-square skeleton-shimmer" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 skeleton-shimmer rounded" />
                <div className="h-5 w-full skeleton-shimmer rounded" />
                <div className="h-4 w-2/3 skeleton-shimmer rounded" />
                <div className="h-6 w-20 skeleton-shimmer rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
        <p className="sr-only">Loading catalog...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32 flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Error loading catalog. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
      {header}

      {/* Search with Filters button — matches the Stitch "tune Filters" affordance */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search products..."
          />
        </div>
        <button
          type="button"
          className="w-14 h-14 flex items-center justify-center rounded-lg wireframe-border bg-surface-container-lowest hover:bg-surface-container-low transition-colors shrink-0"
          aria-label="Filters"
        >
          <Icon name="tune" size={22} className="text-on-surface-variant" />
        </button>
      </div>

      {categories.length > 1 && (
        <FilterChips
          items={categories}
          activeItem={activeCategory}
          onItemChange={handleCategoryChange}
          className="mt-4"
        />
      )}

      {data && data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-primary/5 to-transparent p-12 flex flex-col items-center gap-5 border border-outline-variant/50">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="inventory_2" size={36} className="text-primary" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-headline-md font-heading font-semibold">Nothing here yet</p>
              <p className="text-body-md text-on-surface-variant">
                Products will appear here once the catalog is populated.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-gutter mt-6 stagger-grid">
            {data?.data.map((item) => (
              <CatalogProductCard key={item.id} item={item} />
            ))}
          </div>

          <Pagination total={data?.total || 0} limit={limit} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
