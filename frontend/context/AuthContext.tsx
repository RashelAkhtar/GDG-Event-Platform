'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  loginWithGoogle: () => void
  logout: () => Promise<void>
  demoLogin: (role: 'USER' | 'ADMIN') => void
  adminPasswordLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: () => {},
  logout: async () => {},
  demoLogin: () => {},
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
      if (res.success && res.user) {
        setUser(res.user)
      } else {
        const local = localStorage.getItem('gdg_demo_user')
        if (local) {
          setUser(JSON.parse(local))
        } else {
          setUser(null)
        }
      }
    } catch {
      const local = localStorage.getItem('gdg_demo_user')
      if (local) {
        setUser(JSON.parse(local))
      } else {
        setUser(null)
      }
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
    if (res.success && res.user) {
      localStorage.setItem('gdg_demo_user', JSON.stringify(res.user))
      setUser(res.user)
      return { success: true }
    }
    return { success: false, message: res.message || 'Invalid admin credentials' }
  }

  const demoLogin = (role: 'USER' | 'ADMIN') => {
    const demoUser: User = {
      _id: role === 'ADMIN' ? 'admin_master_aryan' : `user_${Date.now()}`,
      name: role === 'ADMIN' ? 'Aryan (Admin)' : 'Community Participant',
      email: role === 'ADMIN' ? 'aryan.crores@gmail.com' : 'attendee@gdg.community',
      avatar:
        role === 'ADMIN'
          ? 'https://api.dicebear.com/7.x/initials/svg?seed=Aryan&backgroundColor=1a73e8&textColor=ffffff'
          : 'https://api.dicebear.com/7.x/bottts/svg?seed=Participant',
      role,
    }
    localStorage.setItem('gdg_demo_user', JSON.stringify(demoUser))
    setUser(demoUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        logout,
        demoLogin,
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
