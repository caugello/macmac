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
    <nav className="bg-white/80 backdrop-blur-[20px] border-b border-outline-variant sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left section: hamburger (mobile) + brand wordmark */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-on-surface-variant hover:text-ink transition-colors"
          >
            <Icon name="menu" size={24} />
          </button>
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-display font-bold lowercase tracking-tight text-ink">
              MacMac<span className="text-lime">.</span>
            </span>
          </Link>
        </div>

        {/* Center section (desktop): pill nav */}
        {isAuthenticated ? (
          <div className="hidden md:flex items-center gap-1 rounded-full border border-outline-variant bg-white p-1">
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
                    ? 'font-label-md rounded-full bg-ink px-4 py-2 text-cream transition-colors'
                    : 'font-label-md rounded-full px-4 py-2 text-on-surface-variant transition-colors hover:bg-cream hover:text-ink'
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
              className="font-label-md text-on-surface-variant hover:text-ink transition-colors"
            >
              Features
            </Link>
            <Link
              to="/#how-it-works"
              className="font-label-md text-on-surface-variant hover:text-ink transition-colors"
            >
              How It Works
            </Link>
          </div>
        )}

        {/* Right section: search (mobile) + user info/auth (desktop) */}
        <div className="flex items-center gap-2">
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
        <div className="md:hidden border-b border-outline-variant bg-surface-container-lowest animate-fade max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="container mx-auto px-4 py-2 flex flex-col">
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
                    ? 'py-3 px-4 bg-ink text-cream font-semibold rounded-full'
                    : 'py-3 px-4 text-on-surface-variant hover:text-ink hover:bg-cream rounded-full transition-colors'
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
