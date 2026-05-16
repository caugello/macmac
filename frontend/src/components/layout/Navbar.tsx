import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useAuth } from '@/contexts/AuthContext'

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (location.pathname === '/login') {
    return null
  }

  const isActiveLink = (path: string) => location.pathname.startsWith(path)

  return (
    <nav className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left section: hamburger (mobile) + logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name="menu" size={24} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-md flex items-center justify-center">
              <span className="font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-heading font-bold text-primary">MacMac</span>
          </Link>
        </div>

        {/* Center section (desktop): nav links */}
        {isAuthenticated ? (
          <div className="hidden md:flex items-center gap-8">
            {[
              { to: '/recipes', label: 'Recipes' },
              { to: '/meal-plans', label: 'Meal Plans' },
              { to: '/catalog', label: 'Catalog' },
              { to: '/groups', label: 'Groups' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={
                  isActiveLink(to)
                    ? 'font-label-md text-primary border-b-2 border-primary pb-0.5 transition-colors'
                    : 'font-label-md text-on-surface-variant hover:text-primary transition-colors'
                }
              >
                {label}
              </Link>
            ))}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/#features"
              className="font-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              to="/#how-it-works"
              className="font-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              How It Works
            </Link>
          </div>
        )}

        {/* Right section: search (mobile) + user info/auth (desktop) */}
        <div className="flex items-center gap-2">
          <button className="md:hidden p-2 text-on-surface-variant hover:text-primary transition-colors">
            <Icon name="search" size={24} />
          </button>
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-on-surface-variant text-label-md">{user?.username}</span>
              <Button
                onClick={logout}
                variant="ghost"
                className="text-on-surface-variant hover:text-on-surface"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              asChild
              className="bg-primary text-primary-foreground font-semibold rounded-full"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-outline-variant bg-surface-container-lowest">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {[
              { to: '/recipes', label: 'Recipes' },
              { to: '/meal-plans', label: 'Meal Plans' },
              { to: '/catalog', label: 'Catalog' },
              { to: '/groups', label: 'Groups' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  isActiveLink(to)
                    ? 'text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-primary transition-colors'
                }
              >
                {label}
              </Link>
            ))}
            {isAuthenticated && (
              <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                <span className="text-on-surface text-label-md">{user?.username}</span>
                <Button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
