/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
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
  login: (username: string, password: string) => Promise<void>
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

  // Load token from localStorage on mount
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

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login({ username, password })
      setToken(response.access_token)
      setUser(response.user)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('auth_user', JSON.stringify(response.user))
      navigate('/recipes')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
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
        login,
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
