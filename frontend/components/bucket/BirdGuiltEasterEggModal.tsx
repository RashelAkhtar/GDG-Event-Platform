'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { HeartCrack, Home, X } from 'lucide-react'
import { soundManager } from '@/lib/sound'

// ============================================================================
// PROCEDURAL WEB AUDIO SYNTHESIZER: MOURNFUL / SORROWFUL BACKGROUND CHORDS
// Zero external files, 100% reliable, melancholic minor cadence with gentle vibrato
// ============================================================================

class SorrowAudioSynth {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isPlaying = false
  private loopTimer: NodeJS.Timeout | null = null
  private activeOscs: (OscillatorNode | GainNode)[] = []

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    return soundManager.getAudioContext()
  }

  playSorrow() {
    if (this.isPlaying) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      this.isPlaying = true

      const master = ctx.createGain()
      master.gain.setValueAtTime(0.001, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.8)
      master.connect(ctx.destination)
      this.masterGain = master

      // Melancholic weeping progression: Dm9 -> Bbmaj7 -> Gm6 -> Asus4 -> Dm
      const chords = [
        [146.83, 174.61, 220.0, 261.63], // Dm7 (D3, F3, A3, C4)
        [116.54, 174.61, 220.0, 293.66], // Bbmaj7 (Bb2, F3, A3, D4)
        [98.0, 146.83, 196.0, 233.08], // Gm (G2, D3, G3, Bb3)
        [110.0, 164.81, 220.0, 293.66], // Asus4 (A2, E3, A3, D4)
      ]

      let chordIdx = 0

      const stepChord = () => {
        if (!this.isPlaying) return
        const now = ctx.currentTime
        const freqs = chords[chordIdx % chords.length]
        chordIdx++

        // Fade out previous active oscillators
        this.activeOscs.forEach((node) => {
          if (node instanceof GainNode) {
            try {
              node.gain.linearRampToValueAtTime(0.0001, now + 0.6)
            } catch {}
          }
        })

        const nextOscs: (OscillatorNode | GainNode)[] = []

        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const noteGain = ctx.createGain()
          const filter = ctx.createBiquadFilter()

          // Warm, mournful flute/cello-like tone
          osc.type = idx === 0 ? 'sine' : 'triangle'
          osc.frequency.setValueAtTime(freq, now)

          // Subtle mournful weeping vibrato (4.2 Hz)
          const lfo = ctx.createOscillator()
          const lfoGain = ctx.createGain()
          lfo.frequency.setValueAtTime(4.2, now)
          lfoGain.gain.setValueAtTime(1.8, now)
          lfo.connect(osc.frequency)
          lfo.start(now)

          filter.type = 'lowpass'
          filter.frequency.setValueAtTime(550, now)

          // Soft slow envelope
          noteGain.gain.setValueAtTime(0.001, now)
          noteGain.gain.linearRampToValueAtTime(0.12 / freqs.length, now + 0.8)
          noteGain.gain.exponentialRampToValueAtTime(0.005, now + 3.8)

          osc.connect(filter)
          filter.connect(noteGain)
          noteGain.connect(master)

          osc.start(now)
          osc.stop(now + 4.0)
          lfo.stop(now + 4.0)

          nextOscs.push(osc, noteGain)
        })

        this.activeOscs = nextOscs

        if (this.isPlaying) {
          this.loopTimer = setTimeout(stepChord, 3600)
        }
      }

      stepChord()
    } catch {}
  }

  stopSorrow() {
    this.isPlaying = false
    if (this.loopTimer) {
      clearTimeout(this.loopTimer)
      this.loopTimer = null
    }
    const ctx = this.getContext()
    if (this.masterGain && ctx) {
      try {
        const now = ctx.currentTime
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.35)
        setTimeout(() => {
          this.activeOscs.forEach((node) => {
            if (node instanceof OscillatorNode) {
              try {
                node.stop()
              } catch {}
            }
          })
          this.activeOscs = []
        }, 400)
      } catch {}
    }
  }
}

const sorrowSynth = new SorrowAudioSynth()

// ============================================================================
// BIRD GUILT EASTER EGG FULL-SCREEN TAKE OVER MODAL (LIGHT THEME)
// Uses React Portal (document.body) to render with z-[99999] in front of everything
// ============================================================================

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

  // Audio lifecycle: play sorrow music when open, stop on dismiss
  useEffect(() => {
    if (isOpen) {
      sorrowSynth.playSorrow()
      // Lock body scroll while modal is active
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden'
      }
    } else {
      sorrowSynth.stopSorrow()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }

    return () => {
      sorrowSynth.stopSorrow()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const handleReturnHome = () => {
    try {
      localStorage.setItem('gdg_bird_catch_count', '0')
    } catch {}
    sorrowSynth.stopSorrow()
    onClose()
    router.push('/')
  }

  const handleClose = () => {
    sorrowSynth.stopSorrow()
    onClose()
  }

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-300 select-none"
    >
      {/* Floating Sorrow Feathers in Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[8%] left-[12%] text-neutral-400/50 text-2xl anim-feather-fall-1">🪶</span>
        <span className="absolute top-[18%] right-[16%] text-neutral-400/50 text-xl anim-feather-fall-2">🪶</span>
        <span className="absolute top-[32%] left-[28%] text-neutral-400/40 text-3xl anim-feather-fall-3">🪶</span>
        <span className="absolute top-[14%] right-[32%] text-neutral-400/40 text-lg anim-feather-fall-1">🪶</span>
      </div>

      {/* Light Theme Modal Surface */}
      <div className="relative w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.35)] text-center animate-in zoom-in-95 slide-in-from-bottom-3 duration-300">
        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close message"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 h-8 w-8 rounded-full border border-neutral-200 bg-neutral-100 text-neutral-500 hover:text-black hover:border-neutral-300 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top Eyebrow Tag: replaced struck with killed */}
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-[10px] sm:text-[10.5px] font-mono tracking-[0.24em] uppercase text-red-600 mb-4 shadow-2xs">
          <HeartCrack className="h-3.5 w-3.5 text-red-500 animate-pulse" />
          <span>BIRD SANCTUARY ALERT • 10 BIRDS KILLED</span>
        </div>

        {/* Playful Animated Hand Vector Illustration */}
        <div className="mx-auto my-2 flex justify-center">
          <div className="relative anim-middle-finger-sway">
            <svg
              viewBox="0 0 100 120"
              className="w-22 h-26 sm:w-26 sm:h-30 overflow-visible drop-shadow-[0_8px_20px_rgba(239,68,68,0.25)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Arm & Palm Shadow */}
              <ellipse cx="50" cy="115" rx="36" ry="8" fill="#E2E8F0" opacity="0.8" />

              {/* Forearm Base */}
              <path
                d="M 38 115 L 38 90 C 38 86, 62 86, 62 90 L 62 115 Z"
                fill="#FCA5A5"
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
                {/* Knuckle Creases */}
                <path d="M 45 42 Q 50 44 55 42" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 46 32 Q 50 34 54 32" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
                {/* Fingernail */}
                <path
                  d="M 46 22 C 46 17, 54 17, 54 22 C 54 26, 46 26, 46 22 Z"
                  fill="#FEE2E2"
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

              {/* Playful Band-Aid on Finger */}
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
        <h2 className="text-2xl sm:text-3xl font-serif italic text-[#111827] tracking-tight mt-2 mb-3.5 leading-tight">
          A Message from the Campus Sanctuary
        </h2>

        {/* Verbatim Narrative Text in High-Contrast Light Theme */}
        <div className="space-y-3 text-xs sm:text-[13.5px] text-[#4B5563] font-normal leading-relaxed text-left max-h-[38vh] overflow-y-auto px-1 sm:px-2 pr-3 scrollbar-thin">
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

          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3.5 sm:p-4 text-red-900 shadow-2xs">
            <strong className="font-semibold text-red-700 sm:text-[14.5px] text-xs tracking-tight">
              Even birds have more compassion for their families than you seem to
              have for living creatures.
            </strong>
          </div>
        </div>

        {/* Call to Action Button: Redirect Home & Seek Forgiveness */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleReturnHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#111827] hover:bg-black text-white px-7 py-3 text-xs sm:text-sm font-medium transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Return Home &amp; Promise Better</span>
          </button>

          <button
            onClick={handleClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-[#4B5563] hover:text-[#111827] px-5 py-3 text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-2xs"
          >
            <span>Dismiss Penance</span>
          </button>
        </div>
      </div>
    </div>
  )

  // Attach modal directly to document.body so it is 100% on top of all stacking contexts
  return createPortal(modalContent, document.body)
}
