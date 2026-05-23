import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/recipes', icon: 'restaurant_menu', label: 'Recipes' },
  { to: '/meal-plans', icon: 'calendar_month', label: 'Meal Plans' },
  { to: '/catalog', icon: 'menu_book', label: 'Catalog' },
]

export const BottomNav = () => {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 py-2 md:hidden bg-surface-container-lowest border-t border-outline-variant shadow-none">
      {navItems.map(({ to, icon, label }) => {
        const isActive = location.pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex flex-col items-center justify-center px-4 py-1.5 transition-colors active:scale-90 duration-150 rounded-lg',
              isActive ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
            )}
          >
            <div
              className={cn(
                'px-4 py-1 rounded-full transition-colors',
                isActive && 'bg-primary/10'
              )}
            >
              <Icon name={icon} size={24} filled={isActive} />
            </div>
            <span className="text-xs sm:text-[11px] font-medium mt-0.5">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
