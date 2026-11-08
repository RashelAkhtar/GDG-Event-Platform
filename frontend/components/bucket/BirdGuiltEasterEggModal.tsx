'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { HeartCrack, Home, X, Volume2, VolumeX } from 'lucide-react'
import { soundManager } from '@/lib/sound'

// ============================================================================
// GLOBAL SORROW REQUIEM AUDIO ENGINE (HTML5 AUDIO + WEB AUDIO HYBRID)
// 100% reliable autoplay on 10th bird click with dual-layer fallback
// ============================================================================

let globalSorrowAudio: HTMLAudioElement | null = null

export function playSorrowRequiemAudio() {
  if (typeof window === 'undefined') return
  try {
    if (!globalSorrowAudio) {
      globalSorrowAudio = new Audio('/sound/sorrow-requiem.wav')
      globalSorrowAudio.loop = true
      globalSorrowAudio.volume = 0.65
    }
    globalSorrowAudio.currentTime = 0
    const playPromise = globalSorrowAudio.play()
    if (playPromise) {
      playPromise.catch(() => {
        // Fallback to Web Audio procedural synth if HTML5 audio fails
        void sorrowSynth.playSorrow()
      })
    }
  } catch {
    void sorrowSynth.playSorrow()
  }
}

export function stopSorrowRequiemAudio() {
  if (globalSorrowAudio) {
    try {
      globalSorrowAudio.pause()
      globalSorrowAudio.currentTime = 0
    } catch {}
  }
  sorrowSynth.stopSorrow()
}

// ============================================================================
// PROCEDURAL WEB AUDIO SYNTHESIZER: RICH SORROWFUL REQUIEM / CHORD PROGRESSION
// Dual-layer fallback: warm orchestral cello pad + weeping high string lead
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
      master.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 1.0)
      master.connect(ctx.destination)
      this.masterGain = master

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

        // Sub bass
        const bassOsc = ctx.createOscillator()
        const bassGain = ctx.createGain()
        bassOsc.type = 'sine'
        bassOsc.frequency.setValueAtTime(chord.bass, now)
        bassGain.gain.setValueAtTime(0.001, now)
        bassGain.gain.linearRampToValueAtTime(0.26, now + 1.0)
        bassGain.gain.exponentialRampToValueAtTime(0.08, now + 3.8)
        bassOsc.connect(bassGain)
        bassGain.connect(master)
        bassOsc.start(now)
        bassOsc.stop(now + 4.2)
        currentNodes.push(bassOsc, bassGain)

        // Warm pad chords
        chord.pad.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const padGain = ctx.createGain()
          const filter = ctx.createBiquadFilter()

          osc.type = idx % 2 === 0 ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime(freq, now)
          osc.detune.setValueAtTime((idx - 1.5) * 2.5, now)

          filter.type = 'lowpass'
          filter.frequency.setValueAtTime(750 + idx * 70, now)

          padGain.gain.setValueAtTime(0.001, now)
          padGain.gain.linearRampToValueAtTime(0.1, now + 1.2)
          padGain.gain.exponentialRampToValueAtTime(0.015, now + 3.9)

          osc.connect(filter)
          filter.connect(padGain)
          padGain.connect(master)

          osc.start(now)
          osc.stop(now + 4.2)
          currentNodes.push(osc, padGain)
        })

        // Weeping melody
        const leadOsc = ctx.createOscillator()
        const leadGain = ctx.createGain()
        const leadFilter = ctx.createBiquadFilter()
        const vibrato = ctx.createOscillator()
        const vibratoGain = ctx.createGain()

        leadOsc.type = 'sine'
        leadOsc.frequency.setValueAtTime(chord.melody, now)

        vibrato.frequency.setValueAtTime(4.5, now)
        vibratoGain.gain.setValueAtTime(2.8, now)
        vibrato.connect(leadOsc.frequency)
        vibrato.start(now)
        vibrato.stop(now + 4.2)

        leadFilter.type = 'bandpass'
        leadFilter.frequency.setValueAtTime(chord.melody, now)
        leadFilter.Q.setValueAtTime(1.8, now)

        leadGain.gain.setValueAtTime(0.001, now + 0.3)
        leadGain.gain.linearRampToValueAtTime(0.16, now + 1.4)
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
    } catch {}
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
}

export const sorrowSynth = new SorrowAudioSynth()

// ============================================================================
// REALISTIC ANATOMICAL HAND & MIDDLE FINGER ILLUSTRATION (DORSAL FIST VIEW)
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
      aria-label="Playful realistic hand gesture"
      className={`relative select-none cursor-pointer transition-transform duration-300 ${
        bouncing ? 'scale-115 -rotate-6' : 'hover:scale-108 hover:-rotate-3 active:scale-95'
      }`}
    >
      <div className="anim-hand-spring-pop">
        <div className="anim-hand-cheeky-sway">
          <svg
            viewBox="0 0 180 220"
            className="w-20 h-24 sm:w-32 sm:h-40 overflow-visible drop-shadow-[0_8px_20px_rgba(0,0,0,0.18)] sm:drop-shadow-[0_14px_32px_rgba(0,0,0,0.2)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Natural Skin Forearm Gradient */}
              <linearGradient id="real-skin-forearm" x1="90" y1="160" x2="90" y2="218" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F8C7B2" />
                <stop offset="50%" stopColor="#EFA487" />
                <stop offset="100%" stopColor="#D98565" />
              </linearGradient>

              {/* Natural Dorsal Hand & Knuckles Gradient */}
              <linearGradient id="real-skin-dorsal" x1="45" y1="110" x2="135" y2="165" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFF5EF" />
                <stop offset="25%" stopColor="#F8C7B2" />
                <stop offset="65%" stopColor="#EFA487" />
                <stop offset="100%" stopColor="#CF7554" />
              </linearGradient>

              {/* Cylindrical Extended Middle Finger Gradient */}
              <linearGradient id="real-skin-shaft" x1="77" y1="50" x2="99" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFAA94" />
                <stop offset="25%" stopColor="#FFF6F0" />
                <stop offset="55%" stopColor="#F8C4AE" />
                <stop offset="85%" stopColor="#DC8264" />
                <stop offset="100%" stopColor="#B3583A" />
              </linearGradient>

              {/* Translucent Fingernail Gradient */}
              <linearGradient id="real-nail-grad" x1="88" y1="18" x2="88" y2="35" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#FCE5DC" />
                <stop offset="80%" stopColor="#F2B7A6" />
                <stop offset="100%" stopColor="#E4907C" />
              </linearGradient>

              {/* Signet Gold Ring Gradient */}
              <linearGradient id="real-gold-ring" x1="76" y1="79" x2="100" y2="86" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="35%" stopColor="#F59E0B" />
                <stop offset="70%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>

              {/* Soft Ambient Ground Shadow */}
              <radialGradient id="real-ambient-shadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.16" />
                <stop offset="60%" stopColor="#000000" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 0. Ambient Ground Contact Shadow */}
            <ellipse cx="90" cy="216" rx="52" ry="8" fill="url(#real-ambient-shadow)" />

            {/* 1. Forearm & Wrist (Proportionate, smooth taper into wrist) */}
            <g>
              <path
                d="M 58 215 C 60 195, 62 178, 66 166 L 114 166 C 118 178, 120 195, 122 215 Z"
                fill="url(#real-skin-forearm)"
              />
              {/* Ulnar Styloid Bone Highlight on right wrist */}
              <path
                d="M 114 166 C 119 164, 122 168, 120 174 C 118 178, 115 178, 114 176 Z"
                fill="#E29477"
              />
              {/* Tendon Highlights */}
              <path
                d="M 78 206 C 79 188, 81 174, 82 166"
                stroke="#FFF7F2"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.5"
              />
              <path
                d="M 100 206 C 99 188, 97 174, 96 166"
                stroke="#FFF7F2"
                strokeWidth="1.3"
                strokeLinecap="round"
                opacity="0.45"
              />
            </g>

            {/* 2. Back of Hand (Dorsal Metacarpus) */}
            <path
              d="M 66 166 C 54 158, 44 140, 48 122 C 50 114, 58 112, 66 114 L 88 110 L 114 114 C 122 112, 132 116, 134 124 C 136 138, 128 156, 114 166 Z"
              fill="url(#real-skin-dorsal)"
            />

            {/* Metacarpal Bone Anatomical Ridges */}
            <path
              d="M 72 162 C 68 148, 64 134, 62 118"
              stroke="#FFF7F2"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.38"
            />
            <path
              d="M 88 160 C 88 145, 88 130, 88 112"
              stroke="#FFF7F2"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M 104 162 C 106 148, 110 134, 112 118"
              stroke="#FFF7F2"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.38"
            />

            {/* 3. Curled Index Finger (Folded on left of middle finger) */}
            <g>
              <path
                d="M 50 116 C 46 118, 44 126, 46 135 C 48 144, 56 148, 64 146 C 72 144, 75 136, 73 126 C 72 118, 64 114, 58 114 Z"
                fill="url(#real-skin-dorsal)"
                stroke="#C87050"
                strokeWidth="0.8"
              />
              <path d="M 48 130 Q 56 134 65 131" stroke="#A85235" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 52 140 Q 58 143 65 141" stroke="#A85235" strokeWidth="1.0" strokeLinecap="round" opacity="0.85" />
            </g>

            {/* 4. Curled Ring Finger (Folded on right of middle finger) */}
            <g>
              <path
                d="M 102 114 C 98 118, 98 126, 100 135 C 102 144, 110 148, 118 146 C 126 144, 128 136, 126 126 C 124 118, 116 114, 108 114 Z"
                fill="url(#real-skin-dorsal)"
                stroke="#C87050"
                strokeWidth="0.8"
              />
              <path d="M 102 130 Q 110 134 119 131" stroke="#A85235" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 106 140 Q 112 143 118 141" stroke="#A85235" strokeWidth="1.0" strokeLinecap="round" opacity="0.85" />
            </g>

            {/* 5. Curled Pinky Finger (Folded on far right) */}
            <g>
              <path
                d="M 124 122 C 122 126, 122 133, 124 139 C 126 145, 132 148, 137 146 C 142 144, 144 138, 143 130 C 142 124, 136 120, 128 120 Z"
                fill="url(#real-skin-dorsal)"
                stroke="#C87050"
                strokeWidth="0.8"
              />
              <path d="M 125 133 Q 132 136 138 134" stroke="#A85235" strokeWidth="1.1" strokeLinecap="round" />
            </g>

            {/* 6. Natural Thumb (Wrapped firmly across the clenched fingers) */}
            <g>
              <path
                d="M 38 152 C 34 142, 36 132, 44 126 C 52 120, 64 124, 72 132 C 76 137, 74 144, 67 146 C 58 148, 48 160, 38 152 Z"
                fill="url(#real-skin-dorsal)"
                stroke="#C87050"
                strokeWidth="0.8"
              />
              {/* Natural Thumbnail */}
              <ellipse
                cx="66"
                cy="137"
                rx="4.5"
                ry="3.2"
                fill="url(#real-nail-grad)"
                transform="rotate(-15 66 137)"
                stroke="#E5A186"
                strokeWidth="0.5"
              />
              <path d="M 48 128 Q 54 135 60 131" stroke="#A85235" strokeWidth="1.3" strokeLinecap="round" />
            </g>

            {/* 7. THE STATUESQUE EXTENDED MIDDLE FINGER */}
            <g className="anim-middle-finger-salute">
              {/* Finger Shaft */}
              <path
                d="M 77 110 L 77 34 C 77 16, 99 16, 99 34 L 99 110 Z"
                fill="url(#real-skin-shaft)"
                stroke="#C87050"
                strokeWidth="0.8"
              />

              {/* Subsurface Rosy Capillary Blush on Knuckles & Fingertip */}
              <ellipse cx="88" cy="22" rx="8" ry="5.5" fill="#E27464" opacity="0.35" />
              <ellipse cx="88" cy="68" rx="8.5" ry="4.5" fill="#E27464" opacity="0.28" />

              {/* Proximal Interphalangeal Knuckle Creases (y = 67) */}
              <path d="M 79 67 Q 88 70.5 97 67" stroke="#A85235" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 81 70.5 Q 88 73.5 95 70.5" stroke="#A85235" strokeWidth="1.0" strokeLinecap="round" opacity="0.85" />

              {/* Distal Interphalangeal Knuckle Creases (y = 42) */}
              <path d="M 80 42 Q 88 45 96 42" stroke="#A85235" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 82 45 Q 88 47.5 94 45" stroke="#A85235" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />

              {/* Realistic Manicured Fingernail (Dorsal View) */}
              {/* Cuticle Arch */}
              <path d="M 80.5 36 C 80.5 32.5, 95.5 32.5, 95.5 36" stroke="#CF7554" strokeWidth="0.8" fill="none" />
              {/* Nail Plate */}
              <path d="M 81 36 L 81 25 C 81 20, 95 20, 95 25 L 95 36 Z" fill="url(#real-nail-grad)" />
              {/* Lunula Half-Moon */}
              <path d="M 83.5 36 C 83.5 33, 92.5 33, 92.5 36 Z" fill="#FFFFFF" opacity="0.8" />
              {/* Specular White Gloss Reflection */}
              <path
                d="M 82 25 C 82 22, 94 22, 94 25"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path d="M 82.5 26 L 82.5 34" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.65" />

              {/* Chic Signet Golden Band on Finger */}
              <rect
                x="76.5"
                y="80"
                width="23"
                height="6"
                rx="2"
                fill="url(#real-gold-ring)"
                stroke="#92400E"
                strokeWidth="0.7"
              />
              <rect x="85.5" y="81" width="5" height="4" rx="0.5" fill="#FFFFFF" opacity="0.95" />
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
  onResetCount?: () => void
}

export function BirdGuiltEasterEggModal({
  isOpen,
  onClose,
  onResetCount,
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
      playSorrowRequiemAudio()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden'
      }
    } else {
      stopSorrowRequiemAudio()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }

    return () => {
      stopSorrowRequiemAudio()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleFeelSorry = useCallback(() => {
    try {
      localStorage.removeItem('gdg_bird_guilt_no_remorse')
      localStorage.setItem('gdg_bird_catch_count', '0')
    } catch {}
    onResetCount?.()
    stopSorrowRequiemAudio()
    onClose()
    router.push('/')
  }, [onClose, onResetCount, router])

  const handleNoRemorse = useCallback(() => {
    try {
      localStorage.setItem('gdg_bird_guilt_no_remorse', 'true')
    } catch {}
    stopSorrowRequiemAudio()
    onClose()
  }, [onClose])

  const handleClose = useCallback(() => {
    stopSorrowRequiemAudio()
    onClose()
  }, [onClose])

  const handleToggleAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isAudioMuted) {
      setIsAudioMuted(false)
      playSorrowRequiemAudio()
    } else {
      setIsAudioMuted(true)
      stopSorrowRequiemAudio()
    }
  }, [isAudioMuted])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!isAudioMuted) playSorrowRequiemAudio()
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 xs:p-4 sm:p-6 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-300 select-none overflow-y-auto"
    >
      {/* Floating Sorrow Feathers in Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[8%] left-[12%] text-neutral-400/50 text-xl sm:text-2xl anim-feather-fall-1">🪶</span>
        <span className="absolute top-[18%] right-[16%] text-neutral-400/50 text-lg sm:text-xl anim-feather-fall-2">🪶</span>
        <span className="absolute top-[32%] left-[28%] text-neutral-400/40 text-2xl sm:text-3xl anim-feather-fall-3">🪶</span>
        <span className="absolute top-[14%] right-[32%] text-neutral-400/40 text-base sm:text-lg anim-feather-fall-1">🪶</span>
      </div>

      {/* Light Theme Modal Surface */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg md:max-w-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3.5rem)] rounded-2xl sm:rounded-3xl border border-[#E2E8F0] bg-white p-4 pt-11 sm:p-7 md:p-9 shadow-[0_30px_90px_rgba(0,0,0,0.35)] text-center animate-in zoom-in-95 slide-in-from-bottom-3 duration-300 flex flex-col my-auto overflow-hidden"
      >
        {/* Audio Toggle & Close Buttons */}
        <div className="absolute top-2.5 right-2.5 sm:top-5 sm:right-5 flex items-center gap-1.5 sm:gap-2 z-10">
          <button
            onClick={handleToggleAudio}
            title={isAudioMuted ? 'Unmute Sorrow Requiem' : 'Mute Sorrow Requiem'}
            className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-full border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer text-[10px] sm:text-[11px] font-mono shadow-2xs"
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neutral-400" />
                <span className="text-neutral-400">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500 animate-pulse" />
                <span className="text-red-600">Requiem</span>
              </>
            )}
          </button>

          <button
            onClick={handleClose}
            aria-label="Close message"
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-neutral-200 bg-neutral-100 text-neutral-500 hover:text-black hover:border-neutral-300 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Top Eyebrow Tag: 10 BIRDS KILLED */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-red-200 bg-red-50 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[9px] sm:text-[10.5px] font-mono tracking-[0.16em] sm:tracking-[0.24em] uppercase text-red-600 mb-1 sm:mb-2 shadow-2xs self-center">
          <HeartCrack className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500 animate-pulse" />
          <span>BIRD SANCTUARY ALERT • 10 BIRDS KILLED</span>
        </div>

        {/* Realistic Anatomical Hand & Playful Salute Illustration */}
        <div className="mx-auto my-0.5 sm:my-1 flex justify-center shrink-0">
          <RealisticHandSalute onBounce={() => playSorrowRequiemAudio()} />
        </div>

        {/* Narrative Title */}
        <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-serif italic text-[#111827] tracking-tight mt-0.5 sm:mt-1 mb-2 sm:mb-3 leading-tight shrink-0">
          A Message from the Campus Sanctuary
        </h2>

        {/* Verbatim Narrative Text in High-Contrast Light Theme */}
        <div className="space-y-2.5 sm:space-y-3 text-[12px] sm:text-[13.5px] text-[#4B5563] font-normal leading-relaxed text-left flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 pr-2 sm:pr-3 scrollbar-thin">
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

          <div className="rounded-xl sm:rounded-2xl border border-red-200 bg-red-50/80 p-2.5 sm:p-3.5 text-red-900 shadow-2xs">
            <strong className="font-semibold text-red-700 text-xs sm:text-[13.5px] tracking-tight block">
              Even birds have more compassion for their families than you seem to
              have for living creatures.
            </strong>
          </div>
        </div>

        {/* Action Buttons: Feeling Sorry (resets and can reappear) vs No Remorse (permanently suppressed) */}
        <div className="mt-3.5 sm:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleFeelSorry}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#111827] hover:bg-black text-white px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">I&apos;m Truly Sorry &amp; Promise Better</span>
          </button>

          <button
            onClick={handleNoRemorse}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-[#4B5563] hover:text-[#111827] px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-2xs active:scale-98"
          >
            <span className="truncate">I Have No Remorse</span>
          </button>
        </div>
      </div>
    </div>
  )

  // Attach modal directly to document.body so it is 100% on top of all stacking contexts
  return createPortal(modalContent, document.body)
}
