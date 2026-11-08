'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeartCrack, Home, X, Sparkles } from 'lucide-react'

interface BirdGuiltEasterEggModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BirdGuiltEasterEggModal({
  isOpen,
  onClose,
}: BirdGuiltEasterEggModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const handleReturnHome = () => {
    try {
      localStorage.setItem('gdg_bird_catch_count', '0')
    } catch {}
    onClose()
    router.push('/')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300"
    >
      {/* Ambient Radial Gradient Halo */}
      <div className="absolute inset-0 bg-radial-[circle_at_center] from-red-950/30 via-transparent to-transparent pointer-events-none" />

      {/* Floating Feather Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[10%] left-[15%] text-neutral-400/40 text-xl anim-feather-fall-1">🪶</span>
        <span className="absolute top-[20%] right-[20%] text-neutral-400/40 text-lg anim-feather-fall-2">🪶</span>
        <span className="absolute top-[35%] left-[30%] text-neutral-400/30 text-2xl anim-feather-fall-3">🪶</span>
        <span className="absolute top-[15%] right-[35%] text-neutral-400/30 text-base anim-feather-fall-1">🪶</span>
      </div>

      {/* Modal Surface */}
      <div className="relative w-full max-w-xl rounded-3xl border border-[#334155]/60 bg-[#0B132B] p-6 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-center animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close message"
          className="absolute top-5 right-5 h-8 w-8 rounded-full border border-neutral-700/80 bg-neutral-800/60 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors flex items-center justify-center cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top Eyebrow Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-[10px] font-mono tracking-[0.24em] uppercase text-red-400 mb-5">
          <HeartCrack className="h-3.5 w-3.5 text-red-400 animate-pulse" />
          <span>BIRD SANCTUARY ALERT • 10 BIRDS STRUCK</span>
        </div>

        {/* Playful Animated Hand Vector Illustration */}
        <div className="mx-auto my-3 flex justify-center">
          <div className="relative anim-middle-finger-sway">
            <svg
              viewBox="0 0 100 120"
              className="w-24 h-28 sm:w-28 sm:h-32 overflow-visible drop-shadow-[0_8px_24px_rgba(239,68,68,0.3)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Arm & Palm Shadow */}
              <ellipse cx="50" cy="115" rx="36" ry="8" fill="#030712" opacity="0.6" />

              {/* Forearm Base */}
              <path
                d="M 38 115 L 38 90 C 38 86, 62 86, 62 90 L 62 115 Z"
                fill="#F87171"
              />

              {/* Palm Mass */}
              <path
                d="M 28 88 C 24 82, 24 68, 30 62 C 34 58, 42 58, 46 62 L 50 64 L 54 62 C 58 58, 66 58, 70 62 C 76 68, 76 82, 72 88 C 66 94, 34 94, 28 88 Z"
                fill="#EF4444"
              />

              {/* Folded Index Finger */}
              <path
                d="M 32 64 C 30 52, 40 52, 42 62 C 42 68, 32 70, 32 64 Z"
                fill="#DC2626"
                stroke="#B91C1C"
                strokeWidth="1.2"
              />

              {/* ERECT EXTENDED MIDDLE FINGER */}
              <g className="anim-middle-finger-pulse">
                {/* Finger Shaft */}
                <path
                  d="M 43 62 L 43 24 C 43 14, 57 14, 57 24 L 57 62 Z"
                  fill="#F87171"
                  stroke="#DC2626"
                  strokeWidth="1.5"
                />
                {/* Finger Knuckle Creases */}
                <path d="M 45 42 Q 50 44 55 42" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 46 32 Q 50 34 54 32" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
                {/* Fingernail */}
                <path
                  d="M 46 22 C 46 17, 54 17, 54 22 C 54 26, 46 26, 46 22 Z"
                  fill="#FECACA"
                  stroke="#F87171"
                  strokeWidth="0.8"
                />
              </g>

              {/* Folded Ring Finger */}
              <path
                d="M 58 64 C 58 54, 68 54, 68 64 C 68 70, 58 70, 58 64 Z"
                fill="#DC2626"
                stroke="#B91C1C"
                strokeWidth="1.2"
              />

              {/* Folded Pinky Finger */}
              <path
                d="M 68 68 C 68 60, 77 60, 77 68 C 77 73, 68 74, 68 68 Z"
                fill="#B91C1C"
                stroke="#991B1B"
                strokeWidth="1.2"
              />

              {/* Folded Thumb Clamped Over Palm */}
              <path
                d="M 27 75 C 22 72, 24 64, 32 64 C 40 64, 44 72, 44 78 C 44 83, 30 84, 27 75 Z"
                fill="#F87171"
                stroke="#DC2626"
                strokeWidth="1.2"
              />

              {/* Tiny Band-Aid on Finger for Playful Style */}
              <rect
                x="44"
                y="46"
                width="12"
                height="6"
                rx="2"
                fill="#FEF08A"
                stroke="#CA8A04"
                strokeWidth="0.6"
              />
              <circle cx="48" cy="49" r="0.6" fill="#A16207" />
              <circle cx="52" cy="49" r="0.6" fill="#A16207" />
            </svg>
          </div>
        </div>

        {/* Narrative Title */}
        <h2 className="text-xl sm:text-2xl font-serif italic text-white tracking-tight mt-3 mb-4">
          A Message from the Campus Sanctuary
        </h2>

        {/* Verbatim Narrative Text */}
        <div className="space-y-3.5 text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed text-left max-h-[42vh] overflow-y-auto px-1 sm:px-2 pr-3 scrollbar-thin">
          <p>
            Congratulations on being such a heartless and cruel person. Imagine
            taking the lives of innocent birds that were simply flying around,
            trying to find food for their little ones waiting back in their
            nests. They had families to return to, hungry babies depending on
            them, and lives of their own. But apparently, showing even the
            slightest compassion was too much to expect from someone like you.
          </p>

          <p>
            You didn&apos;t just kill a few birds; you took away the chance for
            their helpless babies to be fed, their families to survive, and their
            little world to continue. What an achievement — destroying lives
            that couldn&apos;t even defend themselves. I hope you understand that
            what you did wasn&apos;t something to be proud of. It was a pathetic
            display of cruelty, ignorance, and a complete lack of humanity.
          </p>

          <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 font-medium text-white shadow-inner">
            <strong className="text-red-300 font-semibold">
              Even birds have more compassion for their families than you seem to
              have for living creatures.
            </strong>
          </p>
        </div>

        {/* Call to Action Button: Redirect Home */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleReturnHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs sm:text-sm font-medium text-[#0B132B] hover:bg-neutral-200 transition-all cursor-pointer shadow-lg active:scale-98"
          >
            <Home className="h-4 w-4" />
            <span>Return Home &amp; Promise Better</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/80 px-5 py-2.5 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white hover:border-neutral-500 transition-all cursor-pointer"
          >
            <span>Close (Dismiss Penance)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
