import { Icon } from '@/components/ui/icon'

interface CatalogBreadcrumbProps {
  /** Active department, or null when no category is selected. */
  department: string | null
  /** Active category, or null for "all products". */
  category: string | null
}

/** Breadcrumb above the product grid: `Shop > {Department} > {Category}`. */
export const CatalogBreadcrumb = ({ department, category }: CatalogBreadcrumbProps) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption mb-2.5">
      <span className="text-muted-foreground/70">Shop</span>
      {department && (
        <>
          <Icon name="chevron_right" size={15} className="text-muted-foreground/50" />
          <span className="text-muted-foreground/70">{department}</span>
        </>
      )}
      {category && (
        <>
          <Icon name="chevron_right" size={15} className="text-muted-foreground/50" />
          <span className="font-bold text-ink">{category}</span>
        </>
      )}
    </nav>
  )
}
