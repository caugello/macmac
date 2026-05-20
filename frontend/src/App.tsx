import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ui/toast'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Groups } from './pages/Groups'
import { RecipeList } from './pages/RecipeList'
import { RecipeForm } from './pages/RecipeForm'
import { RecipeDetail } from './pages/RecipeDetail'
import { CatalogList } from './pages/CatalogList'
import { CatalogDetail } from './pages/CatalogDetail'
import { MealPlansPage } from './pages/MealPlansPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/recipes" element={<RecipeList />} />
                <Route path="/recipes/new" element={<RecipeForm />} />
                <Route path="/recipes/:id/edit" element={<RecipeForm />} />
                <Route path="/recipes/:id" element={<RecipeDetail />} />
                <Route path="/catalog" element={<CatalogList />} />
                <Route path="/catalog/:id" element={<CatalogDetail />} />
                <Route path="/meal-plans" element={<MealPlansPage />} />
                <Route path="/groups" element={<Groups />} />
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
