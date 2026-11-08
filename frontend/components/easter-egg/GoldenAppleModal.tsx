'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { salmanAudio } from '@/lib/salmanAudio'
import { Sparkles, X, Compass, ChevronRight } from 'lucide-react'

interface GoldenAppleModalProps {
  isOpen: boolean
  onClose: () => void
  onEnterGame: () => void
}

export function GoldenAppleModal({
  isOpen,
  onClose,
  onEnterGame,
}: GoldenAppleModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      salmanAudio.playGoldenAppleChime()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden'
      }
    } else {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[99998] flex items-center justify-center p-3 xs:p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300 select-none overflow-y-auto"
    >
      {/* Background Golden Sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[15%] left-[15%] text-amber-300/40 text-xl animate-pulse">✨</span>
        <span className="absolute top-[25%] right-[20%] text-amber-400/40 text-2xl animate-pulse" style={{ animationDelay: '0.6s' }}>✨</span>
        <span className="absolute bottom-[20%] left-[25%] text-amber-300/40 text-lg animate-pulse" style={{ animationDelay: '1.2s' }}>✨</span>
        <span className="absolute bottom-[30%] right-[15%] text-amber-400/30 text-2xl animate-pulse" style={{ animationDelay: '1.8s' }}>✨</span>
      </div>

      {/* Discovery Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-amber-300/60 dark:border-amber-500/40 bg-gradient-to-b from-amber-50/90 via-white to-amber-50/80 dark:from-[#13192B] dark:via-[#0D1322] dark:to-[#080D1A] p-5 sm:p-8 shadow-[0_24px_70px_rgba(245,158,11,0.25)] text-center animate-in zoom-in-95 duration-300 flex flex-col my-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close discovery"
          className="absolute top-3.5 right-3.5 h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80 text-neutral-500 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        {/* Discovery Eyebrow Badge */}
        <div className="inline-flex items-center gap-1.5 self-center rounded-full border border-amber-400/60 bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-amber-700 dark:text-amber-300 mb-3 shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>SECRET EASTER EGG UNLOCKED</span>
        </div>

        {/* Golden Apple Emblem with Radiant Aura */}
        <div className="relative mx-auto my-2 flex items-center justify-center">
          <div className="absolute h-24 w-24 rounded-full bg-amber-400/25 blur-xl animate-pulse" />
          <svg
            viewBox="0 0 100 100"
            className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_10px_25px_rgba(245,158,11,0.5)] animate-bounce"
            style={{ animationDuration: '2.5s' }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="gold-apple-skin" x1="20" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="25%" stopColor="#FDE68A" />
                <stop offset="60%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="gold-leaf-grad" x1="50" y1="10" x2="70" y2="25" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#84CC16" />
              </linearGradient>
            </defs>

            {/* Apple Stem */}
            <path
              d="M 50 24 C 50 14, 56 10, 60 7"
              stroke="#78350F"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Emerald/Golden Leaf */}
            <path
              d="M 52 16 C 58 10, 72 12, 70 20 C 62 24, 54 20, 52 16 Z"
              fill="url(#gold-leaf-grad)"
              stroke="#65A30D"
              strokeWidth="0.8"
            />
            {/* Apple Body */}
            <path
              d="M 50 28 C 36 28, 16 38, 18 64 C 20 86, 38 94, 50 88 C 62 94, 80 86, 82 64 C 84 38, 64 28, 50 28 Z"
              fill="url(#gold-apple-skin)"
              stroke="#D97706"
              strokeWidth="1.4"
            />
            {/* Specular Light Reflection */}
            <ellipse cx="34" cy="45" rx="8" ry="14" fill="#FFFFFF" opacity="0.65" transform="rotate(-25 34 45)" />
            <circle cx="30" cy="65" r="3" fill="#FFFFFF" opacity="0.5" />
          </svg>
        </div>

        {/* Narrative Title */}
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight mt-1 mb-2">
          You Found the Hidden Golden Apple!
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-[13px] text-[#4B5563] dark:text-[#94A3B8] leading-relaxed mb-6 px-1">
          You shook the sacred oak tree and unearthed the golden fruit. The gateway to{' '}
          <strong className="text-amber-600 dark:text-amber-400 font-semibold">SALMAN DRIVING SCHOOL</strong> is now open. Take the wheel, accelerate down the nocturnal highway, and clear the road!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <button
            onClick={() => {
              onClose()
              onEnterGame()
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white px-6 py-3.5 text-xs sm:text-sm font-bold tracking-wide transition-all shadow-[0_8px_24px_rgba(245,158,11,0.35)] active:scale-98 cursor-pointer"
          >
            <span>Enter Salman Driving School</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[#4B5563] dark:text-[#CBD5E1] px-5 py-2.5 text-xs font-medium transition-all cursor-pointer shadow-2xs"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Keep Exploring Meadow</span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
