'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge, GoogleG } from '@/components/ui/GoogleBrand'
import { X, Users, Mail, UserCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface ParticipantLoginModalProps {
  isOpen: boolean
  onClose: () => void
  redirectAfterLogin?: string
}

export function ParticipantLoginModal({
  isOpen,
  onClose,
  redirectAfterLogin,
}: ParticipantLoginModalProps) {
  const router = useRouter()
  const { loginWithGoogle, participantLogin } = useAuth()

  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  const handleGoogleClick = () => {
    console.log('[GDG Auth] Initiating Google sign-in from modal')
    setGoogleLoading(true)
    setErrorMessage(null)
    try {
      loginWithGoogle()
    } catch (err: any) {
      console.error('[GDG Auth] Google login redirect error:', err)
      setGoogleLoading(false)
      setErrorMessage('Failed to connect to Google authentication. Enter your participant handle below.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    const cleanEmail = email.trim()

    if (!cleanName) {
      setErrorMessage('Please enter your participant handle or name.')
      return
    }

    console.log('[GDG Auth] Submitting participant handle:', cleanName)
    setErrorMessage(null)
    setLoading(true)

    try {
      const res = await participantLogin(cleanName, cleanEmail)
      if (res.success) {
        console.log('[GDG Auth] Participant successfully authenticated:', cleanName)
        setSuccessMessage('Handle confirmed! Entering Arena...')
        setTimeout(() => {
          onClose()
          if (redirectAfterLogin) {
            router.push(redirectAfterLogin)
          }
        }, 350)
      } else {
        console.warn('[GDG Auth] Participant login failed:', res.message)
        setErrorMessage(res.message || 'Failed to sign in')
      }
    } catch (err: any) {
      console.error('[GDG Auth] Participant login exception:', err)
      setErrorMessage('Network or server error during sign in')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.18)] text-[#111827] my-auto animate-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* GDG Header */}
        <div className="flex flex-col items-center text-center">
          <GdgLogoBadge />
          <span className="font-mono text-[9px] tracking-[0.26em] uppercase text-[#9CA3AF] mt-3">
            COMMUNITY PARTICIPANT ACCESS
          </span>
          <h2 className="text-2xl font-normal tracking-[-0.035em] text-[#111827] mt-1">
            Join Arena
          </h2>
          <p className="mt-1 text-xs text-[#6B7280] leading-relaxed max-w-xs">
            Sign in to compete in live technical sprints, solve puzzles, and rank on tournament leaderboards.
          </p>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-[#FEF2F2] p-2.5 text-xs text-[#DC2626] border border-[#FEE2E2]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-[#F0FDF4] p-2.5 text-xs text-[#16A34A] border border-[#DCFCE7]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Sign In Options */}
        <div className="mt-5 flex flex-col gap-3.5 text-xs">
          {/* 1. Google OAuth */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleClick}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-medium text-[#111827] hover:border-[#111827] hover:bg-[#FAFAFA] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#111827]" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleG className="h-4 w-4" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-0.5 flex items-center justify-center">
            <div className="w-full border-t border-[#E5E7EB]" />
            <span className="absolute bg-white px-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF]">
              or join with handle
            </span>
          </div>

          {/* 2. Participant Handle Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-2.5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6B7280] mb-1 flex items-center gap-1">
                <Users className="h-3 w-3 text-[#9CA3AF]" />
                <span>Your Handle / Name</span>
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#111827] transition-all"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6B7280] mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3 text-[#9CA3AF]" />
                <span>Email (optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#111827] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#111827] text-xs font-medium tracking-wide uppercase text-white hover:bg-black active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{loading ? 'Entering...' : 'Enter Arena'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
