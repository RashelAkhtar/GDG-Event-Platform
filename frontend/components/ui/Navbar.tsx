'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge, GoogleG } from './GoogleBrand'
import { LogOut, ChevronDown, Sliders, Shield, Terminal } from 'lucide-react'
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
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-white/90 dark:bg-[#0B132B]/90 backdrop-blur-xl transition-all">
      {/* Top Single Hairline Google 4-Color Accent Strip */}
      <div className="google-hairline-strip" />

      <div className="mx-auto flex h-14 sm:h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand Masthead / Publication Header */}
        <Link
          href="/"
          className="flex items-center gap-3 py-1 shrink-0 focus:outline-none group select-none"
        >
          <GdgLogoBadge />
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-sm sm:text-base font-medium tracking-tight text-[#111827] dark:text-[#F9FAFB] group-hover:text-black dark:group-hover:text-white transition-colors">
              Google Developer Groups
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-block font-mono text-[9px] tracking-[0.24em] uppercase text-[#9CA3AF] dark:text-[#64748B] pl-2 border-l border-[#E5E7EB] dark:border-[#1E293B]">
                Arena
              </span>
            </div>
          </div>
        </Link>

        {/* Auth Actions (Protected against SSR Hydration Mismatch) */}
        <div className="flex items-center gap-2" suppressHydrationWarning>
          {mounted && user ? (
            <div className="flex items-center gap-2">
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin-panel/panel"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#111827] dark:border-[#38BDF8]/40 bg-[#111827] dark:bg-[#0C4A6E] px-3.5 py-1.5 text-xs font-medium text-white dark:text-[#38BDF8] hover:bg-black dark:hover:bg-[#075985] transition-all cursor-pointer shadow-xs active:scale-98"
                  title="Open Host Command Center"
                >
                  <Sliders className="h-3 w-3 text-[#FBBC04]" />
                  <span>Host Studio</span>
                </Link>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="group flex items-center gap-2 rounded-full border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] py-1 pl-1.5 pr-3 text-xs font-medium text-[#111827] dark:text-[#F9FAFB] transition-all hover:border-[#111827] dark:hover:border-[#38BDF8] hover:shadow-xs focus:outline-none cursor-pointer"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <div className="relative">
                    <img
                      src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                      alt={user.name}
                      className="h-6 w-6 rounded-full border border-[#E5E7EB] dark:border-[#1E293B] object-cover ring-1 ring-black/5"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#34A853] ring-2 ring-white dark:ring-[#0F172A]" />
                  </div>
                  <span className="max-w-[85px] sm:max-w-[120px] truncate font-medium text-[#111827] dark:text-[#F9FAFB]">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-[#9CA3AF] dark:text-[#64748B] transition-transform duration-200 ${
                      menuOpen ? 'rotate-180 text-[#111827] dark:text-[#F9FAFB]' : ''
                    }`}
                  />
                </button>

                {/* User Dropdown Surface */}
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-40 animate-in fade-in zoom-in-95 duration-150">
                      {/* Identity Card */}
                      <div className="px-3.5 py-3 border-b border-[#F3F4F6] dark:border-[#1E293B] text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF] dark:text-[#64748B]">
                            ACCOUNT
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#4B5563] dark:text-[#CBD5E1]">
                            {user.role === 'ADMIN' ? (
                              <>
                                <Shield className="h-2.5 w-2.5 text-[#1A73E8]" />
                                <span>Host</span>
                              </>
                            ) : (
                              <span>Player</span>
                            )}
                          </span>
                        </div>
                        <p className="font-medium text-[#111827] dark:text-[#F9FAFB] truncate text-sm">{user.name}</p>
                        <p className="text-[#6B7280] dark:text-[#94A3B8] truncate text-[11px] mt-0.5 font-mono">{user.email}</p>
                      </div>

                      {user.role === 'ADMIN' && (
                        <div className="pt-1.5 pb-1">
                          <Link
                            href="/admin-panel/panel"
                            onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F4F4F5] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                          >
                            <Terminal className="h-3.5 w-3.5 text-[#1A73E8]" />
                            <span>Host Command Center</span>
                          </Link>
                        </div>
                      )}

                      <div className="pt-1 border-t border-[#F3F4F6] dark:border-[#1E293B]">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            logout()
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  console.log('[GDG Auth] Participant Sign in button clicked from Navbar')
                  setIsParticipantModalOpen(true)
                }}
                className="group flex items-center gap-2 rounded-full border border-[#111827] dark:border-[#38BDF8] bg-[#111827] dark:bg-[#38BDF8] px-4 py-1.5 text-xs font-medium text-white dark:text-[#080D1A] transition-all hover:bg-black dark:hover:bg-[#7DD3FC] active:scale-[0.98] cursor-pointer shadow-xs hover:shadow-sm"
                title="Participant Sign In"
              >
                <GoogleG className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
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
