import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '@/hooks/useCatalog'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

const categories = ['All', 'Dairy', 'Produce', 'Bakery', 'Meat', 'Beverages']

export const CatalogList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [activeCategory, setActiveCategory] = useState('All')
  const limit = 20

  const { data, isLoading, error } = useCatalog({ limit, offset: page * limit, search })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
        <h1 className="text-headline-xl font-heading font-bold mb-6">Product Catalog</h1>
        <SearchBar value="" onChange={() => {}} placeholder="Search products..." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest wireframe-border rounded-lg overflow-hidden flex flex-col"
            >
              <div className="aspect-square skeleton-shimmer" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 skeleton-shimmer rounded" />
                <div className="h-4 w-full skeleton-shimmer rounded" />
                <div className="h-4 w-2/3 skeleton-shimmer rounded" />
                <div className="h-3 w-12 skeleton-shimmer rounded mt-2" />
                <div className="flex items-center justify-between pt-3">
                  <div className="h-5 w-14 skeleton-shimmer rounded" />
                  <div className="h-9 w-9 skeleton-shimmer rounded-lg" />
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

      {/* Search with filter icon */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
        </div>
        <button className="w-14 h-14 flex items-center justify-center rounded-lg wireframe-border bg-surface-container-lowest hover:bg-surface-container-low transition-colors shrink-0">
          <Icon name="filter_list" size={22} className="text-on-surface-variant" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mt-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-full text-label-md font-medium whitespace-nowrap transition-colors',
              activeCategory === cat
                ? 'bg-primary text-on-primary'
                : 'bg-primary/5 text-on-surface-variant hover:bg-primary/10'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {data && data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="dashed-outline rounded-lg p-12 flex flex-col items-center gap-4">
            <Icon name="inventory_2" size={64} className="text-outline-variant/40" />
            <p className="text-on-surface-variant text-body-lg">No products found.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
            {data?.data.map((item) => (
              <Link key={item.id} to={`/catalog/${item.id}`} className="group">
                <div className="bg-surface-container-lowest wireframe-border rounded-lg overflow-hidden card-hover-shadow flex flex-col">
                  <div className="aspect-square relative overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Icon name="inventory_2" size={48} className="text-outline-variant/30" />
                    </div>
                    {item.promotion_until_date && (
                      <span className="absolute top-2 left-2 bg-primary-container text-on-primary-container text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Promo
                      </span>
                    )}
                    {item.nutriscore && (
                      <span
                        className={cn(
                          'absolute top-2 right-2 px-2 py-0.5 flex items-center justify-center font-bold text-xs rounded-full',
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
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    {item.brand && (
                      <span className="text-on-surface-variant text-[12px] font-medium">
                        {item.brand}
                      </span>
                    )}
                    <h3 className="text-label-md font-heading font-semibold leading-tight line-clamp-2 min-h-[2.8em]">
                      {item.canonical_name || item.raw_name}
                    </h3>
                    {item.net_quantity_value && item.net_quantity_unit && (
                      <span className="text-[12px] text-on-surface-variant">
                        {item.net_quantity_value}
                        {item.net_quantity_unit}
                      </span>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3">
                      {item.price ? (
                        <span className="font-bold text-primary">
                          &euro;{item.price.toFixed(2)}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        className="bg-secondary-container text-on-secondary-container p-2 rounded-lg active:scale-90 transition-transform"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Icon name="add_shopping_cart" size={18} />
                      </button>
                    </div>
                    {item.promotion_until_date && (
                      <span className="text-[10px] text-primary mt-1 font-medium">
                        Promo until {new Date(item.promotion_until_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="px-4 pb-3 flex gap-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                      {item.is_food ? 'Food' : 'Non-Food'}
                    </span>
                  </div>
                  <p className="sr-only">
                    {item.vendor_name}
                    {item.category && <span> &bull; {item.category}</span>}
                    {item.net_quantity_value && item.net_quantity_unit && (
                      <span>
                        {' '}
                        &bull; {item.net_quantity_value}
                        {item.net_quantity_unit}
                      </span>
                    )}
                    {item.price && <span> &bull; &euro;{item.price.toFixed(2)}</span>}
                  </p>
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
