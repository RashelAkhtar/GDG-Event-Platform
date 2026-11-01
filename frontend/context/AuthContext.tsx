'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  loginWithGoogle: () => void
  logout: () => Promise<void>
  adminPasswordLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: () => {},
  logout: async () => {},
  adminPasswordLogin: async () => ({ success: false }),
  refreshUser: async () => {},
})

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refreshUser = async () => {
    try {
      const res = await api.getMe()
      setUser(res.success && res.user ? res.user : null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('auth') === 'success') {
        const url = new URL(window.location.href)
        url.searchParams.delete('auth')
        window.history.replaceState({}, document.title, url.toString())
      }
    }
    const timer = setTimeout(() => {
      void refreshUser()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE}/auth/google`
  }

  const logout = async () => {
    await api.logout()
    localStorage.removeItem('gdg_demo_user')
    setUser(null)
  }

  const adminPasswordLogin = async (email: string, pass: string) => {
    const res = await api.adminLogin(email, pass)
    if (res.success) {
      const session = await api.getMe()
      if (session.success && session.user?.role === 'ADMIN') {
        setUser(session.user)
        return { success: true }
      }
      setUser(null)
    }
    return { success: false, message: res.message || 'Invalid admin credentials' }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        logout,
        adminPasswordLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
