import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '@/hooks/useCatalog'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { ExternalLink } from 'lucide-react'

export const CatalogList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading, error } = useCatalog({ limit, offset: page * limit, search })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400">Loading catalog...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">Error loading catalog. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Product Catalog</h1>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />

      {data && data.data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No products found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data.map((item) => (
              <Link key={item.id} to={`/catalog/${item.id}`}>
                <Card className="h-full bg-[#141824] border-gray-800 hover:border-[#00CEB8] transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg line-clamp-2 flex-1 text-white">
                        {item.canonical_name || item.raw_name}
                      </CardTitle>
                      <ExternalLink className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    </div>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <Badge className={item.is_food ? 'bg-[#00CEB8] text-black' : 'bg-gray-700 text-gray-300'}>
                        {item.is_food ? 'Food' : 'Non-Food'}
                      </Badge>
                      {item.brand && <Badge variant="outline" className="border-gray-700 text-gray-300">{item.brand}</Badge>}
                      {item.category && <Badge className="bg-gray-700 text-gray-300">{item.category}</Badge>}
                    </div>
                    <CardDescription className="text-sm text-gray-400">
                      {item.vendor_name}
                      {item.net_quantity_value && item.net_quantity_unit && (
                        <span className="ml-2">
                          • {item.net_quantity_value}
                          {item.net_quantity_unit}
                        </span>
                      )}
                      {item.price && (
                        <span className="ml-2 font-semibold text-[#00CEB8]">
                          • €{item.price.toFixed(2)}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            total={data?.total || 0}
            limit={limit}
            page={page}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
