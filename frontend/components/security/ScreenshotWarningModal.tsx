'use client'

import React from 'react'
import { Camera, ShieldAlert, AlertTriangle, AlertOctagon, Lock } from 'lucide-react'

interface ScreenshotWarningModalProps {
  warningCount: number
  maxWarnings?: number
  onAcknowledge: () => void
  isDisqualified: boolean
}

export function ScreenshotWarningModal({
  warningCount,
  maxWarnings = 3,
  onAcknowledge,
  isDisqualified,
}: ScreenshotWarningModalProps) {
  const isFinalWarning = warningCount === 2
  const isTerminated = isDisqualified || warningCount >= maxWarnings

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Heavy Blur & Red Security Hue */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" />

      {/* Security Warning Card */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] border border-white/80 bg-white p-7 text-center shadow-[0_25px_60px_-15px_rgba(234,67,53,0.3)] animate-in zoom-in-95 duration-300">
        {/* Top Google 4-Color Danger Accent Bar */}
        <div
          className={`absolute top-0 inset-x-0 h-2 ${
            isTerminated
              ? 'bg-[#EA4335]'
              : isFinalWarning
              ? 'bg-[#FBBC04]'
              : 'bg-gradient-to-r from-[#EA4335] via-[#FBBC04] to-[#EA4335]'
          }`}
        />

        {/* Animated Shield / Camera Warning Radar Icon */}
        <div className="my-3 relative mx-auto flex h-24 w-24 items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              isTerminated
                ? 'border-[#EA4335]/40 animate-ping'
                : 'border-[#FBBC04]/50 animate-ripple-1'
            } pointer-events-none`}
          />
          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg ring-8 transition-all ${
              isTerminated
                ? 'bg-[#FCE8E6] text-[#EA4335] ring-[#FCE8E6]/60 animate-bounce'
                : isFinalWarning
                ? 'bg-[#FEF7E0] text-[#B06000] ring-[#FEF7E0]/60'
                : 'bg-[#FCE8E6] text-[#EA4335] ring-[#FCE8E6]/60'
            }`}
          >
            {isTerminated ? (
              <AlertOctagon className="h-10 w-10 text-[#EA4335] animate-pulse" />
            ) : isFinalWarning ? (
              <ShieldAlert className="h-10 w-10 text-[#B06000]" />
            ) : (
              <Camera className="h-10 w-10 text-[#EA4335]" />
            )}
          </div>
        </div>

        {/* Badge Pill */}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider shadow-2xs mb-2">
          {isTerminated ? (
            <span className="flex items-center gap-1.5 text-[#C5221F] bg-[#FCE8E6] px-3 py-1 rounded-full border border-[#EA4335]/30">
              <Lock className="h-3 w-3" />
              <span>Assessment Terminated</span>
            </span>
          ) : (
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                isFinalWarning
                  ? 'text-[#B06000] bg-[#FEF7E0] border-[#FBBC04]/40'
                  : 'text-[#C5221F] bg-[#FCE8E6] border-[#EA4335]/30'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>
                Security Warning {warningCount} of {maxWarnings}
              </span>
            </span>
          )}
        </div>

        <h3 className="text-xl font-extrabold tracking-tight text-[#202124]">
          {isTerminated
            ? 'Disqualified by Security'
            : isFinalWarning
            ? 'Final Warning: Screenshot Detected'
            : 'Screenshot Attempt Detected!'}
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-[#5F6368] leading-relaxed">
          {isTerminated
            ? 'Maximum allowed warnings (3 of 3) have been exceeded. Your session has been flagged and submitted to the event host.'
            : isFinalWarning
            ? 'Screenshots and screen capture are strictly forbidden. One more attempt will automatically terminate and disqualify your challenge.'
            : 'Taking screenshots and copying questions or options is strictly prohibited during the live contest.'}
        </p>

        {/* Notice Box */}
        <div className="my-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-left text-[11px] text-[#6B7280]">
          <div className="flex items-center justify-between font-semibold text-[#202124] mb-1">
            <span>Security Status:</span>
            <span className={isTerminated ? 'text-[#EA4335]' : 'text-[#B06000]'}>
              Reported to Event Host
            </span>
          </div>
          <span>
            This security violation has been logged in real time and dispatched to the GDG Admin Command Center.
          </span>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onAcknowledge}
            className={`w-full h-11 rounded-full font-semibold text-xs shadow-sm transition-all active:scale-95 ${
              isTerminated
                ? 'bg-[#EA4335] text-white hover:bg-[#D93025]'
                : isFinalWarning
                ? 'bg-[#EA4335] text-white hover:bg-[#D93025]'
                : 'bg-[#1A73E8] text-white hover:bg-[#1765CC]'
            }`}
          >
            {isTerminated ? 'Acknowledge & Exit' : 'I Understand & Resume Contest'}
          </button>
        </div>
      </div>
    </div>
  )
}
