import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()

  // Don't show navbar on login page
  if (location.pathname === '/login') {
    return null
  }

  return (
    <nav className="border-b border-gray-800 bg-[#0a0e1a]">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00CEB8] rounded-md flex items-center justify-center">
            <span className="text-black font-bold text-xl">M</span>
          </div>
          <span className="text-2xl font-bold text-white">MacMac</span>
        </Link>

        {isAuthenticated ? (
          <>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/recipes" className="text-gray-300 hover:text-[#00CEB8] transition-colors">
                Recipes
              </Link>
              <Link to="/meal-plans" className="text-gray-300 hover:text-[#00CEB8] transition-colors">
                Meal Plans
              </Link>
              <Link to="/catalog" className="text-gray-300 hover:text-[#00CEB8] transition-colors">
                Catalog
              </Link>
              <Link to="/groups" className="text-gray-300 hover:text-[#00CEB8] transition-colors">
                Groups
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">
                {user?.username}
              </span>
              <Button
                onClick={logout}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Logout
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/#features" className="text-gray-300 hover:text-[#00CEB8] transition-colors">
                Features
              </Link>
              <Link to="/#how-it-works" className="text-gray-300 hover:text-[#00CEB8] transition-colors">
                How It Works
              </Link>
            </div>

            <Button asChild className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold">
              <Link to="/login">Sign In</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}
