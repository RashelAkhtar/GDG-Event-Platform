'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { GoogleG, GdgLogoBadge } from './GoogleBrand'
import { LogOut, ChevronDown } from 'lucide-react'
import { SecurityNotificationBell } from '@/components/security/SecurityNotificationBell'

export function Navbar() {
  const { user, loginWithGoogle, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-[#DADCE0] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 py-1 shrink-0 focus:outline-none">
          <GdgLogoBadge />
          <span className="hidden sm:inline text-[17px] sm:text-[19px] font-normal tracking-tight text-[#3C4043] whitespace-nowrap">
            Google Developer Groups
          </span>
        </Link>

        {/* Auth Actions (Protected against SSR Hydration Mismatch) */}
        <div className="flex items-center gap-2" suppressHydrationWarning>
          {mounted && user?.role === 'ADMIN' && <SecurityNotificationBell />}
          {mounted && user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 border border-[#DADCE0] bg-white py-1.5 pl-1.5 pr-3 text-xs font-medium text-[#3C4043] transition-all hover:bg-[#F8F9FA] focus:outline-none cursor-pointer"
              >
                <img
                  src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt={user.name}
                  className="h-7 w-7 border border-[#DADCE0] object-cover"
                />
                <span className="max-w-[90px] sm:max-w-[120px] truncate">{user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#5F6368]" />
              </button>

              {/* User Dropdown */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-52 border border-[#DADCE0] bg-white p-2 shadow-lg z-40">
                    <div className="px-3 py-2 border-b border-[#F1F3F4] text-xs">
                      <p className="font-semibold text-[#202124] truncate">{user.name}</p>
                      <p className="text-[#5F6368] truncate">{user.email}</p>
                      <span className="mt-1 inline-block border border-[#1A73E8]/30 bg-[#E8F0FE] px-2 py-0.5 text-[10px] font-medium text-[#1967D2]">
                        Role: {user.role}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        logout()
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-[#EA4335] hover:bg-[#FCE8E6] transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-2 border border-[#DADCE0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#3C4043] shadow-2xs transition-all hover:bg-[#F8F9FA] active:translate-y-0.5 cursor-pointer"
              >
                <GoogleG className="h-4 w-4" />
                <span className="hidden xs:inline">Sign in with</span> Google
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
