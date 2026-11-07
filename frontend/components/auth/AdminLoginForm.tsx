'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { GdgLogoBadge } from '@/components/ui/GoogleBrand'
import { ArrowLeft, ShieldCheck, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'

interface AdminLoginFormProps {
  onSuccess?: () => void
}

export function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const { user, adminPasswordLogin } = useAuth()

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = adminEmail.trim()
    const password = adminPassword

    if (!email || !password) {
      setErrorMessage('Please enter both host identifier and security key.')
      return
    }

    console.log('[GDG Admin] Authenticating host credentials for:', email)
    setErrorMessage(null)
    setLoading(true)

    try {
      const res = await adminPasswordLogin(email, password)
      if (res.success) {
        console.log('[GDG Admin] Host authenticated successfully')
        setSuccessMessage('Verified. Loading Host Command Center...')
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 300)
      } else {
        console.warn('[GDG Admin] Host authentication failed:', res.message)
        setErrorMessage(res.message || 'Invalid host credentials. Please verify your email and security key.')
      }
    } catch (err) {
      console.error('[GDG Admin] Host login exception:', err)
      setErrorMessage('Server or network error during admin login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-4 py-12 text-[#111827] relative selection:bg-[#111827] selection:text-white">
      {/* Return to Hub */}
      <div className="mb-4 w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Hub</span>
        </Link>
      </div>

      {/* Admin Login Card */}
      <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-7 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.03)] relative">
        {/* GDG Branding */}
        <div className="flex flex-col items-center text-center">
          <GdgLogoBadge />
          <span className="font-mono text-[9px] tracking-[0.26em] uppercase text-[#9CA3AF] mt-3">
            HOST GATEWAY // RESTRICTED ACCESS
          </span>
          <h1 className="text-3xl font-normal tracking-[-0.035em] text-[#111827] mt-1">
            Organizer Portal
          </h1>
          <p className="mt-1.5 text-xs text-[#6B7280] leading-relaxed max-w-xs">
            Authorized Chapter Leads and Event Administrators only. Enter your host credentials to access the command center.
          </p>
        </div>

        {user && user.role !== 'ADMIN' && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FFFBEB] p-2.5 text-xs text-[#92400E] border border-[#FEF3C7]">
            <span className="leading-snug">Currently signed in as participant <strong>{user.name}</strong>. Enter Chapter Lead credentials below to access host tools.</span>
          </div>
        )}

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FEF2F2] p-3 text-xs text-[#DC2626] border border-[#FEE2E2]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#F0FDF4] p-3 text-xs text-[#16A34A] border border-[#DCFCE7]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Admin Credentials Form ONLY */}
        <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6B7280] mb-1.5 flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-[#9CA3AF]" />
              <span>Host Identifier</span>
            </label>
            <input
              type="email"
              autoFocus
              name="admin-email"
              autoComplete="off"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="host@gdg.community"
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#111827] transition-all"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6B7280] mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-[#9CA3AF]" />
              <span>Security Key</span>
            </label>
            <input
              type="password"
              name="admin-password"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#111827] transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#111827] text-xs font-medium tracking-wide uppercase text-white hover:bg-black active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{loading ? 'Authenticating...' : 'Enter Host Center'}</span>
          </button>

          <p className="text-center font-mono text-[9px] uppercase tracking-wider text-[#9CA3AF] mt-1">
            Protected console • Chapter Leads only
          </p>
        </form>
      </div>
    </div>
  )
}
