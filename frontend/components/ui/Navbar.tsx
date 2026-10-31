'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { GoogleG, GdgLogoBadge } from './GoogleBrand'
import { LogOut, ShieldCheck, ChevronDown } from 'lucide-react'

export function Navbar() {
  const { user, loginWithGoogle, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[#DADCE0] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 rounded-full py-1 shrink-0 focus:outline-none">
          <GdgLogoBadge />
          <span className="hidden sm:inline text-[17px] sm:text-[19px] font-normal tracking-tight text-[#3C4043] whitespace-nowrap">
            Google Developer Groups
          </span>
        </Link>

        {/* Auth Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white py-1.5 pl-1.5 pr-3 text-xs font-medium text-[#3C4043] transition-all hover:bg-[#F8F9FA] focus:outline-none"
              >
                <img
                  src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt={user.name}
                  className="h-7 w-7 rounded-full border border-[#DADCE0] object-cover"
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
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[#DADCE0] bg-white p-2 shadow-lg z-40">
                    <div className="px-3 py-2 border-b border-[#F1F3F4] text-xs">
                      <p className="font-semibold text-[#202124] truncate">{user.name}</p>
                      <p className="text-[#5F6368] truncate">{user.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[10px] font-medium text-[#1967D2]">
                        Role: {user.role}
                      </span>
                    </div>

                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA] transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4 text-[#1A73E8]" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        logout()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#EA4335] hover:bg-[#FCE8E6] transition-colors"
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
                className="flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#3C4043] shadow-2xs transition-all hover:bg-[#F8F9FA] active:scale-95"
              >
                <GoogleG className="h-4 w-4" />
                <span className="hidden xs:inline">Sign in with</span> Google
              </button>

              <Link
                href="/login"
                title="Admin Sign In"
                className="flex h-8 items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3 text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#1A73E8]" />
                <span>Admin</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
