'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge, GoogleG } from '@/components/ui/GoogleBrand'
import { ArrowLeft, AlertCircle, CheckCircle2, Mail, Users, UserCheck } from 'lucide-react'

function LoginContent() {
  const { user, loginWithGoogle, participantLogin, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  const urlTab = searchParams.get('tab')
  const urlRole = searchParams.get('role')

  // If someone accessed /login?tab=admin, redirect them to the dedicated /admin-panel
  useEffect(() => {
    if (urlTab === 'admin' || urlRole === 'admin') {
      console.log('[GDG Auth] Redirecting admin login request to /admin-panel')
      router.replace('/admin-panel')
    }
  }, [urlTab, urlRole, router])

  const urlError = searchParams.get('error')
  const initialError =
    urlError === 'google_not_configured' || urlError === 'oauth_failed'
      ? 'Google OAuth is not configured in this environment. Enter your participant handle below to join instantly.'
      : urlError
      ? `Authentication error: ${urlError}`
      : null

  const [errorMessage, setErrorMessage] = useState<string | null>(initialError)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Participant form state
  const [participantName, setParticipantName] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [participantLoading, setParticipantLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'ADMIN') {
        router.replace(redirectUrl !== '/' ? redirectUrl : '/admin')
      } else {
        router.replace(redirectUrl)
      }
    }
  }, [user, authLoading, router, redirectUrl])

  const handleGoogleClick = () => {
    console.log('[GDG Auth] Participant login initiated via Google OAuth')
    loginWithGoogle()
  }

  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = participantName.trim()
    const cleanEmail = participantEmail.trim()

    if (!cleanName) {
      setErrorMessage('Please enter your tournament handle or name.')
      return
    }

    console.log('[GDG Auth] Submitting participant handle login:', cleanName, cleanEmail || '(no email)')
    setErrorMessage(null)
    setParticipantLoading(true)

    try {
      const res = await participantLogin(cleanName, cleanEmail)
      if (res.success) {
        console.log('[GDG Auth] Participant logged in successfully:', cleanName)
        setSuccessMessage('Handle confirmed. Entering Arena...')
        setTimeout(() => {
          router.replace(redirectUrl)
        }, 400)
      } else {
        console.warn('[GDG Auth] Participant login failed:', res.message)
        setErrorMessage(res.message || 'Failed to sign in')
      }
    } catch (err: any) {
      console.error('[GDG Auth] Participant login unexpected error:', err)
      setErrorMessage(err?.message || 'Unexpected login error')
    } finally {
      setParticipantLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-4 py-12 text-[#111827] relative selection:bg-[#111827] selection:text-white">
      {/* Return to hub */}
      <div className="mb-4 w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Hub</span>
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-7 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.03)] relative">
        {/* GDG Branding */}
        <div className="flex flex-col items-center text-center">
          <GdgLogoBadge />
          <span className="font-mono text-[9px] tracking-[0.26em] uppercase text-[#9CA3AF] mt-3">
            COMMUNITY PARTICIPANT ACCESS
          </span>
          <h1 className="text-3xl font-normal tracking-[-0.035em] text-[#111827] mt-1">
            Join Arena
          </h1>
          <p className="mt-1.5 text-xs text-[#6B7280] leading-relaxed max-w-xs">
            Sign in to compete in real-time technical sprints, submit projects, and rank on official leaderboards.
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FEF2F2] p-3 text-xs text-[#DC2626] border border-[#FEE2E2]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#F0FDF4] p-3 text-xs text-[#16A34A] border border-[#DCFCE7]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* PARTICIPANT LOGIN (Google OAuth + Community Handle) */}
        <div className="mt-6 flex flex-col gap-4 text-xs">
          <button
            type="button"
            onClick={handleGoogleClick}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-medium text-[#111827] hover:border-[#111827] hover:bg-[#FAFAFA] active:scale-[0.99] transition-all cursor-pointer"
          >
            <GoogleG className="h-4 w-4" />
            <span>Continue with Google</span>
          </button>

          {/* Subtle Divider */}
          <div className="relative my-1 flex items-center justify-center">
            <div className="w-full border-t border-[#E5E7EB]" />
            <span className="absolute bg-white px-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF]">
              or join with handle
            </span>
          </div>

          {/* Community Handle Form */}
          <form onSubmit={handleParticipantSubmit} autoComplete="off" className="flex flex-col gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6B7280] mb-1.5 flex items-center gap-1.5">
                <Users className="h-3 w-3 text-[#9CA3AF]" />
                <span>Participant Handle / Name</span>
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#111827] transition-all"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6B7280] mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-[#9CA3AF]" />
                <span>Email (optional)</span>
              </label>
              <input
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#111827] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={participantLoading}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#111827] text-xs font-medium tracking-wide uppercase text-white hover:bg-black active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{participantLoading ? 'Entering...' : 'Enter Arena'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
          <div className="h-6 w-6 rounded-full border-2 border-[#111827] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
