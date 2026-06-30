import { useState, useCallback, useMemo } from 'react'
import { useCatalog, useCatalogDepartments } from '@/hooks/useCatalog'
import { CatalogProductCard } from '@/components/catalog/CatalogProductCard'
import { CatalogDepartmentNav } from '@/components/catalog/CatalogDepartmentNav'
import { CatalogBreadcrumb } from '@/components/catalog/CatalogBreadcrumb'
import { Card } from '@/components/ui/card'
import { SearchBar } from '@/components/shared/SearchBar'
import { Pagination } from '@/components/shared/Pagination'
import { Icon } from '@/components/ui/icon'
import type { CatalogDepartment } from '@/lib/types'

const ALL_PRODUCTS = 'All Products'

/** Returns the department that owns `category`, or null. */
const departmentForCategory = (
  departments: CatalogDepartment[],
  category: string | null
): string | null => {
  if (!category) return null
  for (const dept of departments) {
    if (dept.categories.some((c) => c.name === category)) return dept.name
  }
  return null
}

export const CatalogList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [openDepartment, setOpenDepartment] = useState<string | null>(null)
  const limit = 20

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(0)
  }, [])

  const { data: departmentsData } = useCatalogDepartments()
  const departments = useMemo(() => departmentsData?.departments ?? [], [departmentsData])

  const { data, isLoading, error } = useCatalog({
    limit,
    offset: page * limit,
    search: search || undefined,
    category: activeCategory ?? undefined,
  })

  const activeDepartment = useMemo(
    () => departmentForCategory(departments, activeCategory),
    [departments, activeCategory]
  )

  // The expanded department: an explicit toggle wins, otherwise the active
  // category's department, otherwise the first department.
  const expandedDepartment = openDepartment ?? activeDepartment ?? departments[0]?.name ?? null

  const handleToggleDepartment = useCallback((department: string) => {
    setOpenDepartment((current) => (current === department ? null : department))
  }, [])

  const handleSelectCategory = useCallback((category: string) => {
    setActiveCategory(category)
    setPage(0)
  }, [])

  const header = (
    <header className="mb-6">
      <h1 className="text-headline-lg-mobile md:text-headline-lg font-display font-bold text-ink">
        Shop
      </h1>
    </header>
  )

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32 flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Error loading catalog. Please try again.</p>
      </div>
    )
  }

  const sidebar = departments.length > 0 && (
    <CatalogDepartmentNav
      departments={departments}
      activeCategory={activeCategory}
      expandedDepartment={expandedDepartment}
      onToggleDepartment={handleToggleDepartment}
      onSelectCategory={handleSelectCategory}
    />
  )

  const sectionTitle = activeCategory ?? ALL_PRODUCTS

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32">
      {header}

      <SearchBar value={search} onChange={handleSearchChange} placeholder="Search products..." />

      <div className="mt-4 flex flex-col md:flex-row md:items-start gap-5 md:gap-6">
        {/* Department rail (desktop) / accordion (mobile) */}
        <aside className="md:w-[266px] md:flex-none">{sidebar}</aside>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          <CatalogBreadcrumb department={activeDepartment} category={activeCategory} />

          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-headline-md font-display font-bold text-ink truncate">
              {sectionTitle}
            </h2>
            {!isLoading && (
              <span className="text-caption text-muted-foreground whitespace-nowrap shrink-0">
                Showing {data?.total ?? 0} {(data?.total ?? 0) === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-gutter">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} tone="white" className="overflow-hidden flex flex-col">
                  <div className="aspect-square skeleton-shimmer" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 w-16 skeleton-shimmer rounded" />
                    <div className="h-5 w-full skeleton-shimmer rounded" />
                    <div className="h-4 w-2/3 skeleton-shimmer rounded" />
                    <div className="h-6 w-20 skeleton-shimmer rounded mt-2" />
                  </div>
                </Card>
              ))}
              <p className="sr-only">Loading catalog...</p>
            </div>
          ) : data && data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Card tone="white" className="w-full max-w-sm p-12 flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-lime flex items-center justify-center">
                  <Icon name="inventory_2" size={36} className="text-ink" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-headline-md font-display font-bold text-ink">
                    Nothing here yet
                  </p>
                  <p className="text-body-md text-muted-foreground">
                    {activeCategory
                      ? 'No products in this category yet.'
                      : 'Products will appear here once the catalog is populated.'}
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-gutter stagger-grid">
                {data?.data.map((item) => (
                  <CatalogProductCard key={item.id} item={item} />
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
      </div>
    </div>
  )
}
