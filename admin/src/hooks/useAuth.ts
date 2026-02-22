import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../lib/api'

interface User {
  id: number
  name: string
  username: string
  email?: string
  isSuperAdmin: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('superadmin_token')
      const savedUser = localStorage.getItem('superadmin_user')
      
      if (token && savedUser) {
        setUser(JSON.parse(savedUser))
      }
    } catch (e) {
      // Clear corrupted data
      localStorage.removeItem('superadmin_token')
      localStorage.removeItem('superadmin_user')
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const response = await authApi.login(username, password)
    const { token, user } = response.data
    
    localStorage.setItem('superadmin_token', token)
    localStorage.setItem('superadmin_user', JSON.stringify(user))
    setUser(user)
    
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('superadmin_token')
    localStorage.removeItem('superadmin_user')
    setUser(null)
  }, [])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  }
}
