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
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-xl transition-all">
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
            <span className="text-sm sm:text-base font-medium tracking-tight text-[#111827] group-hover:text-black transition-colors">
              Google Developer Groups
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-block font-mono text-[9px] tracking-[0.24em] uppercase text-[#9CA3AF] pl-2 border-l border-[#E5E7EB]">
                Arena
              </span>
              <span className="hidden md:inline-block font-mono text-[8.5px] tracking-[0.18em] uppercase text-[#6B7280]">
                // VOL. 26
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
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#111827] bg-[#111827] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-black transition-all cursor-pointer shadow-xs active:scale-98"
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
                  className="group flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white py-1 pl-1.5 pr-3 text-xs font-medium text-[#111827] transition-all hover:border-[#111827] hover:shadow-xs focus:outline-none cursor-pointer"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <div className="relative">
                    <img
                      src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                      alt={user.name}
                      className="h-6 w-6 rounded-full border border-[#E5E7EB] object-cover ring-1 ring-black/5"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#34A853] ring-2 ring-white" />
                  </div>
                  <span className="max-w-[85px] sm:max-w-[120px] truncate font-medium text-[#111827]">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-[#9CA3AF] transition-transform duration-200 ${
                      menuOpen ? 'rotate-180 text-[#111827]' : ''
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
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-[0_16px_48px_rgba(0,0,0,0.1)] z-40 animate-in fade-in zoom-in-95 duration-150">
                      {/* Identity Card */}
                      <div className="px-3.5 py-3 border-b border-[#F3F4F6] text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF]">
                            ACCOUNT
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#4B5563]">
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
                        <p className="font-medium text-[#111827] truncate text-sm">{user.name}</p>
                        <p className="text-[#6B7280] truncate text-[11px] mt-0.5 font-mono">{user.email}</p>
                      </div>

                      {user.role === 'ADMIN' && (
                        <div className="pt-1.5 pb-1">
                          <Link
                            href="/admin-panel/panel"
                            onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#111827] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                          >
                            <Terminal className="h-3.5 w-3.5 text-[#1A73E8]" />
                            <span>Host Command Center</span>
                          </Link>
                        </div>
                      )}

                      <div className="pt-1 border-t border-[#F3F4F6]">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            logout()
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
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
                className="group flex items-center gap-2 rounded-full border border-[#111827] bg-[#111827] px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-black active:scale-[0.98] cursor-pointer shadow-xs hover:shadow-sm"
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
