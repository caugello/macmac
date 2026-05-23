import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

interface PaginationProps {
  total: number
  limit: number
  page: number
  onPageChange: (page: number) => void
}

export const Pagination = ({ total, limit, page, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(total / limit)

  if (totalPages <= 1) return null

  const pages = []
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== -1) {
      pages.push(-1) // Ellipsis
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="border-outline-variant text-muted-foreground hover:bg-surface-variant hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon name="chevron_left" size={16} />
      </Button>

      {/* Mobile: current page only */}
      <span className="sm:hidden text-label-md font-medium text-on-surface-variant">
        {page + 1} / {totalPages}
      </span>

      {/* Desktop: full page buttons */}
      <div className="hidden sm:flex items-center gap-2">
        {pages.map((p, i) =>
          p === -1 ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              size="icon"
              onClick={() => onPageChange(p)}
              className={
                p === page
                  ? 'bg-primary hover:bg-primary-container text-primary-foreground font-semibold'
                  : 'border border-outline-variant bg-transparent text-foreground hover:bg-surface-variant'
              }
            >
              {p + 1}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="border-outline-variant text-muted-foreground hover:bg-surface-variant hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon name="chevron_right" size={16} />
      </Button>
    </div>
  )
}
