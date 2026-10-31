'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge } from '@/components/ui/GoogleBrand'
import { ShieldCheck, ArrowLeft, AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react'

function LoginContent() {
  const { user, adminPasswordLogin } = useAuth()
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Admin credentials state (clean empty inputs, no autofill)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      router.push('/admin')
    } else if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setAdminLoading(true)

    try {
      const res = await adminPasswordLogin(adminEmail.trim(), adminPassword.trim())
      if (res.success) {
        setSuccessMessage('Admin verified! Entering platform...')
        setTimeout(() => router.push('/admin'), 600)
      } else {
        setErrorMessage(res.message || 'Invalid admin credentials')
      }
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] px-4 py-12 text-[#202124]">
      {/* Return to hub */}
      <div className="mb-6 w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A73E8] hover:text-[#1765CC]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-[32px] border border-[#DADCE0] bg-white p-8 shadow-sm">
        {/* GDG Branding */}
        <div className="flex flex-col items-center text-center">
          <GdgLogoBadge />
          <h1 className="mt-3 text-2xl font-normal tracking-tight text-[#202124]">
            Admin Sign In
          </h1>
          <p className="mt-1 text-xs text-[#5F6368]">
            Enter your admin email and password to access the GDG controller.
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#FCE8E6] p-3 text-xs text-[#C5221F] border border-[#EA4335]/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#E6F4EA] p-3 text-xs text-[#137333] border border-[#34A853]/20">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34A853]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Admin Credential Form */}
        <form onSubmit={handleAdminSubmit} autoComplete="off" className="mt-6 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#3C4043] mb-1 flex items-center gap-1">
              <Mail className="h-3 w-3 text-[#5F6368]" />
              <span>Admin Email</span>
            </label>
            <input
              type="email"
              name="admin-email"
              autoComplete="off"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Enter admin email"
              className="w-full rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8] transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#3C4043] mb-1 flex items-center gap-1">
              <Lock className="h-3 w-3 text-[#5F6368]" />
              <span>Admin Password</span>
            </label>
            <input
              type="password"
              name="admin-password"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8] transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={adminLoading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1A73E8] text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{adminLoading ? 'Verifying Admin...' : 'Sign In as Admin'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1A73E8] border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
