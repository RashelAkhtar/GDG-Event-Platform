'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  loginWithGoogle: () => void
  participantLogin: (name: string, email?: string) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  adminPasswordLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: () => {},
  participantLogin: async () => ({ success: false }),
  logout: async () => {},
  adminPasswordLogin: async () => ({ success: false }),
  refreshUser: async () => {},
})

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refreshUser = async () => {
    try {
      const res = await api.getMe()
      if (res.success && res.user) {
        setUser(res.user)
        return
      }
    } catch {}

    if (typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('gdg_demo_user')
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr) as User
          if (parsed && parsed.name) {
            setUser(parsed)
            return
          }
        } catch {}
      }
    }
    setUser(null)
    setLoading(false)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      if (token) {
        localStorage.setItem('gdg_token', token)
      }
      if (params.get('auth') === 'success') {
        const url = new URL(window.location.href)
        url.searchParams.delete('auth')
        url.searchParams.delete('token')
        window.history.replaceState({}, document.title, url.toString())
      }
    }
    const timer = setTimeout(() => {
      void refreshUser()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const loginWithGoogle = () => {
    window.location.href = new URL(`${API_BASE}/auth/google`, window.location.origin).toString()
  }

  const participantLogin = async (name: string, email?: string) => {
    const res = await api.participantLogin(name, email)
    if (res.success && res.user) {
      setUser(res.user)
      return { success: true }
    }
    return { success: false, message: res.message || 'Failed to sign in' }
  }

  const logout = async () => {
    await api.logout()
    localStorage.removeItem('gdg_demo_user')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gdg_token')
    }
    setUser(null)
  }

  const adminPasswordLogin = async (email: string, pass: string) => {
    const res = await api.adminLogin(email, pass)
    if (res.success) {
      if (res.user && res.user.role === 'ADMIN') {
        setUser(res.user)
        return { success: true }
      }
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
        participantLogin,
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
