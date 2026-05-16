/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth as firebaseAuth, googleProvider } from '@/lib/firebase'
import { authApi } from '@/api/auth'

interface User {
  id: string
  username: string
  email: string
  groups: string[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  loginWithGoogle: () => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, () => {
      // Firebase state tracked separately; internal JWT is the source of truth
    })
    return unsubscribe
  }, [])

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(firebaseAuth, googleProvider)
    const idToken = await result.user.getIdToken()

    const response = await authApi.login({ id_token: idToken })
    setToken(response.access_token)
    setUser(response.user)
    localStorage.setItem('auth_token', response.access_token)
    localStorage.setItem('auth_user', JSON.stringify(response.user))
    navigate('/recipes')
  }

  const logout = () => {
    signOut(firebaseAuth)
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    navigate('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loginWithGoogle,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
