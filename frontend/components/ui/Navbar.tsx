'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge, GoogleG } from './GoogleBrand'
import { LogOut, ChevronDown } from 'lucide-react'
import { ParticipantLoginModal } from '@/components/auth/ParticipantLoginModal'

const emptySubscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function Navbar() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false)
  const mounted = useMounted()

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-xl">
      {/* Top Single Hairline Google 4-Color Accent Strip */}
      <div className="google-hairline-strip" />

      <div className="mx-auto flex h-14 sm:h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 py-1 shrink-0 focus:outline-none group">
          <GdgLogoBadge />
          <div className="flex items-baseline gap-2">
            <span className="text-sm sm:text-base font-medium tracking-tight text-[#111827] group-hover:text-black transition-colors">
              Google Developer Groups
            </span>
            <span className="hidden sm:inline-block font-mono text-[9px] tracking-[0.24em] uppercase text-[#9CA3AF] pl-2 border-l border-[#E5E7EB]">
              Arena
            </span>
          </div>
        </Link>

        {/* Auth Actions (Protected against SSR Hydration Mismatch) */}
        <div className="flex items-center gap-2.5" suppressHydrationWarning>
          {mounted && user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white py-1 pl-1.5 pr-3 text-xs font-medium text-[#111827] transition-all hover:border-[#111827] focus:outline-none cursor-pointer"
              >
                <img
                  src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt={user.name}
                  className="h-6 w-6 rounded-full border border-[#E5E7EB] object-cover"
                />
                <span className="max-w-[85px] sm:max-w-[120px] truncate font-medium">{user.name}</span>
                <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
              </button>

              {/* User Dropdown */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_12px_36px_rgba(0,0,0,0.08)] z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2.5 border-b border-[#F3F4F6] text-xs">
                      <p className="font-semibold text-[#111827] truncate">{user.name}</p>
                      <p className="text-[#6B7280] truncate text-[11px] mt-0.5">{user.email}</p>
                      <span className="mt-2 inline-block rounded-full bg-[#F3F4F6] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#4B5563]">
                        {user.role}
                      </span>
                    </div>

                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin-panel/panel"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#1A73E8] hover:bg-[#F0F6FF] transition-colors cursor-pointer mt-1"
                      >
                        Host Command Center
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        logout()
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#EA4335] hover:bg-[#FEF2F2] transition-colors cursor-pointer mt-1"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  console.log('[GDG Auth] Participant Sign in button clicked from Navbar')
                  setIsParticipantModalOpen(true)
                }}
                className="flex items-center gap-2 rounded-full border border-[#111827] bg-[#111827] px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-black active:scale-[0.98] cursor-pointer"
                title="Participant Sign In"
              >
                <GoogleG className="h-3.5 w-3.5" />
                <span>Sign in</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Participant-Only Sign In Modal */}
      {isParticipantModalOpen && (
        <ParticipantLoginModal
          isOpen={isParticipantModalOpen}
          onClose={() => setIsParticipantModalOpen(false)}
        />
      )}
    </header>
  )
}
