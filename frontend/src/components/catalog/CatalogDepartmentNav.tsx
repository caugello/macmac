import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import type { CatalogDepartment } from '@/lib/types'

interface CatalogDepartmentNavProps {
  departments: CatalogDepartment[]
  /** Currently filtered category, or null for "all products". */
  activeCategory: string | null
  /** Name of the department whose categories are expanded. */
  expandedDepartment: string | null
  onToggleDepartment: (department: string) => void
  onSelectCategory: (category: string) => void
}

/**
 * 2-level department navigation. Renders the "06 — Catalog & Product" rail on
 * desktop (left sidebar) and the same data as an accordion on mobile. A single
 * department is expanded at a time; expanding reveals its categories with live
 * per-category counts. Selecting a category filters the product grid.
 */
export const CatalogDepartmentNav = ({
  departments,
  activeCategory,
  expandedDepartment,
  onToggleDepartment,
  onSelectCategory,
}: CatalogDepartmentNavProps) => {
  return (
    <nav aria-label="Departments" className="flex flex-col gap-2">
      <div className="hidden md:flex items-center justify-between px-2 pb-1">
        <span className="text-body-md font-display font-bold text-ink">Departments</span>
        <span className="text-caption text-muted-foreground tabular-nums">
          {departments.reduce((sum, d) => sum + d.categories.length, 0)} categories
        </span>
      </div>

      {departments.map((dept) => {
        const isExpanded = expandedDepartment === dept.name
        const panelId = `dept-panel-${dept.name.replace(/\s+/g, '-')}`
        return (
          <div
            key={dept.name}
            className={cn(
              'rounded-bento border bg-white overflow-hidden',
              isExpanded ? 'border-lime/60 bg-lime/10' : 'border-border'
            )}
          >
            <button
              type="button"
              onClick={() => onToggleDepartment(dept.name)}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              className="w-full flex items-center gap-3 min-h-[44px] px-3 py-2.5 text-left"
            >
              <Icon
                name={dept.icon}
                size={22}
                className={isExpanded ? 'text-green' : 'text-muted-foreground'}
              />
              <span
                className={cn(
                  'flex-1 text-body-sm truncate',
                  isExpanded ? 'font-bold text-ink' : 'font-semibold text-ink/80'
                )}
              >
                {dept.name}
              </span>
              <span className="text-caption text-muted-foreground tabular-nums">{dept.count}</span>
              <Icon
                name={isExpanded ? 'expand_more' : 'chevron_right'}
                size={18}
                className="text-muted-foreground/70"
              />
            </button>

            {isExpanded && (
              <ul id={panelId} className="px-2 pb-2 space-y-0.5">
                {dept.categories.map((cat) => {
                  const isActive = cat.name === activeCategory
                  return (
                    <li key={cat.name}>
                      <button
                        type="button"
                        onClick={() => onSelectCategory(cat.name)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 min-h-[40px] px-3 rounded-lg text-left transition-colors',
                          isActive
                            ? 'bg-lime text-ink'
                            : 'text-muted-foreground hover:bg-surface-container'
                        )}
                      >
                        <span
                          className={cn(
                            'text-body-sm truncate',
                            isActive ? 'font-bold' : 'font-medium'
                          )}
                        >
                          {cat.name}
                        </span>
                        <span
                          className={cn(
                            'text-caption tabular-nums shrink-0',
                            isActive ? 'font-bold text-ink' : 'text-muted-foreground/70'
                          )}
                        >
                          {cat.count}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
