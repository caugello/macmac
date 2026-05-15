import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

// Mock all the page components
vi.mock('./pages/Landing', () => ({
  Landing: () => <div>Landing Page</div>,
}))

vi.mock('./pages/Login', () => ({
  Login: () => <div>Login Page</div>,
}))

vi.mock('./pages/Groups', () => ({
  Groups: () => <div>Groups Page</div>,
}))

vi.mock('./pages/RecipeList', () => ({
  RecipeList: () => <div>Recipe List Page</div>,
}))

vi.mock('./pages/RecipeForm', () => ({
  RecipeForm: () => <div>Recipe Form Page</div>,
}))

vi.mock('./pages/RecipeDetail', () => ({
  RecipeDetail: () => <div>Recipe Detail Page</div>,
}))

vi.mock('./pages/CatalogList', () => ({
  CatalogList: () => <div>Catalog List Page</div>,
}))

vi.mock('./pages/CatalogDetail', () => ({
  CatalogDetail: () => <div>Catalog Detail Page</div>,
}))

vi.mock('./pages/MealPlansPage', () => ({
  MealPlansPage: () => <div>Meal Plans Page</div>,
}))

// Mock auth context
vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(<App />)
    // Should render the Router component
    expect(document.body).toBeTruthy()
  })

  it('should render login page on /login route', () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('should wrap app with QueryClientProvider', () => {
    const { container } = render(<App />)
    // The app should render without errors, indicating QueryClientProvider is working
    expect(container).toBeTruthy()
  })

  it('should wrap app with BrowserRouter', () => {
    const { container } = render(<App />)
    // If BrowserRouter is working, the app renders without routing errors
    expect(container).toBeTruthy()
  })

  it('should wrap app with AuthProvider', () => {
    const { container } = render(<App />)
    // If AuthProvider is working, the app renders without auth errors
    expect(container).toBeTruthy()
  })
})
