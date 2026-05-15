import { useParams, Link } from 'react-router-dom'
import { useCatalogItem } from '@/hooks/useCatalog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const CatalogDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading, error } = useCatalogItem(id!)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400">Loading product...</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-400">Product not found.</p>
        <Button asChild className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold">
          <Link to="/catalog">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalog
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <Button variant="ghost" asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
        <Link to="/catalog">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalog
        </Link>
      </Button>

      <div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Badge className={item.is_food ? 'bg-[#00CEB8] text-black' : 'bg-gray-700 text-gray-300'}>
            {item.is_food ? 'Food' : 'Non-Food'}
          </Badge>
          {item.brand && <Badge variant="outline" className="border-gray-700 text-gray-300">{item.brand}</Badge>}
          {item.category && <Badge className="bg-gray-700 text-gray-300">{item.category}</Badge>}
        </div>
        <h1 className="text-4xl font-bold mb-2 text-white">
          {item.canonical_name || item.raw_name}
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-lg text-gray-400">{item.vendor_name}</p>
          {item.price && (
            <p className="text-2xl font-bold text-[#00CEB8]">€{item.price.toFixed(2)}</p>
          )}
        </div>
      </div>

      <Card className="bg-[#141824] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Raw Name</p>
            <p className="text-gray-300">{item.raw_name}</p>
          </div>

          {item.canonical_name && (
            <div>
              <p className="text-sm font-medium text-gray-500">Canonical Name</p>
              <p className="text-gray-300">{item.canonical_name}</p>
            </div>
          )}

          {item.normalized_name && (
            <div>
              <p className="text-sm font-medium text-gray-500">Normalized Name</p>
              <p className="font-mono text-sm text-gray-300">{item.normalized_name}</p>
            </div>
          )}

          {item.net_quantity_value && item.net_quantity_unit && (
            <div>
              <p className="text-sm font-medium text-gray-500">Quantity</p>
              <p className="text-gray-300">
                {item.net_quantity_value} {item.net_quantity_unit}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Product URL</p>
            <Button variant="outline" asChild className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
              <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                View on Vendor Site
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {item.nutrition && (
        <Card className="bg-[#141824] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Nutritional Information (per 100g)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {item.nutrition.energy_kcal && (
                <div>
                  <p className="text-sm text-gray-500">Energy</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.energy_kcal} kcal</p>
                </div>
              )}
              {item.nutrition.protein_g && (
                <div>
                  <p className="text-sm text-gray-500">Protein</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.protein_g}g</p>
                </div>
              )}
              {item.nutrition.carbs_g && (
                <div>
                  <p className="text-sm text-gray-500">Carbohydrates</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.carbs_g}g</p>
                </div>
              )}
              {item.nutrition.sugars_g !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">Sugars</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.sugars_g}g</p>
                </div>
              )}
              {item.nutrition.fat_g && (
                <div>
                  <p className="text-sm text-gray-500">Fat</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.fat_g}g</p>
                </div>
              )}
              {item.nutrition.saturated_fat_g !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">Saturated Fat</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.saturated_fat_g}g</p>
                </div>
              )}
              {item.nutrition.fiber_g && (
                <div>
                  <p className="text-sm text-gray-500">Fiber</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.fiber_g}g</p>
                </div>
              )}
              {item.nutrition.salt_g !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">Salt</p>
                  <p className="text-lg font-semibold text-white">{item.nutrition.salt_g}g</p>
                </div>
              )}
            </div>
            {item.nutrition.serving_size && (
              <p className="text-sm text-gray-400 mt-4">
                Serving size: {item.nutrition.serving_size}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-gray-500">
        <p>Added: {new Date(item.created_at).toLocaleDateString()}</p>
        <p>Last updated: {new Date(item.updated_at).toLocaleDateString()}</p>
      </div>
    </div>
  )
}
