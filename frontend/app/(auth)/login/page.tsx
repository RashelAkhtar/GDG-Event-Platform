'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge, GoogleG } from '@/components/ui/GoogleBrand'
import { ShieldCheck, ArrowLeft, AlertCircle, CheckCircle2, Lock, Mail, Users } from 'lucide-react'

function LoginContent() {
  const { user, loginWithGoogle, adminPasswordLogin, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  const initialTab = searchParams.get('tab') === 'admin' || searchParams.get('role') === 'admin' ? 'admin' : 'participant'

  const [activeTab, setActiveTab] = useState<'participant' | 'admin'>(initialTab)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Admin credentials state
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] px-4 py-12 text-[#202124] relative overflow-hidden bg-tech-dots">
      {/* Ambient Google Aurora Glow Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[#4285F4]/12 blur-3xl animate-aurora" />
        <div className="absolute top-1/2 -right-32 h-[420px] w-[420px] rounded-full bg-[#FBBC04]/12 blur-3xl animate-aurora" style={{ animationDelay: '-6s' }} />
        <div className="absolute -bottom-32 left-1/3 h-[420px] w-[420px] rounded-full bg-[#34A853]/10 blur-3xl animate-aurora" style={{ animationDelay: '-12s' }} />
      </div>

      {/* Return to hub */}
      <div className="mb-4 w-full max-w-md relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#1A73E8] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] shadow-2xs transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Hub</span>
        </Link>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-[#DADCE0] bg-white p-7 sm:p-9 shadow-md relative z-10">
        {/* GDG Branding */}
        <div className="flex flex-col items-center text-center">
          <GdgLogoBadge />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#202124]">
            {activeTab === 'participant' ? 'Welcome to GDG Arena' : 'Organizer & Admin Access'}
          </h1>
          <p className="mt-1.5 text-xs text-[#5F6368] leading-relaxed max-w-xs">
            {activeTab === 'participant'
              ? 'Sign in with your Google account to participate in live sprint quizzes and compete on official leaderboards.'
              : 'Enter your credentials to manage live questions, customize puzzle arenas, and oversee ceremonies.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex rounded-full bg-[#F1F3F4] p-1 border border-[#DADCE0]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('participant')
              setErrorMessage(null)
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-medium transition-all ${
              activeTab === 'participant'
                ? 'bg-white text-[#1A73E8] shadow-xs font-semibold'
                : 'text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Participant</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin')
              setErrorMessage(null)
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-white text-[#1A73E8] shadow-xs font-semibold'
                : 'text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin / Host</span>
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FCE8E6] p-3 text-xs text-[#C5221F] border border-[#EA4335]/30">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#E6F4EA] p-3 text-xs text-[#137333] border border-[#34A853]/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34A853]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: PARTICIPANT LOGIN (Google OAuth) */}
        {activeTab === 'participant' && (
          <div className="mt-6 flex flex-col gap-4">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#DADCE0] bg-white text-xs font-semibold text-[#3C4043] shadow-xs hover:border-[#1A73E8] hover:bg-[#F8F9FA] active:scale-[0.99] transition-all cursor-pointer"
            >
              <GoogleG className="h-5 w-5" />
              <span>Sign in with Google</span>
            </button>

            <div className="rounded-xl bg-[#E8F0FE]/60 border border-[#1A73E8]/20 p-3.5 text-center">
              <p className="text-[11px] text-[#1967D2] font-medium leading-relaxed">
                Google account verification is required to record your quiz points and unlock the live word puzzle grid.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: ORGANIZER & ADMIN LOGIN (Strictly Credentials - NO Google Login Option) */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} autoComplete="off" className="mt-6 flex flex-col gap-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-[#3C4043] mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#5F6368]" />
                <span>Admin Email</span>
              </label>
              <input
                type="email"
                name="admin-email"
                autoComplete="off"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@gdg.org"
                className="w-full rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3C4043] mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#5F6368]" />
                <span>Admin Password</span>
              </label>
              <input
                type="password"
                name="admin-password"
                autoComplete="new-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={adminLoading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1A73E8] text-xs font-semibold text-white shadow-xs hover:bg-[#1557B0] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{adminLoading ? 'Verifying Credentials...' : 'Sign In as Admin'}</span>
            </button>

            <p className="text-center text-[11px] text-[#5F6368]">
              Restricted to authorized GDG organizers and chapter leads.
            </p>
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
          <div className="h-8 w-8 rounded-full border-3 border-[#1A73E8] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
