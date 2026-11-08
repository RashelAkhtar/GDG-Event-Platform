'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { HeartCrack, Home, X, Volume2, VolumeX } from 'lucide-react'
import { soundManager } from '@/lib/sound'

// ============================================================================
// PROCEDURAL WEB AUDIO SYNTHESIZER: RICH SORROWFUL REQUIEM / CHORD PROGRESSION
// 100% reliable, zero external files, warm orchestral cello pad + weeping melody
// ============================================================================

export class SorrowAudioSynth {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isPlaying = false
  private loopTimer: NodeJS.Timeout | null = null
  private activeNodes: AudioNode[] = []
  private isMutedByUser = false

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    return soundManager.getAudioContext()
  }

  /**
   * Pre-warm AudioContext inside a synchronous user interaction event
   */
  public preWarm() {
    const ctx = this.getContext()
    if (ctx && ctx.state === 'suspended') {
      try {
        void ctx.resume()
      } catch {}
    }
  }

  public async playSorrow() {
    if (this.isPlaying || this.isMutedByUser) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      this.isPlaying = true

      const master = ctx.createGain()
      master.gain.setValueAtTime(0.001, ctx.currentTime)
      // Clearly audible, immersive volume
      master.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 1.0)
      master.connect(ctx.destination)
      this.masterGain = master

      // Emotional minor progression: Dm9 -> Bbmaj7 -> Gm6 -> A7sus4 -> Dm
      const chordProgressions = [
        {
          bass: 146.83, // D3
          pad: [220.0, 261.63, 329.63, 349.23], // A3, C4, E4, F4
          melody: 440.0, // A4
        },
        {
          bass: 116.54, // Bb2
          pad: [174.61, 220.0, 293.66, 349.23], // F3, A3, D4, F4
          melody: 392.0, // G4
        },
        {
          bass: 98.0, // G2
          pad: [146.83, 196.0, 233.08, 329.63], // D3, G3, Bb3, E4
          melody: 349.23, // F4
        },
        {
          bass: 110.0, // A2
          pad: [164.81, 220.0, 293.66, 392.0], // E3, A3, D4, G4
          melody: 329.63, // E4
        },
      ]

      let chordIdx = 0

      const playNextChord = () => {
        if (!this.isPlaying || !this.masterGain) return
        const now = ctx.currentTime
        const chord = chordProgressions[chordIdx % chordProgressions.length]
        chordIdx++

        // Fade out previous active oscillators
        const oldNodes = [...this.activeNodes]
        this.activeNodes = []
        oldNodes.forEach((node) => {
          if (node instanceof GainNode) {
            try {
              node.gain.linearRampToValueAtTime(0.0001, now + 0.8)
            } catch {}
          }
        })
        setTimeout(() => {
          oldNodes.forEach((node) => {
            if (node instanceof OscillatorNode) {
              try {
                node.stop()
                node.disconnect()
              } catch {}
            }
          })
        }, 900)

        const currentNodes: AudioNode[] = []

        // 1. Deep Sub Bass Note (Sine wave with warm lowpass)
        const bassOsc = ctx.createOscillator()
        const bassGain = ctx.createGain()
        bassOsc.type = 'sine'
        bassOsc.frequency.setValueAtTime(chord.bass, now)
        bassGain.gain.setValueAtTime(0.001, now)
        bassGain.gain.linearRampToValueAtTime(0.24, now + 1.0)
        bassGain.gain.exponentialRampToValueAtTime(0.08, now + 3.8)
        bassOsc.connect(bassGain)
        bassGain.connect(master)
        bassOsc.start(now)
        bassOsc.stop(now + 4.2)
        currentNodes.push(bassOsc, bassGain)

        // 2. Warm Orchestral Pad Chords (Triangle & Sine with tape lowpass filter)
        chord.pad.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const padGain = ctx.createGain()
          const filter = ctx.createBiquadFilter()

          osc.type = idx % 2 === 0 ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime(freq, now)

          // Soft chorus detune (+/- 2.5 cents)
          osc.detune.setValueAtTime((idx - 1.5) * 2.5, now)

          filter.type = 'lowpass'
          filter.frequency.setValueAtTime(750 + idx * 70, now)

          padGain.gain.setValueAtTime(0.001, now)
          padGain.gain.linearRampToValueAtTime(0.09, now + 1.2)
          padGain.gain.exponentialRampToValueAtTime(0.015, now + 3.9)

          osc.connect(filter)
          filter.connect(padGain)
          padGain.connect(master)

          osc.start(now)
          osc.stop(now + 4.2)
          currentNodes.push(osc, padGain)
        })

        // 3. Weeping High String Solo Voice (Soulful slow vibrato)
        const leadOsc = ctx.createOscillator()
        const leadGain = ctx.createGain()
        const leadFilter = ctx.createBiquadFilter()
        const vibrato = ctx.createOscillator()
        const vibratoGain = ctx.createGain()

        leadOsc.type = 'sine'
        leadOsc.frequency.setValueAtTime(chord.melody, now)

        // Human weeping vibrato (4.5 Hz, depth 2.8 Hz)
        vibrato.frequency.setValueAtTime(4.5, now)
        vibratoGain.gain.setValueAtTime(2.8, now)
        vibrato.connect(leadOsc.frequency)
        vibrato.start(now)
        vibrato.stop(now + 4.2)

        leadFilter.type = 'bandpass'
        leadFilter.frequency.setValueAtTime(chord.melody, now)
        leadFilter.Q.setValueAtTime(1.8, now)

        leadGain.gain.setValueAtTime(0.001, now + 0.3)
        leadGain.gain.linearRampToValueAtTime(0.14, now + 1.4)
        leadGain.gain.exponentialRampToValueAtTime(0.005, now + 4.0)

        leadOsc.connect(leadFilter)
        leadFilter.connect(leadGain)
        leadGain.connect(master)

        leadOsc.start(now + 0.3)
        leadOsc.stop(now + 4.2)
        currentNodes.push(leadOsc, leadGain, vibrato)

        this.activeNodes = currentNodes

        if (this.isPlaying) {
          this.loopTimer = setTimeout(playNextChord, 3600)
        }
      }

      playNextChord()
    } catch (err) {
      console.warn('Sorrow audio error:', err)
    }
  }

  public stopSorrow() {
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
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.4)
        setTimeout(() => {
          this.activeNodes.forEach((node) => {
            if (node instanceof OscillatorNode) {
              try {
                node.stop()
                node.disconnect()
              } catch {}
            }
          })
          this.activeNodes = []
        }, 450)
      } catch {}
    }
  }

  public toggleMute(): boolean {
    if (this.isMutedByUser) {
      this.isMutedByUser = false
      void this.playSorrow()
      return false
    } else {
      this.isMutedByUser = true
      this.stopSorrow()
      return true
    }
  }

  public isMuted(): boolean {
    return this.isMutedByUser
  }

  public isAudioPlaying(): boolean {
    return this.isPlaying
  }
}

export const sorrowSynth = new SorrowAudioSynth()

// ============================================================================
// REALISTIC ANATOMICAL HAND & PLAYFUL SALUTE ILLUSTRATION
// ============================================================================

function RealisticHandSalute({ onBounce }: { onBounce?: () => void }) {
  const [bouncing, setBouncing] = useState(false)

  const handleClick = () => {
    setBouncing(true)
    onBounce?.()
    setTimeout(() => setBouncing(false), 600)
  }

  return (
    <div
      onClick={handleClick}
      aria-label="Playful hand illustration"
      className={`relative select-none cursor-pointer transition-transform duration-300 ${
        bouncing ? 'scale-115 -rotate-6' : 'hover:scale-108 hover:-rotate-3 active:scale-95'
      }`}
    >
      <div className="anim-hand-spring-pop">
        <div className="anim-hand-cheeky-sway">
          <svg
            viewBox="0 0 160 210"
            className="w-28 h-36 sm:w-34 sm:h-44 overflow-visible drop-shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Natural Skin Tone Base Gradients */}
              <linearGradient id="skin-base-grad" x1="80" y1="20" x2="80" y2="200" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFF2EB" />
                <stop offset="30%" stopColor="#F8C8B0" />
                <stop offset="70%" stopColor="#EAA386" />
                <stop offset="100%" stopColor="#C97453" />
              </linearGradient>

              {/* Cylindrical 3D Middle Finger Shaft Gradient */}
              <linearGradient id="skin-shaft-grad" x1="68" y1="50" x2="92" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFBAA6" />
                <stop offset="25%" stopColor="#FFF4EE" />
                <stop offset="55%" stopColor="#F8C4AE" />
                <stop offset="85%" stopColor="#DC8364" />
                <stop offset="100%" stopColor="#B85E3E" />
              </linearGradient>

              {/* Palm Volume Radial Gradient */}
              <radialGradient id="skin-palm-grad" cx="50%" cy="65%" r="55%">
                <stop offset="0%" stopColor="#FFF5F0" />
                <stop offset="50%" stopColor="#F8C5AF" />
                <stop offset="85%" stopColor="#DC8466" />
                <stop offset="100%" stopColor="#BA6242" />
              </radialGradient>

              {/* Translucent Fingernail Bed Gradient */}
              <linearGradient id="nail-bed-grad" x1="80" y1="22" x2="80" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#FBE3D8" />
                <stop offset="100%" stopColor="#F1B6A4" />
              </linearGradient>

              {/* Golden Signet Ring Gradient */}
              <linearGradient id="gold-ring-grad" x1="70" y1="79" x2="90" y2="86" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="75%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>

              {/* Soft Ambient Contact Shadow */}
              <radialGradient id="hand-contact-shadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.14" />
                <stop offset="65%" stopColor="#000000" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 0. Ambient Ground Contact Shadow */}
            <ellipse cx="80" cy="202" rx="46" ry="7" fill="url(#hand-contact-shadow)" />

            {/* 1. Forearm & Wrist Section */}
            <g>
              <path
                d="M 64 200 C 65 178, 66 160, 68 148 L 92 148 C 94 160, 95 178, 96 200 Z"
                fill="url(#skin-base-grad)"
              />
              {/* Carpal Tendon Specular Highlight */}
              <path
                d="M 76 192 C 77 172, 78 158, 78 148"
                stroke="#FFF7F2"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M 84 190 C 84.5 175, 84 160, 83 148"
                stroke="#C97453"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.4"
              />
            </g>

            {/* 2. Main Palm Mass & Muscular Thenar Contour */}
            <path
              d="M 50 148 C 38 140, 36 120, 42 106 C 46 96, 56 94, 64 98 L 72 100 L 88 100 L 96 98 C 104 94, 114 98, 118 108 C 124 122, 120 140, 110 148 Z"
              fill="url(#skin-palm-grad)"
            />

            {/* 3. Curled Pinky Finger (Right flank) */}
            <g>
              <path
                d="M 104 104 C 114 98, 122 106, 120 118 C 118 128, 108 132, 102 128 C 98 125, 98 116, 102 110 Z"
                fill="url(#skin-base-grad)"
                stroke="#C97453"
                strokeWidth="0.8"
              />
              <path d="M 106 114 Q 112 116 117 113" stroke="#A85235" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* 4. Curled Ring Finger (Right of middle) */}
            <g>
              <path
                d="M 88 100 C 98 94, 108 100, 108 112 C 108 124, 98 130, 90 126 C 84 123, 84 112, 88 104 Z"
                fill="url(#skin-base-grad)"
                stroke="#C97453"
                strokeWidth="0.8"
              />
              <path d="M 91 108 Q 98 111 105 107" stroke="#A85235" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 92 118 Q 97 120 102 118" stroke="#A85235" strokeWidth="1.0" strokeLinecap="round" opacity="0.8" />
            </g>

            {/* 5. Curled Index Finger (Left of middle) */}
            <g>
              <path
                d="M 52 100 C 62 94, 72 100, 72 112 C 72 124, 62 130, 54 126 C 48 123, 48 112, 52 104 Z"
                fill="url(#skin-base-grad)"
                stroke="#C97453"
                strokeWidth="0.8"
              />
              <path d="M 55 108 Q 62 111 69 107" stroke="#A85235" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 56 118 Q 61 120 66 118" stroke="#A85235" strokeWidth="1.0" strokeLinecap="round" opacity="0.8" />
            </g>

            {/* 6. Cross-Folded Thumb Clamped Firmly Across Front */}
            <g>
              <path
                d="M 40 134 C 36 122, 38 110, 48 106 C 56 102, 68 106, 74 114 C 77 120, 74 126, 66 128 C 56 130, 46 142, 40 134 Z"
                fill="url(#skin-base-grad)"
                stroke="#C97453"
                strokeWidth="0.8"
              />
              {/* Natural Thumbnail */}
              <ellipse
                cx="67"
                cy="119"
                rx="4.5"
                ry="3"
                fill="url(#nail-bed-grad)"
                transform="rotate(-15 67 119)"
                stroke="#E5A186"
                strokeWidth="0.5"
              />
              {/* Interphalangeal Thumb Crease */}
              <path d="M 52 110 Q 56 116 62 112" stroke="#A85235" strokeWidth="1.3" strokeLinecap="round" />
            </g>

            {/* 7. THE STATUESQUE EXTENDED MIDDLE FINGER */}
            <g className="anim-middle-finger-salute">
              {/* Main Finger Shaft */}
              <path
                d="M 70 102 L 70 34 C 70 18, 90 18, 90 34 L 90 102 Z"
                fill="url(#skin-shaft-grad)"
                stroke="#C97453"
                strokeWidth="0.8"
              />

              {/* Subsurface Rosy Knuckle & Fingertip Pad Blush */}
              <ellipse cx="80" cy="24" rx="7.5" ry="5.5" fill="#E88274" opacity="0.32" />
              <ellipse cx="80" cy="73" rx="8" ry="4" fill="#E88274" opacity="0.28" />

              {/* Proximal Interphalangeal Knuckle Creases (y = 72) */}
              <path d="M 72 72 Q 80 75 88 72" stroke="#A85235" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 74 75.5 Q 80 78 86 75.5" stroke="#A85235" strokeWidth="1.0" strokeLinecap="round" opacity="0.85" />

              {/* Distal Interphalangeal Knuckle Creases (y = 46) */}
              <path d="M 73 46 Q 80 49 87 46" stroke="#A85235" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 75 49 Q 80 51.5 85 49" stroke="#A85235" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />

              {/* Realistic Manicured Fingernail */}
              {/* Cuticle Rim */}
              <path d="M 73.5 38 C 73.5 34, 86.5 34, 86.5 38" stroke="#DC8364" strokeWidth="0.8" fill="none" />
              {/* Nail Body */}
              <path d="M 74 38 L 74 27 C 74 22, 86 22, 86 27 L 86 38 Z" fill="url(#nail-bed-grad)" />
              {/* Lunula Half-Moon */}
              <path d="M 76.5 38 C 76.5 34.5, 83.5 34.5, 83.5 38 Z" fill="#FFFFFF" opacity="0.75" />
              {/* Specular White Gloss Arc */}
              <path
                d="M 75 27 C 75 24, 85 24, 85 27"
                stroke="#FFFFFF"
                strokeWidth="1.1"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path d="M 75.5 28 L 75.5 36" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />

              {/* Chic Signet Golden Band on Finger */}
              <rect
                x="69.5"
                y="80"
                width="21"
                height="5.5"
                rx="2"
                fill="url(#gold-ring-grad)"
                stroke="#B45309"
                strokeWidth="0.6"
              />
              <rect x="78" y="81" width="4" height="3.5" rx="0.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}

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
  const [isAudioMuted, setIsAudioMuted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Audio lifecycle: play sorrow music when open, stop on dismiss
  useEffect(() => {
    if (isOpen) {
      void sorrowSynth.playSorrow()
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

  const handleReturnHome = useCallback(() => {
    try {
      localStorage.setItem('gdg_bird_catch_count', '0')
    } catch {}
    sorrowSynth.stopSorrow()
    onClose()
    router.push('/')
  }, [onClose, router])

  const handleClose = useCallback(() => {
    sorrowSynth.stopSorrow()
    onClose()
  }, [onClose])

  const handleToggleAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const muted = sorrowSynth.toggleMute()
    setIsAudioMuted(muted)
  }, [])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => void sorrowSynth.playSorrow()}
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
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.35)] text-center animate-in zoom-in-95 slide-in-from-bottom-3 duration-300"
      >
        {/* Audio Toggle & Close Buttons */}
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-2">
          <button
            onClick={handleToggleAudio}
            title={isAudioMuted ? 'Unmute Sorrow Requiem' : 'Mute Sorrow Requiem'}
            className="h-8 px-2.5 rounded-full border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer text-[11px] font-mono shadow-2xs"
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="h-3.5 w-3.5 text-neutral-400" />
                <span className="text-neutral-400">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                <span className="text-red-600">Requiem</span>
              </>
            )}
          </button>

          <button
            onClick={handleClose}
            aria-label="Close message"
            className="h-8 w-8 rounded-full border border-neutral-200 bg-neutral-100 text-neutral-500 hover:text-black hover:border-neutral-300 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top Eyebrow Tag: 10 BIRDS KILLED */}
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-[10px] sm:text-[10.5px] font-mono tracking-[0.24em] uppercase text-red-600 mb-3 shadow-2xs">
          <HeartCrack className="h-3.5 w-3.5 text-red-500 animate-pulse" />
          <span>BIRD SANCTUARY ALERT • 10 BIRDS KILLED</span>
        </div>

        {/* Realistic Anatomical Hand & Playful Salute Illustration */}
        <div className="mx-auto my-1 flex justify-center">
          <RealisticHandSalute onBounce={() => void sorrowSynth.playSorrow()} />
        </div>

        {/* Narrative Title */}
        <h2 className="text-2xl sm:text-3xl font-serif italic text-[#111827] tracking-tight mt-1 mb-3.5 leading-tight">
          A Message from the Campus Sanctuary
        </h2>

        {/* Verbatim Narrative Text in High-Contrast Light Theme */}
        <div className="space-y-3 text-xs sm:text-[13.5px] text-[#4B5563] font-normal leading-relaxed text-left max-h-[36vh] overflow-y-auto px-1 sm:px-2 pr-3 scrollbar-thin">
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
