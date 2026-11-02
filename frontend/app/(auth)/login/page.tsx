'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge, GoogleG } from '@/components/ui/GoogleBrand'
import { ShieldCheck, ArrowLeft, AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react'

function LoginContent() {
  const { user, loginWithGoogle, adminPasswordLogin, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Admin credentials state
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [showAdminForm, setShowAdminForm] = useState(false)

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

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setAdminLoading(true)

    try {
      const res = await adminPasswordLogin(adminEmail.trim(), adminPassword)
      if (res.success) {
        setSuccessMessage('Admin verified! Entering platform...')
        setTimeout(() => {
          router.replace(redirectUrl !== '/' ? redirectUrl : '/admin')
        }, 500)
      } else {
        setErrorMessage(res.message || 'Invalid admin credentials')
      }
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] px-4 py-12 text-[#202124] bg-tech-grid">
      {/* Return to hub */}
      <div className="mb-5 w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#1A73E8] hover:text-[#1765CC] uppercase tracking-wider"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO HOME</span>
        </Link>
      </div>

      <div className="w-full max-w-sm border border-[#DADCE0] bg-white p-7 sm:p-8 shadow-xs">
        {/* GDG Branding */}
        <div className="flex flex-col items-center text-center">
          <GdgLogoBadge />
          <h1 className="mt-3.5 font-mono text-xl sm:text-2xl font-black uppercase tracking-tight text-[#202124]">
            SIGN IN TO PLAY
          </h1>
          <p className="mt-1.5 text-xs text-[#5F6368] leading-relaxed">
            Guest players are restricted. Sign in with your Google account to play quizzes, unlock word grids, and record live scores.
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 bg-[#FCE8E6] p-3 font-mono text-xs text-[#C5221F] border border-[#EA4335]/30">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 bg-[#E6F4EA] p-3 font-mono text-xs text-[#137333] border border-[#34A853]/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34A853]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Primary Participant Login: Google OAuth */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex h-12 w-full items-center justify-center gap-3 border border-[#DADCE0] bg-white font-mono text-xs font-bold uppercase tracking-wider text-[#3C4043] shadow-xs hover:border-[#1A73E8] hover:bg-[#F8F9FA] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <GoogleG className="h-4.5 w-4.5" />
            <span>CONTINUE WITH GOOGLE</span>
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#DADCE0]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#80868B]">
            OR HOST ACCESS
          </span>
          <div className="h-px flex-1 bg-[#DADCE0]" />
        </div>

        {/* Organizer / Admin Toggle */}
        {!showAdminForm ? (
          <button
            type="button"
            onClick={() => setShowAdminForm(true)}
            className="flex w-full items-center justify-center gap-2 border border-[#DADCE0] bg-[#F8F9FA] py-2.5 font-mono text-[11px] font-bold text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>SIGN IN WITH ADMIN CREDENTIALS</span>
          </button>
        ) : (
          <form onSubmit={handleAdminSubmit} autoComplete="off" className="flex flex-col gap-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#3C4043] mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3 text-[#5F6368]" />
                <span>Admin Email</span>
              </label>
              <input
                type="email"
                name="admin-email"
                autoComplete="off"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@gdg.org"
                className="w-full border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 font-mono text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1A73E8] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#3C4043] mb-1 flex items-center gap-1">
                <Lock className="h-3 w-3 text-[#5F6368]" />
                <span>Admin Password</span>
              </label>
              <input
                type="password"
                name="admin-password"
                autoComplete="new-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 font-mono text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1A73E8] transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={adminLoading}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 border border-[#1765CC] bg-[#1A73E8] font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#1557B0] active:translate-y-0.5 transition-all cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{adminLoading ? 'VERIFYING ADMIN...' : 'ADMIN SIGN IN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdminForm(false)}
              className="text-center font-mono text-[10px] text-[#5F6368] hover:underline"
            >
              Hide Admin Credentials
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="h-8 w-8 border-3 border-[#1A73E8] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
