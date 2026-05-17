import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog, useCatalogCategories } from '@/hooks/useCatalog'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

const ALL_PRODUCTS = 'All Products'

export const CatalogList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [activeCategory, setActiveCategory] = useState(ALL_PRODUCTS)
  const limit = 20

  const categoryParam = activeCategory === ALL_PRODUCTS ? undefined : activeCategory

  const { data: categoriesData } = useCatalogCategories()
  const { data, isLoading, error } = useCatalog({
    limit,
    offset: page * limit,
    search: search || undefined,
    category: categoryParam,
  })

  const categories = [ALL_PRODUCTS, ...(categoriesData?.categories ?? [])]

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setPage(0)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
        <h1 className="text-headline-xl font-heading font-bold mb-6">Product Catalog</h1>
        <SearchBar value="" onChange={() => {}} placeholder="Search products..." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 mt-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest wireframe-border rounded-lg overflow-hidden flex flex-col"
            >
              <div className="aspect-square skeleton-shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-16 skeleton-shimmer rounded" />
                <div className="h-4 w-full skeleton-shimmer rounded" />
                <div className="h-4 w-2/3 skeleton-shimmer rounded" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-5 w-14 skeleton-shimmer rounded" />
                  <div className="h-8 w-8 skeleton-shimmer rounded-full" />
                </div>
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
      <h1 className="text-headline-xl font-heading font-bold mb-6">Product Catalog</h1>

      <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />

      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 mt-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={cn(
                'px-4 py-2 rounded-full text-label-md font-medium whitespace-nowrap transition-colors',
                activeCategory === cat
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant wireframe-border hover:bg-surface-container'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {data && data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="dashed-outline rounded-lg p-12 flex flex-col items-center gap-4">
            <Icon name="inventory_2" size={64} className="text-outline-variant/40" />
            <p className="text-on-surface-variant text-body-lg">No products found.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 mt-4">
            {data?.data.map((item) => (
              <Link key={item.id} to={`/catalog/${item.id}`} className="group">
                <div className="bg-surface-container-lowest wireframe-border rounded-lg overflow-hidden card-hover-shadow flex flex-col h-full">
                  {/* Image area with nutri-score badge */}
                  <div className="aspect-square relative overflow-hidden">
                    {item.image_url ? (
                      <div className="w-full h-full bg-surface-container-low flex items-center justify-center p-3 group-hover:scale-105 transition-transform duration-500">
                        <img
                          src={item.image_url}
                          alt={item.canonical_name || item.raw_name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        <Icon name="inventory_2" size={48} className="text-outline-variant/30" />
                      </div>
                    )}
                    {item.nutriscore && (
                      <span
                        className={cn(
                          'absolute top-2 left-2 w-7 h-7 flex items-center justify-center font-bold text-xs rounded-lg',
                          {
                            'bg-nutri-a text-white': item.nutriscore.toLowerCase() === 'a',
                            'bg-nutri-b text-white': item.nutriscore.toLowerCase() === 'b',
                            'bg-nutri-c text-black': item.nutriscore.toLowerCase() === 'c',
                            'bg-nutri-d text-white': item.nutriscore.toLowerCase() === 'd',
                            'bg-nutri-e text-white': item.nutriscore.toLowerCase() === 'e',
                          }
                        )}
                      >
                        {item.nutriscore.toUpperCase()}
                      </span>
                    )}
                    {item.promotion_until_date && (
                      <span className="absolute top-2 right-2 bg-primary-container text-on-primary-container text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Promo
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-3 flex flex-col flex-grow">
                    {item.brand && (
                      <span className="text-on-surface-variant text-[11px] font-medium mb-0.5">
                        {item.brand}
                      </span>
                    )}
                    <h3 className="text-label-md font-heading font-semibold leading-tight line-clamp-2 min-h-[2.5em]">
                      {item.canonical_name || item.raw_name}
                    </h3>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      {item.price ? (
                        <span className="font-bold text-primary">
                          {item.price.toFixed(2)}&nbsp;&euro;
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        className="bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                        onClick={(e) => e.preventDefault()}
                        aria-label="Add to list"
                      >
                        <Icon name="add" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination total={data?.total || 0} limit={limit} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
