import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Landing />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RecipeList />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RecipeForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RecipeForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RecipeDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalog"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CatalogList />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalog/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CatalogDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/meal-plans"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MealPlansPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Groups />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
