'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { soundManager } from '@/lib/sound'
import { BirdGuiltEasterEggModal } from './BirdGuiltEasterEggModal'

// ============================================================================
// SELF-CONTAINED PROCEDURAL MINECRAFT WEB AUDIO SYNTHESIZER
// Zero external file dependencies - 100% reliable, zero 404s, instant response
// ============================================================================

class VoxelAudioSynth {
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    return soundManager.getAudioContext()
  }

  // Classic Minecraft mob hurt punch/groan
  playHurt() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      // Square wave with fast pitch drop produces iconic crunchy retro hit
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.18)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1400, now)
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.18)

      gain.gain.setValueAtTime(0.45, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.22)
    } catch {}
  }

  // Minecraft death smoke poof explosion
  playPoof() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const bufferSize = ctx.sampleRate * 0.18
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(550, ctx.currentTime)
      filter.Q.setValueAtTime(1.8, ctx.currentTime)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.35, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start()
    } catch {}
  }

  // Minecraft Experience Orb (+1 XP) chime
  playXp() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(987.77, now) // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.06) // E6

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.28)
    } catch {}
  }

  // Celestial Day / Night toggle chime
  playDayNight(toNight: boolean) {
    if (toNight) {
      this.playNight()
    } else {
      this.playDay()
    }
  }

  // Daytime Ascension Chime (Rising dawn harmony)
  playDay() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const freqs = [329.63, 392.0, 440.0, 523.25, 659.25] // E4 -> G4 -> A4 -> C5 -> E5
      freqs.forEach((freq, idx) => {
        const toneStart = now + idx * 0.08
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, toneStart)
        gain.gain.setValueAtTime(0.001, toneStart)
        gain.gain.linearRampToValueAtTime(0.22, toneStart + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, toneStart + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(toneStart)
        osc.stop(toneStart + 0.3)
      })
    } catch {}
  }

  // Evening Sunset Chime (Warm golden-hour dusk descent)
  playSunset() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const freqs = [587.33, 523.25, 440.0, 349.23] // D5 -> C5 -> A4 -> F4
      freqs.forEach((freq, idx) => {
        const toneStart = now + idx * 0.09
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, toneStart)
        gain.gain.setValueAtTime(0.001, toneStart)
        gain.gain.linearRampToValueAtTime(0.24, toneStart + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.001, toneStart + 0.38)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(toneStart)
        osc.stop(toneStart + 0.38)
      })
    } catch {}
  }

  // Starlight Midnight Chime (Deep nocturnal bells)
  playNight() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const freqs = [523.25, 440.0, 392.0, 329.63, 261.63] // C5 -> A4 -> G4 -> E4 -> C4
      freqs.forEach((freq, idx) => {
        const toneStart = now + idx * 0.09
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, toneStart)
        gain.gain.setValueAtTime(0.001, toneStart)
        gain.gain.linearRampToValueAtTime(0.2, toneStart + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, toneStart + 0.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(toneStart)
        osc.stop(toneStart + 0.35)
      })
    } catch {}
  }

  // Foliage rustle sound when user interacts with tree
  playLeafRustle() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const bufferSize = ctx.sampleRate * 0.12
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.setValueAtTime(1800, ctx.currentTime)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start()
    } catch {}
  }

  // Flower pluck playful bubble pop
  playFlowerPop() {
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(380, now)
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.09)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.12)
    } catch {}
  }
}

const voxelAudio = new VoxelAudioSynth()

// ============================================================================
// DETAILED MINECRAFT PARROT COMPONENT (AUTHENTIC VOXEL ANATOMY)
// Features: Multi-block raised crown/crest, facial bare skin eye-patch with specular
// gleam, 2-piece hooked beak, 3D articulated flapping wings, graduated rectrix tail,
// and tucked talons.
// ============================================================================

// ============================================================================
// HIGH-FIDELITY REALISTIC BIRD COMPONENT (ANATOMICAL ACCURACY & REALISTIC FLIGHT)
// Features: Sleek aerodynamic avian profile, layered wing primaries & secondaries,
// contoured breast & mantle gradients, distinct upper/lower hooked & cone beaks with
// nares, expressive eye with colored iris & dual specular highlights, fan rectrix tail,
// and aerodynamic tucked claws.
// ============================================================================

export type BirdSpecies = 'scarlet' | 'cyan' | 'emerald' | 'cockatiel'

interface BirdPalette {
  name: string
  bodyPrimary: string
  bodySecondary: string
  bodyHighlight: string
  breastTop: string
  breastBottom: string
  wingNearCovert: string
  wingNearMid: string
  wingNearTips: string
  wingBar: string
  wingFar: string
  wingFarTips: string
  tailBase: string
  tailTips: string
  tailStripe?: string
  crestColor: string
  crestTip?: string
  beakBase: string
  beakTip: string
  beakRidge: string
  eyeIris: string
  facePatch?: string
  cheekBlush?: string
  bibCollar?: string
}

const BIRD_PALETTES: Record<BirdSpecies, BirdPalette> = {
  // 1. CYAN: Cerulean Blue Jay / Indigo Kingfisher
  cyan: {
    name: 'Blue Jay',
    bodyPrimary: '#2563EB',
    bodySecondary: '#1E3A8A',
    bodyHighlight: '#60A5FA',
    breastTop: '#FFFFFF',
    breastBottom: '#E0F2FE',
    wingNearCovert: '#3B82F6',
    wingNearMid: '#1D4ED8',
    wingNearTips: '#0F172A',
    wingBar: '#FFFFFF',
    wingFar: '#1E40AF',
    wingFarTips: '#0B1329',
    tailBase: '#2563EB',
    tailTips: '#FFFFFF',
    tailStripe: '#0F172A',
    crestColor: '#3B82F6',
    crestTip: '#1D4ED8',
    beakBase: '#334155',
    beakTip: '#0F172A',
    beakRidge: '#94A3B8',
    eyeIris: '#854D0E',
    bibCollar: '#0F172A',
  },
  // 2. SCARLET: Northern Cardinal / Scarlet Tanager
  scarlet: {
    name: 'Scarlet Cardinal',
    bodyPrimary: '#DC2626',
    bodySecondary: '#991B1B',
    bodyHighlight: '#F87171',
    breastTop: '#EF4444',
    breastBottom: '#B91C1C',
    wingNearCovert: '#DC2626',
    wingNearMid: '#991B1B',
    wingNearTips: '#450A0A',
    wingBar: '#B91C1C',
    wingFar: '#991B1B',
    wingFarTips: '#2E0606',
    tailBase: '#DC2626',
    tailTips: '#7F1D1D',
    crestColor: '#EF4444',
    crestTip: '#B91C1C',
    beakBase: '#F59E0B',
    beakTip: '#D97706',
    beakRidge: '#FDE68A',
    eyeIris: '#78350F',
    facePatch: '#18181B',
  },
  // 3. EMERALD: Emerald Budgie / Green Hummingbird
  emerald: {
    name: 'Emerald Budgie',
    bodyPrimary: '#10B981',
    bodySecondary: '#047857',
    bodyHighlight: '#6EE7B7',
    breastTop: '#FDE047',
    breastBottom: '#34D399',
    wingNearCovert: '#059669',
    wingNearMid: '#047857',
    wingNearTips: '#022C22',
    wingBar: '#FACC15',
    wingFar: '#047857',
    wingFarTips: '#021F17',
    tailBase: '#059669',
    tailTips: '#0284C7',
    crestColor: '#34D399',
    crestTip: '#059669',
    beakBase: '#FDE68A',
    beakTip: '#F59E0B',
    beakRidge: '#FEF08A',
    eyeIris: '#334155',
  },
  // 4. COCKATIEL: Yellow Warbler / Golden Cockatiel
  cockatiel: {
    name: 'Golden Warbler',
    bodyPrimary: '#FACC15',
    bodySecondary: '#CA8A04',
    bodyHighlight: '#FEF08A',
    breastTop: '#FEF08A',
    breastBottom: '#EAB308',
    wingNearCovert: '#64748B',
    wingNearMid: '#334155',
    wingNearTips: '#0F172A',
    wingBar: '#FFFFFF',
    wingFar: '#475569',
    wingFarTips: '#0F172A',
    tailBase: '#EAB308',
    tailTips: '#334155',
    crestColor: '#FACC15',
    crestTip: '#FEF08A',
    beakBase: '#FED7AA',
    beakTip: '#FDBA74',
    beakRidge: '#FFF7ED',
    eyeIris: '#78350F',
    cheekBlush: '#EA580C',
  },
}

function RealisticBird({
  species,
  isHit,
}: {
  species: BirdSpecies
  isHit: boolean
}) {
  const p = BIRD_PALETTES[species] || BIRD_PALETTES.cyan
  const prefix = `bird-${species}`

  return (
    <div
      className={`relative select-none transition-all duration-300 ${
        isHit ? 'filter-red-flash scale-95' : ''
      }`}
    >
      <svg
        viewBox="0 0 68 46"
        className="w-13 h-9 sm:w-14 sm:h-10 overflow-visible drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={
          isHit
            ? {
                filter: `url(#${prefix}-hurt-red) drop-shadow(0 0 10px rgba(220, 38, 38, 0.9))`,
              }
            : undefined
        }
      >
        <defs>
          {/* Intense Crimson Damage Color Matrix: shifts feather tones into rich hurt red while preserving darks and highlights */}
          <filter id={`${prefix}-hurt-red`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                1.75  0.25  0.25  0  0.30
                0.08  0.15  0.08  0  0.02
                0.08  0.08  0.15  0  0.02
                0     0     0     1  0"
            />
          </filter>

          <linearGradient id={`${prefix}-body`} x1="38" y1="9" x2="32" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.bodyHighlight} />
            <stop offset="40%" stopColor={p.bodyPrimary} />
            <stop offset="100%" stopColor={p.bodySecondary} />
          </linearGradient>

          <linearGradient id={`${prefix}-breast`} x1="48" y1="18" x2="40" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.breastTop} />
            <stop offset="100%" stopColor={p.breastBottom} />
          </linearGradient>

          <linearGradient id={`${prefix}-wing-near`} x1="32" y1="6" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wingNearCovert} />
            <stop offset="60%" stopColor={p.wingNearMid} />
            <stop offset="100%" stopColor={p.wingNearTips} />
          </linearGradient>

          <linearGradient id={`${prefix}-wing-far`} x1="28" y1="4" x2="12" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wingFar} />
            <stop offset="100%" stopColor={p.wingFarTips} />
          </linearGradient>

          <linearGradient id={`${prefix}-beak`} x1="55" y1="14" x2="66" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.beakBase} />
            <stop offset="100%" stopColor={p.beakTip} />
          </linearGradient>

          <linearGradient id={`${prefix}-tail`} x1="20" y1="26" x2="0" y2="33" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.tailBase} />
            <stop offset="100%" stopColor={p.tailTips} />
          </linearGradient>
        </defs>

        {/* 1. FAR WING (Limp wounded flutter on hit; flight stroke when flying) */}
        <g className={isHit ? 'anim-bird-wing-limp' : 'anim-bird-wing-far'}>
          <path
            d="M 28 19 C 24 10, 16 3, 9 1 C 11 6, 13 13, 16 18 C 19 21, 23 22, 28 20 Z"
            fill={`url(#${prefix}-wing-far)`}
          />
          <path
            d="M 24 15 C 20 8, 14 3, 9 1 C 12 7, 15 13, 18 17 Z"
            fill={p.wingFarTips}
            opacity="0.8"
          />
        </g>

        {/* 2. TAIL FEATHERS (Layered Rectrices with wind flex) */}
        <g className={isHit ? undefined : 'anim-bird-tail-flex'}>
          <path
            d="M 19 26 C 13 27, 7 30, 0 33 C 4 34, 11 33, 18 29 Z"
            fill={`url(#${prefix}-tail)`}
          />
          <path
            d="M 19 25 C 13 25, 8 26, 2 28 C 6 29, 12 29, 18 27 Z"
            fill={p.tailBase}
            opacity="0.9"
          />
          <path
            d="M 18 28 C 13 30, 8 33, 3 36 C 7 36, 12 34, 17 30 Z"
            fill={p.tailTips}
            opacity="0.85"
          />
          {p.tailStripe && (
            <path
              d="M 8 29 L 5 33 L 7 33 L 10 29 Z"
              fill={p.tailStripe}
              opacity="0.65"
            />
          )}
        </g>

        {/* 3. TUCKED LEGS & CLAWS (Aerodynamic in flight) */}
        <g opacity="0.85">
          <path
            d="M 26 33 C 25 34, 23 37, 24 38 C 24.5 38.2, 25.5 37.5, 26 35 Z"
            fill="#334155"
          />
          <path
            d="M 28 33 C 27 34, 25 37, 26 38 C 26.5 38.2, 27.5 37.5, 28 35 Z"
            fill="#1E293B"
          />
        </g>

        {/* 4. MAIN BIRD BODY (Mantle, Nape, Breast, Belly, Eye, Beak) */}
        <g className={isHit ? undefined : 'anim-bird-body-bob'}>
          <path
            d="M 40 10 C 47 9, 53 12, 55 17 C 54 21, 52 26, 47 31 C 41 36, 30 36, 24 34 C 19 32, 17 28, 19 25 C 24 20, 32 16, 40 10 Z"
            fill={`url(#${prefix}-body)`}
          />

          <path
            d="M 54 18 C 53 22, 51 26, 47 30 C 42 34, 33 35, 27 34 C 33 36, 43 35, 48 29 C 52 24, 54 20, 54 18 Z"
            fill={`url(#${prefix}-breast)`}
          />

          {/* Crimson plumage flush overlay when hit */}
          {isHit && (
            <path
              d="M 40 10 C 47 9, 53 12, 55 17 C 54 21, 52 26, 47 31 C 41 36, 30 36, 24 34 C 19 32, 17 28, 19 25 C 24 20, 32 16, 40 10 Z"
              fill="#DC2626"
              opacity="0.32"
            />
          )}

          {/* Crown Crest */}
          <path
            d="M 42 9 C 45 4, 49 5, 52 11 C 48 10, 44 9.5, 42 9 Z"
            fill={p.crestColor}
          />
          {p.crestTip && (
            <path
              d="M 44 6 C 46 3.5, 49 4.5, 50 8 C 48 7, 46 6.5, 44 6 Z"
              fill={p.crestTip}
            />
          )}

          {/* Facial Mask / Collar Details */}
          {p.facePatch && (
            <path
              d="M 55 16 C 52 13.5, 47 15, 48 18.5 C 50 21, 53 21, 55 18 Z"
              fill={p.facePatch}
            />
          )}

          {p.bibCollar && (
            <path
              d="M 50 18 C 47 21, 46 25, 48 27 C 49 26, 50 22, 51 19 Z"
              fill={p.bibCollar}
              opacity="0.85"
            />
          )}

          {p.cheekBlush && (
            <circle cx="48" cy="20" r="3.2" fill={p.cheekBlush} opacity="0.88" />
          )}

          {/* REALISTIC EYE (Squints shut in pain when hit) */}
          {isHit ? (
            <g>
              <path
                d="M 47.5 13.8 L 51 15.2 L 47.5 16.6"
                stroke="#1E1B4B"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          ) : (
            <g>
              <circle cx="50" cy="15.2" r="3.2" fill="#09090B" opacity="0.25" />
              <circle cx="50" cy="15.2" r="2.5" fill={p.eyeIris} />
              <circle cx="50" cy="15.2" r="1.6" fill="#09090B" />
              <circle cx="50.8" cy="14.4" r="0.8" fill="#FFFFFF" />
              <circle cx="49.3" cy="15.9" r="0.4" fill="#FFFFFF" opacity="0.8" />
            </g>
          )}

          {/* TWO-PIECE BEAK (Slight agape reflex on hit) */}
          <g transform={isHit ? 'rotate(6 54 18)' : undefined}>
            <path
              d="M 54 14.5 C 58 15, 62 16.5, 66 18.5 C 62 18.8, 58 18.6, 54 17.5 Z"
              fill={`url(#${prefix}-beak)`}
            />
            <path
              d="M 55 15.2 C 58 15.6, 61 16.8, 64 18.2"
              stroke={p.beakRidge}
              strokeWidth="0.6"
              strokeLinecap="round"
              opacity="0.8"
            />
            <circle cx="55.8" cy="16" r="0.4" fill="#0F172A" opacity="0.75" />
            <path
              d="M 65.5 18.8 C 61 19.5, 57 19.4, 54 18 C 55 18.8, 57 19.8, 60 19.5 Z"
              fill={p.beakTip}
            />
            <path
              d="M 54 17.6 L 65.6 18.6"
              stroke="#09090B"
              strokeWidth="0.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          </g>
        </g>

        {/* 5. NEAR FOREGROUND WING (Limp flutter on hit; flight stroke when flying) */}
        <g className={isHit ? 'anim-bird-wing-limp' : 'anim-bird-wing-near'}>
          <path
            d="M 34 21 C 28 11, 20 4, 12 1.5 C 14 7, 16 13, 20 18 C 24 23, 29 24, 35 22 Z"
            fill={`url(#${prefix}-wing-near)`}
          />
          <path
            d="M 30 17 C 25 9, 18 4, 12 1.5 C 15 8, 18 14, 22 19 Z"
            fill={p.wingNearTips}
            opacity="0.8"
          />
          <path
            d="M 27 20 C 23 13, 17 8, 14 5 C 16 11, 19 16, 23 20 Z"
            fill={p.wingNearTips}
            opacity="0.65"
          />

          <path
            d="M 34 19 C 30 14, 25 10, 20 8 C 22 12, 25 16, 29 20 Z"
            fill={p.wingBar}
            opacity="0.9"
          />

          <path
            d="M 36 21 C 34 16, 28 14, 24 16 C 26 21, 30 24, 36 22 Z"
            fill={p.wingNearCovert}
          />
          <path
            d="M 35 19 C 32 16, 28 15, 25 17"
            stroke={p.bodyHighlight}
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      </svg>
    </div>
  )
}

// ============================================================================
// REALISTIC CELESTIAL BODIES: SUN & MOON (DETAILED VECTOR ANATOMY & ATMOSPHERE)
// ============================================================================

function RealisticSun({ isEvening }: { isEvening: boolean }) {
  return (
    <div className={`relative flex items-center justify-center ${isEvening ? 'anim-celestial-sun-evening' : 'anim-celestial-sun-day'}`}>
      {/* 8 Rotating Solar Corona Flare Rays */}
      <svg
        viewBox="0 0 64 64"
        className="absolute -inset-2 w-14 h-14 anim-solar-rays-spin pointer-events-none opacity-80"
        fill="none"
      >
        <g stroke={isEvening ? '#F97316' : '#FDE047'} strokeWidth="1.5" strokeLinecap="round" opacity="0.85">
          <line x1="32" y1="4" x2="32" y2="10" />
          <line x1="32" y1="54" x2="32" y2="60" />
          <line x1="4" y1="32" x2="10" y2="32" />
          <line x1="54" y1="32" x2="60" y2="32" />
          <line x1="12" y1="12" x2="17" y2="17" />
          <line x1="47" y1="47" x2="52" y2="52" />
          <line x1="12" y1="52" x2="17" y2="47" />
          <line x1="47" y1="17" x2="52" y2="12" />
        </g>
      </svg>

      {/* Main Solar Sphere */}
      <svg
        viewBox="0 0 40 40"
        className="w-9 h-9 sm:w-10 sm:h-10 overflow-visible select-none drop-shadow-md"
      >
        <defs>
          <radialGradient id="sun-grad-day" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#FFFBEB" />
            <stop offset="65%" stopColor="#FDE047" />
            <stop offset="90%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>

          <radialGradient id="sun-grad-evening" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF7ED" />
            <stop offset="30%" stopColor="#FED7AA" />
            <stop offset="60%" stopColor="#FB923C" />
            <stop offset="85%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#DC2626" />
          </radialGradient>
        </defs>

        {/* Outer Glow Halo Ring */}
        <circle
          cx="20"
          cy="20"
          r="19"
          fill={isEvening ? '#EA580C' : '#FDE047'}
          opacity="0.25"
        />

        {/* Main Sun Core */}
        <circle
          cx="20"
          cy="20"
          r="16"
          fill={isEvening ? 'url(#sun-grad-evening)' : 'url(#sun-grad-day)'}
        />

        {/* Specular Photosphere Core */}
        <circle
          cx="17"
          cy="16"
          r="6"
          fill="#FFFFFF"
          opacity={isEvening ? '0.6' : '0.85'}
        />
      </svg>
    </div>
  )
}

function RealisticMoon() {
  return (
    <div className="relative flex items-center justify-center anim-celestial-moon-night">
      <svg
        viewBox="0 0 40 40"
        className="w-9 h-9 sm:w-10 sm:h-10 overflow-visible select-none drop-shadow-md"
      >
        <defs>
          <radialGradient id="moon-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#F1F5F9" />
            <stop offset="75%" stopColor="#E2E8F0" />
            <stop offset="92%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </radialGradient>

          <radialGradient id="moon-crater-dark" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#64748B" stopOpacity="0.8" />
            <stop offset="85%" stopColor="#475569" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.4" />
          </radialGradient>
        </defs>

        {/* Outer Ethereal Lunar Halo */}
        <circle cx="20" cy="20" r="19" fill="#BAE6FD" opacity="0.3" />

        {/* Main Lunar Sphere */}
        <circle cx="20" cy="20" r="16" fill="url(#moon-grad)" />

        {/* Realistic Lunar Maria Basalt Plains (Craters & Seas) */}
        {/* Sea of Tranquility (Mare Tranquillitatis) */}
        <ellipse cx="23" cy="15" rx="5" ry="3.5" fill="url(#moon-crater-dark)" />
        {/* Sea of Serenity */}
        <circle cx="16" cy="14" r="3.2" fill="url(#moon-crater-dark)" />
        {/* Ocean of Storms (Oceanus Procellarum) */}
        <ellipse cx="14" cy="23" rx="4" ry="5.5" fill="url(#moon-crater-dark)" />
        {/* Tycho Crater with Bright Rim */}
        <g>
          <circle cx="23" cy="26" r="2.2" fill="#475569" opacity="0.75" />
          <circle cx="23" cy="26" r="2.6" stroke="#FFFFFF" strokeWidth="0.5" fill="none" opacity="0.6" />
        </g>
        {/* Copernicus Crater */}
        <circle cx="20" cy="20" r="1.6" fill="#64748B" opacity="0.65" />

        {/* Crescent Limb Highlight */}
        <path
          d="M 10 9 C 14 5, 23 5, 28 9 C 24 7, 14 7, 10 9 Z"
          fill="#FFFFFF"
          opacity="0.75"
        />
      </svg>
    </div>
  )
}

// ============================================================================
// REALISTIC BOTANICAL COMPONENTS: TREES, ROLLING MEADOW GRASS & FLOWERS
// ============================================================================

// ============================================================================
// REALISTIC BOTANICAL COMPONENTS: TREES, CONTINUOUS MEADOW & FLORA
// ============================================================================

function RealisticOakTree({
  isEvening,
  isNight,
  rustling,
}: {
  isEvening: boolean
  isNight: boolean
  rustling: boolean
}) {
  // Calibrated botanical palette: rich forest in Day, warm sienna in Evening, deep midnight spruce in Night (zero neon cyan)
  const foliageShadow = isNight ? '#021812' : isEvening ? '#3B1304' : '#0A3318'
  const foliageDeep = isNight ? '#042A1F' : isEvening ? '#5C1D06' : '#0F4D25'
  const foliageMid = isNight ? '#064E3B' : isEvening ? '#9A3412' : '#15803D'
  const foliageLush = isNight ? '#065F46' : isEvening ? '#C2410C' : '#16A34A'
  const foliageSunlit = isNight ? '#047857' : isEvening ? '#EA580C' : '#22C55E'
  const foliageHighlight = isNight ? 'rgba(52, 211, 153, 0.4)' : isEvening ? '#FDE047' : '#86EFAC'

  const trunkBase = isNight ? '#080E18' : isEvening ? '#2B0E04' : '#2E1305'
  const trunkBark = isNight ? '#131D2C' : isEvening ? '#5C2409' : '#5C2409'
  const trunkHighlight = isNight ? '#243348' : isEvening ? '#9A3412' : '#85370D'
  const woodGrain = isNight ? '#1A2638' : isEvening ? '#782E0B' : '#712E0B'

  return (
    <div
      className={`relative select-none transition-transform duration-300 origin-bottom cursor-pointer group ${
        rustling ? 'anim-tree-rustle-shake' : 'hover:scale-105 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 140 148"
        className="w-24 h-26 sm:w-30 sm:h-32 md:w-36 md:h-38 overflow-visible drop-shadow-[0_8px_18px_rgba(0,0,0,0.22)] anim-oak-canopy-breeze"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="oak-trunk-grain" x1="45" y1="70" x2="95" y2="148" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={trunkHighlight} />
            <stop offset="35%" stopColor={trunkBark} />
            <stop offset="85%" stopColor={trunkBase} />
          </linearGradient>

          <radialGradient id="oak-canopy-main" cx="50%" cy="38%" r="58%">
            <stop offset="0%" stopColor={foliageSunlit} />
            <stop offset="45%" stopColor={foliageLush} />
            <stop offset="80%" stopColor={foliageMid} />
            <stop offset="100%" stopColor={foliageShadow} />
          </radialGradient>

          <radialGradient id="oak-bough-left" cx="42%" cy="36%" r="55%">
            <stop offset="0%" stopColor={foliageSunlit} />
            <stop offset="50%" stopColor={foliageLush} />
            <stop offset="100%" stopColor={foliageDeep} />
          </radialGradient>

          <radialGradient id="oak-bough-right" cx="58%" cy="36%" r="55%">
            <stop offset="0%" stopColor={foliageSunlit} />
            <stop offset="50%" stopColor={foliageLush} />
            <stop offset="100%" stopColor={foliageDeep} />
          </radialGradient>
        </defs>

        {/* 1. LAYER 1: DEEP UNDERSTORY SHADOW FOLIAGE MASS (Behind Trunk Limbs) */}
        <path
          d="M 36 86 C 18 82, 12 66, 18 50 C 24 38, 38 34, 46 36 C 52 20, 74 16, 88 24 C 102 18, 118 28, 116 44 C 126 56, 120 72, 108 80 C 96 88, 80 84, 72 80 C 60 88, 48 88, 36 86 Z"
          fill={foliageShadow}
          opacity="0.95"
        />

        {/* 2. GNARLED OAK TRUNK WITH FORKING LIMBS & BUTTRESS ROOTS */}
        <g>
          {/* Main Buttressed Trunk Body extending into ground */}
          <path
            d="M 38 148 C 44 140, 52 128, 56 112 C 58 98, 53 88, 42 76 C 40 73, 43 70, 46 73 C 58 83, 62 94, 64 104 C 67 92, 74 80, 88 70 C 91 68, 93 71, 90 75 C 78 86, 73 98, 71 114 C 73 128, 79 140, 88 148 Z"
            fill="url(#oak-trunk-grain)"
          />

          {/* Left Buttress Root Flare Gripping Soil */}
          <path
            d="M 52 126 C 45 132, 34 140, 24 148 C 22 148, 28 144, 38 136 C 46 128, 52 124, 52 126 Z"
            fill={trunkBase}
          />
          {/* Right Buttress Root Flare Gripping Soil */}
          <path
            d="M 74 126 C 82 133, 96 142, 108 148 C 107 147, 98 141, 86 134 C 78 127, 74 125, 74 126 Z"
            fill={trunkBase}
          />

          {/* Central Crown Fork Boughs reaching into canopy */}
          <path d="M 64 104 C 65 88, 66 74, 63 60 C 62 58, 65 57, 67 59 C 70 73, 69 88, 68 104 Z" fill={trunkBark} />
          <path d="M 60 92 C 53 80, 42 70, 34 64" stroke={trunkBark} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 68 90 C 76 78, 88 70, 98 64" stroke={trunkBark} strokeWidth="2.2" strokeLinecap="round" />

          {/* Natural Wood Grain Fissures */}
          <path d="M 58 142 C 60 126, 61 110, 62 96" stroke={trunkHighlight} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <path d="M 68 144 C 69 130, 68 114, 70 102" stroke={woodGrain} strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
          <path d="M 64 136 C 65 122, 66 112, 66 104" stroke={trunkHighlight} strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
          <path d="M 48 136 C 52 128, 55 120, 56 112" stroke={woodGrain} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
          <path d="M 78 138 C 76 128, 73 120, 71 114" stroke={trunkHighlight} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* 3. LAYER 2: SCALLOPED CANOPY BOUGHS WITH NATURAL LEAF CLUSTERS (NO AWKWARD HOLES) */}
        {/* Lower Left Bough Mass */}
        <path
          d="M 28 68 C 16 64, 14 50, 24 42 C 18 36, 24 26, 34 28 C 42 22, 52 28, 50 38 C 58 44, 54 56, 44 62 C 38 68, 32 68, 28 68 Z"
          fill="url(#oak-bough-left)"
        />
        {/* Lower Right Bough Mass */}
        <path
          d="M 88 70 C 80 64, 82 50, 92 42 C 88 34, 98 26, 108 30 C 116 26, 124 34, 120 44 C 126 52, 120 64, 110 66 C 102 70, 94 70, 88 70 Z"
          fill="url(#oak-bough-right)"
        />
        {/* Central & Upper Main Canopy Mass */}
        <path
          d="M 44 60 C 32 54, 30 38, 42 28 C 40 20, 50 14, 60 16 C 66 10, 80 10, 86 16 C 96 14, 104 22, 102 32 C 112 40, 108 54, 98 58 C 92 64, 84 62, 78 58 C 68 64, 52 64, 44 60 Z"
          fill="url(#oak-canopy-main)"
        />

        {/* 4. LAYER 3: DAPPLED LEAF CREST HIGHLIGHTS (Sunlit/Moonlit Leaf Rims) */}
        <path
          d="M 54 18 C 64 13, 76 13, 82 17 C 76 20, 62 20, 54 18 Z"
          fill={foliageHighlight}
          opacity="0.85"
        />
        <ellipse cx="36" cy="30" rx="7" ry="4" fill={foliageHighlight} opacity="0.45" />
        <ellipse cx="102" cy="32" rx="7" ry="4" fill={foliageHighlight} opacity="0.45" />
        <ellipse cx="68" cy="24" rx="10" ry="5" fill={foliageHighlight} opacity="0.4" />
        <circle cx="68" cy="22" r="3" fill={foliageHighlight} opacity="0.6" />
      </svg>

      {/* Floating Falling Leaf Particles when clicked */}
      {rustling && (
        <>
          <span
            className="absolute top-5 left-5 h-2 w-1.2 rounded-full anim-organic-leaf-fall-1 pointer-events-none"
            style={{ backgroundColor: foliageSunlit }}
          />
          <span
            className="absolute top-7 right-6 h-1.8 w-1 rounded-full anim-organic-leaf-fall-2 pointer-events-none"
            style={{ backgroundColor: foliageLush }}
          />
        </>
      )}
    </div>
  )
}

function RealisticBirchTree({
  isEvening,
  isNight,
  rustling,
}: {
  isEvening: boolean
  isNight: boolean
  rustling: boolean
}) {
  // Calibrated birch palette: fresh lime/golden in Day, warm autumn amber in Evening, frosted silver-sage in Night (zero neon cyan)
  const foliageShadow = isNight ? '#021812' : isEvening ? '#451A03' : '#1B430E'
  const foliageDeep = isNight ? '#042A1F' : isEvening ? '#782E0B' : '#2D5A16'
  const foliageMid = isNight ? '#064E3B' : isEvening ? '#9A3412' : '#4D7C0F'
  const foliageLush = isNight ? '#047857' : isEvening ? '#D97706' : '#65A30D'
  const foliageAiry = isNight ? '#059669' : isEvening ? '#F59E0B' : '#84CC16'
  const foliageHighlight = isNight ? 'rgba(110, 231, 183, 0.45)' : isEvening ? '#FEF08A' : '#BEF264'

  const trunkBase = isNight ? '#94A3B8' : isEvening ? '#FEF3C7' : '#F8FAFC'
  const trunkShadow = isNight ? '#475569' : isEvening ? '#FCD34D' : '#CBD5E1'
  const lenticelColor = isNight ? '#0F172A' : isEvening ? '#292524' : '#1E293B'
  const basalCollar = isNight ? '#090D16' : isEvening ? '#291004' : '#18181B'

  return (
    <div
      className={`relative select-none transition-transform duration-300 origin-bottom cursor-pointer group ${
        rustling ? 'anim-tree-rustle-shake' : 'hover:scale-105 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 120 152"
        className="w-22 h-26 sm:w-28 sm:h-32 md:w-34 md:h-38 overflow-visible drop-shadow-[0_8px_18px_rgba(0,0,0,0.22)] anim-birch-weep-breeze"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="birch-trunk-bark-v2" x1="50" y1="50" x2="68" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={trunkBase} />
            <stop offset="70%" stopColor={trunkBase} />
            <stop offset="100%" stopColor={trunkShadow} />
          </linearGradient>

          <radialGradient id="birch-canopy-cluster" cx="48%" cy="38%" r="60%">
            <stop offset="0%" stopColor={foliageAiry} />
            <stop offset="55%" stopColor={foliageLush} />
            <stop offset="85%" stopColor={foliageMid} />
            <stop offset="100%" stopColor={foliageDeep} />
          </radialGradient>
        </defs>

        {/* 1. SLENDER PAPER BIRCH TRUNK WITH HORIZONTAL LENTICELS & BASAL COLLAR */}
        <g>
          {/* Dark lichen basal collar anchored into soil */}
          <path d="M 52 144 C 54 136, 62 136, 68 144 L 72 152 L 48 152 Z" fill={basalCollar} opacity="0.9" />

          {/* Slender Arched Trunk */}
          <path
            d="M 54 150 C 56 132, 55 110, 58 84 C 59 70, 54 58, 44 46 C 42 44, 45 42, 48 45 C 57 54, 61 68, 62 82 C 65 68, 72 56, 84 44 C 87 42, 88 45, 86 48 C 77 58, 71 74, 70 90 C 71 112, 70 132, 73 150 Z"
            fill="url(#birch-trunk-bark-v2)"
          />

          {/* Delicate Arching Upper Branches */}
          <path d="M 62 82 C 63 64, 62 48, 60 34" stroke={trunkBase} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 59 70 C 52 60, 40 54, 30 50" stroke={trunkBase} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 66 68 C 76 58, 88 54, 98 52" stroke={trunkBase} strokeWidth="1.2" strokeLinecap="round" />

          {/* Characteristic Birch Bark Charcoal Lenticels & Knot Markings */}
          <path d="M 55 140 L 62 141" stroke={lenticelColor} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 64 133 L 70 134.5" stroke={lenticelColor} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 56 122 L 63 123" stroke={lenticelColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 62 110 L 68 111.5" stroke={lenticelColor} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 57 98 L 62 99" stroke={lenticelColor} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M 60 86 L 65 86.5" stroke={lenticelColor} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M 58 74 L 62.5 74.5" stroke={lenticelColor} strokeWidth="1.2" strokeLinecap="round" />

          {/* Diamond Knot Branch Scars */}
          <polygon points="61,102 63.5,99 63.5,105 61,107" fill={lenticelColor} opacity="0.85" />
          <polygon points="64,126 66.5,123 66.5,129 64,131" fill={lenticelColor} opacity="0.85" />
        </g>

        {/* 2. AIRY WEEPING BIRCH FOLIAGE CANOPY (NO SHARP DOWNWARD FANGS/ICICLES) */}
        {/* Rear Deep Foliage Shadow */}
        <path
          d="M 32 68 C 20 60, 18 44, 26 32 C 34 24, 48 20, 56 24 C 62 12, 80 12, 88 20 C 100 18, 108 32, 102 44 C 108 54, 100 68, 86 68 C 76 74, 62 72, 54 66 C 42 72, 34 72, 32 68 Z"
          fill={foliageShadow}
          opacity="0.88"
        />

        {/* Midground Cascading Canopy Mass */}
        <path
          d="M 34 62 C 22 54, 22 40, 32 28 C 40 20, 52 18, 58 22 C 64 10, 80 10, 86 20 C 96 16, 104 28, 98 40 C 106 48, 96 62, 82 62 C 74 68, 60 66, 54 58 C 44 64, 38 64, 34 62 Z"
          fill="url(#birch-canopy-cluster)"
        />

        {/* Soft, Rounded Pendulous Weeping Leaf Clusters */}
        <ellipse cx="32" cy="50" rx="11" ry="14" fill="url(#birch-canopy-cluster)" opacity="0.95" />
        <ellipse cx="88" cy="50" rx="11" ry="14" fill="url(#birch-canopy-cluster)" opacity="0.95" />
        <ellipse cx="60" cy="28" rx="18" ry="14" fill="url(#birch-canopy-cluster)" />

        {/* Lower Cascading Weeping Leaf Sprays */}
        <ellipse cx="36" cy="62" rx="8" ry="10" fill={foliageMid} opacity="0.9" />
        <ellipse cx="84" cy="62" rx="8" ry="10" fill={foliageMid} opacity="0.9" />

        {/* Sunlit/Moonlit Leaf Flutter Highlights on Top of Canopy */}
        <ellipse cx="60" cy="20" rx="12" ry="5" fill={foliageHighlight} opacity="0.75" />
        <ellipse cx="82" cy="26" rx="8" ry="4" fill={foliageHighlight} opacity="0.6" />
        <ellipse cx="38" cy="32" rx="8" ry="4" fill={foliageHighlight} opacity="0.6" />
      </svg>

      {/* Floating Falling Leaf Particles when clicked */}
      {rustling && (
        <>
          <span
            className="absolute top-5 left-4 h-1.8 w-1 rounded-full anim-organic-leaf-fall-1 pointer-events-none"
            style={{ backgroundColor: foliageAiry }}
          />
          <span
            className="absolute top-7 right-5 h-2 w-1.2 rounded-full anim-organic-leaf-fall-2 pointer-events-none"
            style={{ backgroundColor: foliageLush }}
          />
        </>
      )}
    </div>
  )
}

function ContinuousMeadowTerrain({
  isEvening,
  isNight,
  onFlowerClick,
  flowerBounce,
}: {
  isEvening: boolean
  isNight: boolean
  onFlowerClick: (id: string) => void
  flowerBounce: Record<string, boolean>
}) {
  // Calibrated terrain palette across day, evening, and night
  const turfDeep = isNight ? '#021812' : isEvening ? '#3B1304' : '#0B381A'
  const turfMid = isNight ? '#042A1F' : isEvening ? '#713F12' : '#14532D'
  const turfBright = isNight ? '#065F46' : isEvening ? '#CA8A04' : '#15803D'
  const turfSunlit = isNight ? '#047857' : isEvening ? '#EAB308' : '#22C55E'
  const bladeTip = isNight ? 'rgba(110, 231, 183, 0.65)' : isEvening ? '#FDE047' : '#86EFAC'
  const earthDeep = isNight ? '#020C0A' : isEvening ? '#200802' : '#041F0E'
  const horizonRidge = isNight ? '#031713' : isEvening ? '#4A1D07' : '#0D4220'

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <svg
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="continuous-soil-grad" x1="0" y1="40" x2="0" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={turfMid} />
            <stop offset="35%" stopColor={turfDeep} />
            <stop offset="100%" stopColor={earthDeep} />
          </linearGradient>

          <linearGradient id="continuous-blade-grad" x1="0" y1="20" x2="0" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={bladeTip} />
            <stop offset="45%" stopColor={turfSunlit} />
            <stop offset="100%" stopColor={turfDeep} />
          </linearGradient>

          <linearGradient id="horizon-ridge-grad" x1="0" y1="35" x2="0" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={horizonRidge} stopOpacity="0.85" />
            <stop offset="100%" stopColor={earthDeep} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* 1. CONTINUOUS BACKGROUND HORIZON RIDGE (Gentle unbroken hill roll) */}
        <path
          d="M 0 52 C 180 40, 360 36, 540 46 C 600 50, 660 50, 720 46 C 900 36, 1080 40, 1200 52 L 1200 80 L 0 80 Z"
          fill="url(#horizon-ridge-grad)"
        />

        {/* 2. CONTINUOUS FERTILE SOIL BEDROCK (100% Edge-to-Edge across bottom, perfectly smooth center) */}
        <path
          d="M 0 54 C 200 48, 400 45, 550 49 C 600 51, 650 51, 700 49 C 850 45, 1050 48, 1200 54 L 1200 80 L 0 80 Z"
          fill="url(#continuous-soil-grad)"
        />

        {/* 3. REAR DENSE SHADOW BLADE TUFTS (Clustered multi-blade botanical tufts) */}
        <g fill={turfMid} opacity="0.85" className="anim-grass-wind-sway-delayed">
            <path d="M 50.0 50.0 C 48.0 41.1, 44.0 32.2, 39.3 26.8 C 42.0 33.9, 47.0 42.0, 52.0 50.0 Z M 48.0 50.0 C 45.0 42.9, 41.1 36.6, 36.6 32.2 C 42.9 37.5, 46.0 43.8, 50.0 50.0 Z M 51.0 50.0 C 56.0 43.8, 60.7 38.4, 65.2 34.8 C 59.8 39.3, 54.0 44.6, 53.0 50.0 Z M 49.5 50.0 C 49.0 42.0, 49.0 33.9, 47.3 28.6 C 48.0 34.8, 51.0 42.9, 51.5 50.0 Z M 47.0 50.0 C 44.0 45.5, 41.1 42.9, 38.4 41.1 C 42.9 43.8, 46.0 46.4, 48.5 50.0 Z" />
            <path d="M 100.0 47.0 C 102.0 37.2, 106.0 27.5, 111.7 21.6 C 108.0 29.4, 103.0 38.2, 102.0 47.0 Z M 98.0 47.0 C 95.0 39.2, 90.2 32.3, 85.3 27.5 C 92.2 33.3, 96.0 40.2, 100.0 47.0 Z M 101.0 47.0 C 106.0 40.2, 111.7 34.3, 116.6 30.4 C 110.8 35.3, 104.0 41.1, 103.0 47.0 Z M 99.5 47.0 C 99.0 38.2, 101.0 29.4, 102.9 23.5 C 102.0 30.4, 101.0 39.2, 101.5 47.0 Z M 97.0 47.0 C 94.0 42.1, 90.2 39.2, 87.3 37.2 C 92.2 40.2, 96.0 43.1, 98.5 47.0 Z" />
            <path d="M 160.0 44.0 C 158.0 33.8, 154.0 23.6, 147.8 17.5 C 152.0 25.6, 157.0 34.8, 162.0 44.0 Z M 158.0 44.0 C 155.0 35.8, 149.8 28.7, 144.7 23.6 C 151.8 29.7, 156.0 36.9, 160.0 44.0 Z M 161.0 44.0 C 166.0 36.9, 172.2 30.7, 177.3 26.7 C 171.2 31.8, 164.0 37.9, 163.0 44.0 Z M 159.5 44.0 C 159.0 34.8, 159.0 25.6, 156.9 19.5 C 158.0 26.7, 161.0 35.8, 161.5 44.0 Z M 157.0 44.0 C 154.0 38.9, 149.8 35.8, 146.7 33.8 C 151.8 36.9, 156.0 39.9, 158.5 44.0 Z" />
            <path d="M 225.0 43.0 C 227.0 33.6, 231.0 24.3, 236.2 18.7 C 233.0 26.2, 228.0 34.6, 227.0 43.0 Z M 223.0 43.0 C 220.0 35.5, 215.7 29.0, 211.0 24.3 C 217.5 29.9, 221.0 36.5, 225.0 43.0 Z M 226.0 43.0 C 231.0 36.5, 236.2 30.8, 240.9 27.1 C 235.3 31.8, 229.0 37.4, 228.0 43.0 Z M 224.5 43.0 C 224.0 34.6, 226.0 26.2, 227.8 20.6 C 227.0 27.1, 226.0 35.5, 226.5 43.0 Z M 222.0 43.0 C 219.0 38.3, 215.7 35.5, 212.8 33.6 C 217.5 36.5, 221.0 39.3, 223.5 43.0 Z" />
            <path d="M 295.0 45.0 C 293.0 35.2, 289.0 25.5, 283.3 19.6 C 287.0 27.4, 292.0 36.2, 297.0 45.0 Z M 293.0 45.0 C 290.0 37.2, 285.2 30.3, 280.3 25.5 C 287.2 31.3, 291.0 38.2, 295.0 45.0 Z M 296.0 45.0 C 301.0 38.2, 306.7 32.3, 311.6 28.4 C 305.8 33.3, 299.0 39.1, 298.0 45.0 Z M 294.5 45.0 C 294.0 36.2, 294.0 27.4, 292.1 21.5 C 293.0 28.4, 296.0 37.2, 296.5 45.0 Z M 292.0 45.0 C 289.0 40.1, 285.2 37.2, 282.3 35.2 C 287.2 38.2, 291.0 41.1, 293.5 45.0 Z" />
            <path d="M 365.0 47.0 C 367.0 38.5, 371.0 30.0, 375.2 24.9 C 373.0 31.7, 368.0 39.4, 367.0 47.0 Z M 363.0 47.0 C 360.0 40.2, 356.5 34.2, 352.2 30.0 C 358.2 35.1, 361.0 41.0, 365.0 47.0 Z M 366.0 47.0 C 371.0 41.0, 375.2 36.0, 379.4 32.5 C 374.4 36.8, 369.0 41.9, 368.0 47.0 Z M 364.5 47.0 C 364.0 39.4, 366.0 31.7, 367.6 26.6 C 367.0 32.5, 366.0 40.2, 366.5 47.0 Z M 362.0 47.0 C 359.0 42.8, 356.5 40.2, 353.9 38.5 C 358.2 41.0, 361.0 43.6, 363.5 47.0 Z" />
            <path d="M 475.0 49.0 C 473.0 41.8, 469.0 34.5, 466.3 30.2 C 467.0 36.0, 472.0 42.5, 477.0 49.0 Z M 473.0 49.0 C 470.0 43.2, 467.8 38.2, 464.2 34.5 C 469.2 38.9, 471.0 43.9, 475.0 49.0 Z M 476.0 49.0 C 481.0 43.9, 483.7 39.6, 487.3 36.7 C 482.9 40.3, 479.0 44.7, 478.0 49.0 Z M 474.5 49.0 C 474.0 42.5, 474.0 36.0, 472.8 31.7 C 473.0 36.7, 476.0 43.2, 476.5 49.0 Z M 472.0 49.0 C 469.0 45.4, 467.8 43.2, 465.6 41.8 C 469.2 43.9, 471.0 46.1, 473.5 49.0 Z" />
            <path d="M 555.0 50.0 C 557.0 43.2, 561.0 36.4, 563.2 32.3 C 563.0 37.8, 558.0 43.9, 557.0 50.0 Z M 553.0 50.0 C 550.0 44.6, 548.2 39.8, 544.8 36.4 C 549.6 40.5, 551.0 45.2, 555.0 50.0 Z M 556.0 50.0 C 561.0 45.2, 563.2 41.2, 566.6 38.4 C 562.5 41.8, 559.0 45.9, 558.0 50.0 Z M 554.5 50.0 C 554.0 43.9, 556.0 37.8, 557.0 33.7 C 557.0 38.4, 556.0 44.6, 556.5 50.0 Z M 552.0 50.0 C 549.0 46.6, 548.2 44.6, 546.2 43.2 C 549.6 45.2, 551.0 47.3, 553.5 50.0 Z" />
            <path d="M 675.0 50.0 C 673.0 43.2, 669.0 36.4, 666.8 32.3 C 667.0 37.8, 672.0 43.9, 677.0 50.0 Z M 673.0 50.0 C 670.0 44.6, 668.2 39.8, 664.8 36.4 C 669.6 40.5, 671.0 45.2, 675.0 50.0 Z M 676.0 50.0 C 681.0 45.2, 683.2 41.2, 686.6 38.4 C 682.5 41.8, 679.0 45.9, 678.0 50.0 Z M 674.5 50.0 C 674.0 43.9, 674.0 37.8, 673.0 33.7 C 673.0 38.4, 676.0 44.6, 676.5 50.0 Z M 672.0 50.0 C 669.0 46.6, 668.2 44.6, 666.2 43.2 C 669.6 45.2, 671.0 47.3, 673.5 50.0 Z" />
            <path d="M 755.0 49.0 C 757.0 41.8, 761.0 34.5, 763.7 30.2 C 763.0 36.0, 758.0 42.5, 757.0 49.0 Z M 753.0 49.0 C 750.0 43.2, 747.8 38.2, 744.2 34.5 C 749.2 38.9, 751.0 43.9, 755.0 49.0 Z M 756.0 49.0 C 761.0 43.9, 763.7 39.6, 767.3 36.7 C 762.9 40.3, 759.0 44.7, 758.0 49.0 Z M 754.5 49.0 C 754.0 42.5, 756.0 36.0, 757.2 31.7 C 757.0 36.7, 756.0 43.2, 756.5 49.0 Z M 752.0 49.0 C 749.0 45.4, 747.8 43.2, 745.6 41.8 C 749.2 43.9, 751.0 46.1, 753.5 49.0 Z" />
            <path d="M 865.0 46.0 C 863.0 36.6, 859.0 27.3, 853.8 21.7 C 857.0 29.2, 862.0 37.6, 867.0 46.0 Z M 863.0 46.0 C 860.0 38.5, 855.6 32.0, 851.0 27.3 C 857.5 32.9, 861.0 39.5, 865.0 46.0 Z M 866.0 46.0 C 871.0 39.5, 876.2 33.8, 880.9 30.1 C 875.3 34.8, 869.0 40.4, 868.0 46.0 Z M 864.5 46.0 C 864.0 37.6, 864.0 29.2, 862.2 23.6 C 863.0 30.1, 866.0 38.5, 866.5 46.0 Z M 862.0 46.0 C 859.0 41.3, 855.6 38.5, 852.8 36.6 C 857.5 39.5, 861.0 42.3, 863.5 46.0 Z" />
            <path d="M 935.0 44.0 C 937.0 33.8, 941.0 23.6, 947.2 17.5 C 943.0 25.6, 938.0 34.8, 937.0 44.0 Z M 933.0 44.0 C 930.0 35.8, 924.8 28.7, 919.7 23.6 C 926.8 29.7, 931.0 36.9, 935.0 44.0 Z M 936.0 44.0 C 941.0 36.9, 947.2 30.7, 952.3 26.7 C 946.2 31.8, 939.0 37.9, 938.0 44.0 Z M 934.5 44.0 C 934.0 34.8, 936.0 25.6, 938.1 19.5 C 937.0 26.7, 936.0 35.8, 936.5 44.0 Z M 932.0 44.0 C 929.0 38.9, 924.8 35.8, 921.7 33.8 C 926.8 36.9, 931.0 39.9, 933.5 44.0 Z" />
            <path d="M 1005.0 43.0 C 1003.0 33.2, 999.0 23.5, 993.3 17.6 C 997.0 25.4, 1002.0 34.2, 1007.0 43.0 Z M 1003.0 43.0 C 1000.0 35.2, 995.2 28.3, 990.3 23.5 C 997.2 29.3, 1001.0 36.2, 1005.0 43.0 Z M 1006.0 43.0 C 1011.0 36.2, 1016.7 30.3, 1021.6 26.4 C 1015.8 31.3, 1009.0 37.1, 1008.0 43.0 Z M 1004.5 43.0 C 1004.0 34.2, 1004.0 25.4, 1002.1 19.5 C 1003.0 26.4, 1006.0 35.2, 1006.5 43.0 Z M 1002.0 43.0 C 999.0 38.1, 995.2 35.2, 992.3 33.2 C 997.2 36.2, 1001.0 39.1, 1003.5 43.0 Z" />
            <path d="M 1075.0 44.0 C 1077.0 34.6, 1081.0 25.3, 1086.2 19.7 C 1083.0 27.2, 1078.0 35.6, 1077.0 44.0 Z M 1073.0 44.0 C 1070.0 36.5, 1065.7 30.0, 1061.0 25.3 C 1067.5 30.9, 1071.0 37.5, 1075.0 44.0 Z M 1076.0 44.0 C 1081.0 37.5, 1086.2 31.8, 1090.9 28.1 C 1085.3 32.8, 1079.0 38.4, 1078.0 44.0 Z M 1074.5 44.0 C 1074.0 35.6, 1076.0 27.2, 1077.8 21.6 C 1077.0 28.1, 1076.0 36.5, 1076.5 44.0 Z M 1072.0 44.0 C 1069.0 39.3, 1065.7 36.5, 1062.8 34.6 C 1067.5 37.5, 1071.0 40.3, 1073.5 44.0 Z" />
            <path d="M 1140.0 47.0 C 1138.0 37.2, 1134.0 27.5, 1128.3 21.6 C 1132.0 29.4, 1137.0 38.2, 1142.0 47.0 Z M 1138.0 47.0 C 1135.0 39.2, 1130.2 32.3, 1125.3 27.5 C 1132.2 33.3, 1136.0 40.2, 1140.0 47.0 Z M 1141.0 47.0 C 1146.0 40.2, 1151.7 34.3, 1156.6 30.4 C 1150.8 35.3, 1144.0 41.1, 1143.0 47.0 Z M 1139.5 47.0 C 1139.0 38.2, 1139.0 29.4, 1137.1 23.5 C 1138.0 30.4, 1141.0 39.2, 1141.5 47.0 Z M 1137.0 47.0 C 1134.0 42.1, 1130.2 39.2, 1127.3 37.2 C 1132.2 40.2, 1136.0 43.1, 1138.5 47.0 Z" />
            <path d="M 1190.0 50.0 C 1192.0 41.1, 1196.0 32.2, 1200.7 26.8 C 1198.0 33.9, 1193.0 42.0, 1192.0 50.0 Z M 1188.0 50.0 C 1185.0 42.9, 1181.1 36.6, 1176.6 32.2 C 1182.9 37.5, 1186.0 43.8, 1190.0 50.0 Z M 1191.0 50.0 C 1196.0 43.8, 1200.7 38.4, 1205.2 34.8 C 1199.8 39.3, 1194.0 44.6, 1193.0 50.0 Z M 1189.5 50.0 C 1189.0 42.0, 1191.0 33.9, 1192.7 28.6 C 1192.0 34.8, 1191.0 42.9, 1191.5 50.0 Z M 1187.0 50.0 C 1184.0 45.5, 1181.1 42.9, 1178.4 41.1 C 1182.9 43.8, 1186.0 46.4, 1188.5 50.0 Z" />
        </g>

        {/* 4. FOREGROUND VIBRANT GRASS BLADE TUFTS (Clustered botanical grass with highlighted tips) */}
        <g fill="url(#continuous-blade-grad)" className="anim-grass-wind-sway">
            <path d="M 35.0 52.0 C 37.0 41.5, 41.0 31.0, 47.6 24.7 C 43.0 33.1, 38.0 42.5, 37.0 52.0 Z M 33.0 52.0 C 30.0 43.6, 24.5 36.2, 19.2 31.0 C 26.6 37.3, 31.0 44.6, 35.0 52.0 Z M 36.0 52.0 C 41.0 44.6, 47.6 38.4, 52.9 34.1 C 46.5 39.4, 39.0 45.7, 38.0 52.0 Z M 34.5 52.0 C 34.0 42.5, 36.0 33.1, 38.1 26.8 C 37.0 34.1, 36.0 43.6, 36.5 52.0 Z M 32.0 52.0 C 29.0 46.8, 24.5 43.6, 21.4 41.5 C 26.6 44.6, 31.0 47.8, 33.5 52.0 Z" />
            <path d="M 85.0 49.0 C 83.0 37.5, 79.0 26.0, 71.2 19.1 C 77.0 28.3, 82.0 38.6, 87.0 49.0 Z M 83.0 49.0 C 80.0 39.8, 73.5 31.8, 67.8 26.0 C 75.8 32.9, 81.0 41.0, 85.0 49.0 Z M 86.0 49.0 C 91.0 41.0, 98.8 34.0, 104.5 29.5 C 97.7 35.2, 89.0 42.1, 88.0 49.0 Z M 84.5 49.0 C 84.0 38.6, 84.0 28.3, 81.5 21.4 C 83.0 29.5, 86.0 39.8, 86.5 49.0 Z M 82.0 49.0 C 79.0 43.2, 73.5 39.8, 70.0 37.5 C 75.8 41.0, 81.0 44.4, 83.5 49.0 Z" />
            <path d="M 145.0 46.0 C 147.0 34.0, 151.0 22.0, 159.4 14.8 C 153.0 24.4, 148.0 35.2, 147.0 46.0 Z M 143.0 46.0 C 140.0 36.4, 133.0 28.0, 127.0 22.0 C 135.4 29.2, 141.0 37.6, 145.0 46.0 Z M 146.0 46.0 C 151.0 37.6, 159.4 30.4, 165.4 25.6 C 158.2 31.6, 149.0 38.8, 148.0 46.0 Z M 144.5 46.0 C 144.0 35.2, 146.0 24.4, 148.6 17.2 C 147.0 25.6, 146.0 36.4, 146.5 46.0 Z M 142.0 46.0 C 139.0 40.0, 133.0 36.4, 129.4 34.0 C 135.4 37.6, 141.0 41.2, 143.5 46.0 Z" />
            <path d="M 210.0 45.0 C 208.0 34.0, 204.0 23.0, 196.8 16.4 C 202.0 25.2, 207.0 35.1, 212.0 45.0 Z M 208.0 45.0 C 205.0 36.2, 199.0 28.5, 193.5 23.0 C 201.2 29.6, 206.0 37.3, 210.0 45.0 Z M 211.0 45.0 C 216.0 37.3, 223.2 30.7, 228.7 26.3 C 222.1 31.8, 214.0 38.4, 213.0 45.0 Z M 209.5 45.0 C 209.0 35.1, 209.0 25.2, 206.7 18.6 C 208.0 26.3, 211.0 36.2, 211.5 45.0 Z M 207.0 45.0 C 204.0 39.5, 199.0 36.2, 195.7 34.0 C 201.2 37.3, 206.0 40.6, 208.5 45.0 Z" />
            <path d="M 280.0 47.0 C 282.0 35.5, 286.0 24.0, 293.8 17.1 C 288.0 26.3, 283.0 36.6, 282.0 47.0 Z M 278.0 47.0 C 275.0 37.8, 268.5 29.8, 262.8 24.0 C 270.8 30.9, 276.0 39.0, 280.0 47.0 Z M 281.0 47.0 C 286.0 39.0, 293.8 32.0, 299.6 27.5 C 292.6 33.2, 284.0 40.1, 283.0 47.0 Z M 279.5 47.0 C 279.0 36.6, 281.0 26.3, 283.4 19.4 C 282.0 27.5, 281.0 37.8, 281.5 47.0 Z M 277.0 47.0 C 274.0 41.2, 268.5 37.8, 265.1 35.5 C 270.8 39.0, 276.0 42.4, 278.5 47.0 Z" />
            <path d="M 350.0 49.0 C 348.0 39.0, 344.0 29.0, 338.0 23.0 C 342.0 31.0, 347.0 40.0, 352.0 49.0 Z M 348.0 49.0 C 345.0 41.0, 340.0 34.0, 335.0 29.0 C 342.0 35.0, 346.0 42.0, 350.0 49.0 Z M 351.0 49.0 C 356.0 42.0, 362.0 36.0, 367.0 32.0 C 361.0 37.0, 354.0 43.0, 353.0 49.0 Z M 349.5 49.0 C 349.0 40.0, 349.0 31.0, 347.0 25.0 C 348.0 32.0, 351.0 41.0, 351.5 49.0 Z M 347.0 49.0 C 344.0 44.0, 340.0 41.0, 337.0 39.0 C 342.0 42.0, 346.0 45.0, 348.5 49.0 Z" />
            <path d="M 460.0 51.0 C 462.0 42.5, 466.0 34.0, 470.2 28.9 C 468.0 35.7, 463.0 43.4, 462.0 51.0 Z M 458.0 51.0 C 455.0 44.2, 451.5 38.2, 447.2 34.0 C 453.2 39.1, 456.0 45.0, 460.0 51.0 Z M 461.0 51.0 C 466.0 45.0, 470.2 40.0, 474.4 36.5 C 469.4 40.8, 464.0 45.9, 463.0 51.0 Z M 459.5 51.0 C 459.0 43.4, 461.0 35.7, 462.6 30.6 C 462.0 36.5, 461.0 44.2, 461.5 51.0 Z M 457.0 51.0 C 454.0 46.8, 451.5 44.2, 448.9 42.5 C 453.2 45.0, 456.0 47.6, 458.5 51.0 Z" />
            <path d="M 540.0 52.0 C 538.0 44.0, 534.0 36.0, 530.4 31.2 C 532.0 37.6, 537.0 44.8, 542.0 52.0 Z M 538.0 52.0 C 535.0 45.6, 532.0 40.0, 528.0 36.0 C 533.6 40.8, 536.0 46.4, 540.0 52.0 Z M 541.0 52.0 C 546.0 46.4, 549.6 41.6, 553.6 38.4 C 548.8 42.4, 544.0 47.2, 543.0 52.0 Z M 539.5 52.0 C 539.0 44.8, 539.0 37.6, 537.6 32.8 C 538.0 38.4, 541.0 45.6, 541.5 52.0 Z M 537.0 52.0 C 534.0 48.0, 532.0 45.6, 529.6 44.0 C 533.6 46.4, 536.0 48.8, 538.5 52.0 Z" />
            <path d="M 660.0 52.0 C 662.0 44.0, 666.0 36.0, 669.6 31.2 C 668.0 37.6, 663.0 44.8, 662.0 52.0 Z M 658.0 52.0 C 655.0 45.6, 652.0 40.0, 648.0 36.0 C 653.6 40.8, 656.0 46.4, 660.0 52.0 Z M 661.0 52.0 C 666.0 46.4, 669.6 41.6, 673.6 38.4 C 668.8 42.4, 664.0 47.2, 663.0 52.0 Z M 659.5 52.0 C 659.0 44.8, 661.0 37.6, 662.4 32.8 C 662.0 38.4, 661.0 45.6, 661.5 52.0 Z M 657.0 52.0 C 654.0 48.0, 652.0 45.6, 649.6 44.0 C 653.6 46.4, 656.0 48.8, 658.5 52.0 Z" />
            <path d="M 740.0 51.0 C 738.0 42.5, 734.0 34.0, 729.8 28.9 C 732.0 35.7, 737.0 43.4, 742.0 51.0 Z M 738.0 51.0 C 735.0 44.2, 731.5 38.2, 727.2 34.0 C 733.2 39.1, 736.0 45.0, 740.0 51.0 Z M 741.0 51.0 C 746.0 45.0, 750.2 40.0, 754.5 36.5 C 749.4 40.8, 744.0 45.9, 743.0 51.0 Z M 739.5 51.0 C 739.0 43.4, 739.0 35.7, 737.5 30.6 C 738.0 36.5, 741.0 44.2, 741.5 51.0 Z M 737.0 51.0 C 734.0 46.8, 731.5 44.2, 729.0 42.5 C 733.2 45.0, 736.0 47.6, 738.5 51.0 Z" />
            <path d="M 850.0 48.0 C 852.0 37.0, 856.0 26.0, 863.2 19.4 C 858.0 28.2, 853.0 38.1, 852.0 48.0 Z M 848.0 48.0 C 845.0 39.2, 839.0 31.5, 833.5 26.0 C 841.2 32.6, 846.0 40.3, 850.0 48.0 Z M 851.0 48.0 C 856.0 40.3, 863.2 33.7, 868.7 29.3 C 862.1 34.8, 854.0 41.4, 853.0 48.0 Z M 849.5 48.0 C 849.0 38.1, 851.0 28.2, 853.3 21.6 C 852.0 29.3, 851.0 39.2, 851.5 48.0 Z M 847.0 48.0 C 844.0 42.5, 839.0 39.2, 835.7 37.0 C 841.2 40.3, 846.0 43.6, 848.5 48.0 Z" />
            <path d="M 920.0 46.0 C 918.0 34.0, 914.0 22.0, 905.6 14.8 C 912.0 24.4, 917.0 35.2, 922.0 46.0 Z M 918.0 46.0 C 915.0 36.4, 908.0 28.0, 902.0 22.0 C 910.4 29.2, 916.0 37.6, 920.0 46.0 Z M 921.0 46.0 C 926.0 37.6, 934.4 30.4, 940.4 25.6 C 933.2 31.6, 924.0 38.8, 923.0 46.0 Z M 919.5 46.0 C 919.0 35.2, 919.0 24.4, 916.4 17.2 C 918.0 25.6, 921.0 36.4, 921.5 46.0 Z M 917.0 46.0 C 914.0 40.0, 908.0 36.4, 904.4 34.0 C 910.4 37.6, 916.0 41.2, 918.5 46.0 Z" />
            <path d="M 990.0 45.0 C 992.0 33.5, 996.0 22.0, 1003.8 15.1 C 998.0 24.3, 993.0 34.6, 992.0 45.0 Z M 988.0 45.0 C 985.0 35.8, 978.5 27.8, 972.8 22.0 C 980.8 28.9, 986.0 37.0, 990.0 45.0 Z M 991.0 45.0 C 996.0 37.0, 1003.8 30.1, 1009.5 25.5 C 1002.6 31.2, 994.0 38.1, 993.0 45.0 Z M 989.5 45.0 C 989.0 34.6, 991.0 24.3, 993.5 17.4 C 992.0 25.5, 991.0 35.8, 991.5 45.0 Z M 987.0 45.0 C 984.0 39.2, 978.5 35.8, 975.0 33.5 C 980.8 37.0, 986.0 40.4, 988.5 45.0 Z" />
            <path d="M 1060.0 46.0 C 1058.0 35.0, 1054.0 24.0, 1046.8 17.4 C 1052.0 26.2, 1057.0 36.1, 1062.0 46.0 Z M 1058.0 46.0 C 1055.0 37.2, 1049.0 29.5, 1043.5 24.0 C 1051.2 30.6, 1056.0 38.3, 1060.0 46.0 Z M 1061.0 46.0 C 1066.0 38.3, 1073.2 31.7, 1078.7 27.3 C 1072.1 32.8, 1064.0 39.4, 1063.0 46.0 Z M 1059.5 46.0 C 1059.0 36.1, 1059.0 26.2, 1056.7 19.6 C 1058.0 27.3, 1061.0 37.2, 1061.5 46.0 Z M 1057.0 46.0 C 1054.0 40.5, 1049.0 37.2, 1045.7 35.0 C 1051.2 38.3, 1056.0 41.6, 1058.5 46.0 Z" />
            <path d="M 1125.0 49.0 C 1127.0 37.5, 1131.0 26.0, 1138.8 19.1 C 1133.0 28.3, 1128.0 38.6, 1127.0 49.0 Z M 1123.0 49.0 C 1120.0 39.8, 1113.5 31.8, 1107.8 26.0 C 1115.8 32.9, 1121.0 41.0, 1125.0 49.0 Z M 1126.0 49.0 C 1131.0 41.0, 1138.8 34.0, 1144.5 29.5 C 1137.7 35.2, 1129.0 42.1, 1128.0 49.0 Z M 1124.5 49.0 C 1124.0 38.6, 1126.0 28.3, 1128.5 21.4 C 1127.0 29.5, 1126.0 39.8, 1126.5 49.0 Z M 1122.0 49.0 C 1119.0 43.2, 1113.5 39.8, 1110.0 37.5 C 1115.8 41.0, 1121.0 44.4, 1123.5 49.0 Z" />
            <path d="M 1175.0 52.0 C 1173.0 41.5, 1169.0 31.0, 1162.4 24.7 C 1167.0 33.1, 1172.0 42.5, 1177.0 52.0 Z M 1173.0 52.0 C 1170.0 43.6, 1164.5 36.2, 1159.2 31.0 C 1166.6 37.3, 1171.0 44.6, 1175.0 52.0 Z M 1176.0 52.0 C 1181.0 44.6, 1187.6 38.4, 1192.8 34.1 C 1186.5 39.4, 1179.0 45.7, 1178.0 52.0 Z M 1174.5 52.0 C 1174.0 42.5, 1174.0 33.1, 1171.8 26.8 C 1173.0 34.1, 1176.0 43.6, 1176.5 52.0 Z M 1172.0 52.0 C 1169.0 46.8, 1164.5 43.6, 1161.3 41.5 C 1166.6 44.6, 1171.0 47.8, 1173.5 52.0 Z" />
        </g>
      </svg>

      {/* 5. NESTLED BOTANICAL FLORA (Strategically placed in clear view, never occluded by trunks) */}
      {/* Left Sector: Scarlet Poppy - Positioned clearly in the open grass */}
      <div
        onClick={() => onFlowerClick('poppy')}
        aria-label="Poppy"
        className="absolute bottom-2 left-[18%] sm:left-[21%] pointer-events-auto"
      >
        <RealisticPoppy bouncing={!!flowerBounce['poppy']} />
      </div>

      {/* Left Sector: Forest Amanita Mushroom */}
      <div
        onClick={() => onFlowerClick('shroom')}
        aria-label="Mushroom"
        className="absolute bottom-1.5 left-[29%] sm:left-[31%] pointer-events-auto"
      >
        <RealisticMushroom />
      </div>

      {/* Center Valley Cradle: Wild Bluebells (Nestled under the CircleBucket!) */}
      <div
        onClick={() => onFlowerClick('bluebell')}
        aria-label="Bluebells"
        className="absolute bottom-1 left-[48%] sm:left-[49%] pointer-events-auto"
      >
        <RealisticBluebell bouncing={!!flowerBounce['bluebell']} />
      </div>

      {/* Right Sector: Azure Wild Orchid */}
      <div
        onClick={() => onFlowerClick('orchid')}
        aria-label="Blue Orchid"
        className="absolute bottom-2 right-[29%] sm:right-[31%] pointer-events-auto"
      >
        <RealisticBlueOrchid bouncing={!!flowerBounce['orchid']} />
      </div>

      {/* Right Sector: Golden Dandelion - Positioned clearly in the open grass */}
      <div
        onClick={() => onFlowerClick('dandelion')}
        aria-label="Dandelion"
        className="absolute bottom-2 right-[18%] sm:right-[21%] pointer-events-auto"
      >
        <RealisticDandelion bouncing={!!flowerBounce['dandelion']} />
      </div>
    </div>
  )
}

function RealisticBluebell({ bouncing }: { bouncing: boolean }) {
  return (
    <div
      className={`relative select-none cursor-pointer group origin-bottom transition-transform ${
        bouncing ? 'anim-voxel-flower-bounce' : 'anim-badge-sway hover:scale-115 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 20 28"
        className="w-4 h-6 sm:w-5 sm:h-7 overflow-visible drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M 10 12 C 9 18, 10 24, 10 28" stroke="#16A34A" strokeWidth="1" strokeLinecap="round" />
        <path d="M 4 8 C 4 3, 16 3, 16 8 C 16 13, 13 14, 10 14 C 7 14, 4 13, 4 8 Z" fill="#818CF8" />
        <path d="M 6 9 C 6 5, 14 5, 14 9 C 14 12, 12 13, 10 13 C 8 13, 6 12, 6 9 Z" fill="#A5B4FC" />
        <circle cx="10" cy="14" r="1.2" fill="#E0E7FF" />
      </svg>
    </div>
  )
}

function RealisticPoppy({ bouncing }: { bouncing: boolean }) {
  return (
    <div
      className={`relative select-none cursor-pointer group origin-bottom transition-transform ${
        bouncing ? 'anim-voxel-flower-bounce' : 'anim-badge-sway hover:scale-115 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 24 34"
        className="w-5 h-7 sm:w-6 sm:h-8 overflow-visible drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="poppy-petal-grad" x1="12" y1="2" x2="12" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="40%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
        </defs>

        {/* Slender Curving Flower Stem */}
        <path d="M 12 16 C 11 22, 13 28, 12 34" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 12 24 C 15 22, 17 24, 18 25 C 16 26, 13 25, 12 25" fill="#22C55E" />

        {/* Layered Poppy Petals */}
        <ellipse cx="8" cy="8" rx="5.5" ry="5" fill="#DC2626" />
        <ellipse cx="16" cy="8" rx="5.5" ry="5" fill="#DC2626" />
        <circle cx="12" cy="7" r="6" fill="url(#poppy-petal-grad)" />
        <ellipse cx="12" cy="11" rx="6" ry="4" fill="url(#poppy-petal-grad)" />

        {/* Dark Poppy Center Pod */}
        <circle cx="12" cy="8.5" r="2.4" fill="#18181B" />
        <circle cx="10.8" cy="7.5" r="0.6" fill="#FDE047" />
        <circle cx="13.2" cy="7.5" r="0.6" fill="#FDE047" />
        <circle cx="12" cy="9.8" r="0.6" fill="#FDE047" />
      </svg>
    </div>
  )
}

function RealisticMushroom() {
  return (
    <div className="relative select-none cursor-pointer group origin-bottom transition-transform hover:scale-115 active:scale-95">
      <svg
        viewBox="0 0 20 24"
        className="w-4 h-5 sm:w-5 sm:h-6 overflow-visible drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shroom-cap-grad" x1="10" y1="2" x2="10" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="85%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
        </defs>

        <path
          d="M 8 12 C 7 16, 7 20, 6 24 L 14 24 C 13 20, 13 16, 12 12 Z"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth="0.5"
        />
        <path d="M 2 13 C 2 6, 6 2, 10 2 C 14 2, 18 6, 18 13 C 14 14, 6 14, 2 13 Z" fill="url(#shroom-cap-grad)" />
        <circle cx="6" cy="7" r="1.2" fill="#FFFFFF" opacity="0.9" />
        <circle cx="11" cy="5" r="1.4" fill="#FFFFFF" opacity="0.9" />
        <circle cx="14" cy="8" r="1.1" fill="#FFFFFF" opacity="0.9" />
        <circle cx="8" cy="11" r="0.9" fill="#FFFFFF" opacity="0.85" />
      </svg>
    </div>
  )
}

function RealisticBlueOrchid({ bouncing }: { bouncing: boolean }) {
  return (
    <div
      className={`relative select-none cursor-pointer group origin-bottom transition-transform ${
        bouncing ? 'anim-voxel-flower-bounce' : 'anim-badge-sway hover:scale-115 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 24 34"
        className="w-5 h-7 sm:w-6 sm:h-8 overflow-visible drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="orchid-petal-grad" x1="12" y1="2" x2="12" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        <path d="M 12 16 C 13 22, 11 28, 12 34" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 12 25 C 10 23, 8 24, 7 25 C 9 26, 11 25, 12 25" fill="#22C55E" />

        <ellipse cx="12" cy="5" rx="3.5" ry="5" fill="url(#orchid-petal-grad)" />
        <ellipse cx="7" cy="10" rx="4.5" ry="3.5" fill="url(#orchid-petal-grad)" />
        <ellipse cx="17" cy="10" rx="4.5" ry="3.5" fill="url(#orchid-petal-grad)" />
        <ellipse cx="12" cy="11" rx="3.5" ry="4" fill="#BAE6FD" />
        <circle cx="12" cy="9.5" r="1.4" fill="#FFFFFF" />
        <circle cx="12" cy="9.5" r="0.6" fill="#FDE047" />
      </svg>
    </div>
  )
}

function RealisticDandelion({ bouncing }: { bouncing: boolean }) {
  return (
    <div
      className={`relative select-none cursor-pointer group origin-bottom transition-transform ${
        bouncing ? 'anim-voxel-flower-bounce' : 'anim-badge-sway hover:scale-115 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 24 34"
        className="w-5 h-7 sm:w-6 sm:h-8 overflow-visible drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="dandelion-petal-grad" x1="12" y1="2" x2="12" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        <path d="M 12 16 C 11 22, 12 28, 12 34" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" />

        <g fill="url(#dandelion-petal-grad)">
          <ellipse cx="12" cy="9" rx="7" ry="3" />
          <ellipse cx="12" cy="9" rx="3" ry="7" />
          <ellipse cx="12" cy="9" rx="6.5" ry="4" transform="rotate(30 12 9)" />
          <ellipse cx="12" cy="9" rx="6.5" ry="4" transform="rotate(60 12 9)" />
          <ellipse cx="12" cy="9" rx="6.5" ry="4" transform="rotate(-30 12 9)" />
          <ellipse cx="12" cy="9" rx="6.5" ry="4" transform="rotate(-60 12 9)" />
        </g>
        <circle cx="12" cy="9" r="2.4" fill="#B45309" />
        <circle cx="12" cy="9" r="1.6" fill="#F59E0B" />
      </svg>
    </div>
  )
}

// ============================================================================
// REALISTIC VOLUMETRIC ATMOSPHERIC CLOUDS (ORGANIC BILLOWS & RIM LIGHTING)
// ============================================================================

function RealisticCloud({
  variant,
  isEvening,
  isNight,
}: {
  variant: 'grand' | 'fluffy' | 'wisp'
  isEvening: boolean
  isNight: boolean
}) {
  const prefix = `cloud-${variant}`

  // Atmospheric color states
  // Day: Luminous pure white crown, soft periwinkle-cerulean atmospheric base
  // Evening: Radiant sunset gold rim, glowing apricot coral mid, twilight plum/violet base
  // Night: Ethereal silver-cyan moonlit rim, slate-indigo core, midnight navy base
  const rimColor = isNight ? '#BAE6FD' : isEvening ? '#FEF08A' : '#FFFFFF'
  const topColor = isNight ? '#E2E8F0' : isEvening ? '#FED7AA' : '#FFFFFF'
  const midColor = isNight ? '#475569' : isEvening ? '#FB923C' : '#F8FAFC'
  const baseColor = isNight ? '#0F172A' : isEvening ? '#581C87' : '#E0F2FE'
  const creaseColor = isNight ? '#0B1329' : isEvening ? '#701A75' : '#BAE6FD'

  if (variant === 'grand') {
    return (
      <div className="relative select-none anim-cloud-float-subtle">
        <svg
          viewBox="0 0 170 56"
          className="w-44 sm:w-56 overflow-visible drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${prefix}-grad`} x1="85" y1="2" x2="85" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={topColor} />
              <stop offset="35%" stopColor={midColor} />
              <stop offset="75%" stopColor={isEvening ? '#C026D3' : midColor} />
              <stop offset="100%" stopColor={baseColor} />
            </linearGradient>

            <linearGradient id={`${prefix}-rim`} x1="40" y1="2" x2="130" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={rimColor} stopOpacity="0.95" />
              <stop offset="70%" stopColor={rimColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={rimColor} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* 1. Main Volumetric Cumulus Body */}
          <path
            d="M 24 46 C 12 46, 2 38, 5 28 C 7 19, 17 16, 26 18 C 31 8, 48 2, 65 6 C 74 0, 96 0, 107 8 C 117 4, 136 8, 142 19 C 154 20, 165 28, 161 38 C 158 45, 147 46, 138 46 Z"
            fill={`url(#${prefix}-grad)`}
            opacity="0.95"
          />

          {/* 2. Silver / Golden Rim Highlights on Upper Domes */}
          <path
            d="M 68 8 C 78 1, 95 1, 105 8"
            stroke={`url(#${prefix}-rim)`}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M 33 12 C 42 6, 54 5, 62 9"
            stroke={`url(#${prefix}-rim)`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 112 9 C 124 6, 134 10, 140 18"
            stroke={`url(#${prefix}-rim)`}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M 10 24 C 12 18, 19 16, 25 18"
            stroke={`url(#${prefix}-rim)`}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* 3. Volumetric Billow Creases */}
          <path
            d="M 48 28 C 58 24, 76 26, 84 32"
            stroke={creaseColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M 90 30 C 102 26, 118 28, 126 34"
            stroke={creaseColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 28 32 C 34 28, 42 30, 46 34"
            stroke={creaseColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.25"
          />
        </svg>
      </div>
    )
  }

  if (variant === 'fluffy') {
    return (
      <div className="relative select-none anim-cloud-float-subtle [animation-delay:-2.2s]">
        <svg
          viewBox="0 0 140 48"
          className="w-36 sm:w-46 overflow-visible drop-shadow-[0_6px_16px_rgba(0,0,0,0.1)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${prefix}-grad`} x1="70" y1="2" x2="70" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={topColor} />
              <stop offset="40%" stopColor={midColor} />
              <stop offset="80%" stopColor={isEvening ? '#A21CAF' : midColor} />
              <stop offset="100%" stopColor={baseColor} />
            </linearGradient>

            <linearGradient id={`${prefix}-rim`} x1="30" y1="2" x2="110" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={rimColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={rimColor} stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Main Stratocumulus Body */}
          <path
            d="M 20 40 C 10 40, 2 33, 5 24 C 7 17, 16 14, 22 16 C 27 7, 42 3, 55 7 C 63 1, 82 2, 91 9 C 99 5, 114 9, 119 18 C 129 19, 136 27, 132 35 C 128 40, 119 40, 110 40 Z"
            fill={`url(#${prefix}-grad)`}
            opacity="0.92"
          />

          {/* Rim Lighting */}
          <path
            d="M 60 7 C 72 2, 84 3, 92 10"
            stroke={`url(#${prefix}-rim)`}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M 30 11 C 39 6, 48 6, 54 10"
            stroke={`url(#${prefix}-rim)`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 98 10 C 108 8, 116 11, 120 18"
            stroke={`url(#${prefix}-rim)`}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Inner Billow Creases */}
          <path
            d="M 42 24 C 52 20, 68 22, 76 28"
            stroke={creaseColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 82 26 C 94 22, 106 24, 112 30"
            stroke={creaseColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.25"
          />
        </svg>
      </div>
    )
  }

  // variant === 'wisp'
  return (
    <div className="relative select-none anim-cloud-float-subtle [animation-delay:-3.8s]">
      <svg
        viewBox="0 0 110 36"
        className="w-28 sm:w-36 overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${prefix}-grad`} x1="55" y1="2" x2="55" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={topColor} />
            <stop offset="50%" stopColor={midColor} />
            <stop offset="100%" stopColor={baseColor} />
          </linearGradient>
        </defs>

        {/* Ethereal Wisp Cloudlet Body */}
        <path
          d="M 14 26 C 6 26, 0 21, 4 15 C 8 9, 20 9, 28 13 C 35 6, 54 4, 66 10 C 74 6, 88 8, 93 15 C 102 17, 105 24, 98 27 C 92 28, 84 26, 75 26 Z"
          fill={`url(#${prefix}-grad)`}
          opacity="0.82"
        />

        {/* Top Whispy Highlights */}
        <path
          d="M 38 9 C 48 5, 58 5, 66 11"
          stroke={rimColor}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 72 10 C 80 8, 88 10, 92 16"
          stroke={rimColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    </div>
  )
}

// ============================================================================
// DYNAMIC RANDOM BIRD DATA TYPES & CELESTIAL TYPES
// ============================================================================

export type BirdStatus = 'flying' | 'hit' | 'dead'

interface ActiveBird {
  id: string
  species: BirdSpecies
  name: string
  topPercent: number
  durationSec: number
  direction: 'ltr' | 'rtl'
  scale: number
  status: BirdStatus
  hitKey: number
  hitLeftPercent?: number
  hitTopPercent?: number
  fallDistancePx?: number
  landingLeftPercent?: number
}

export type SkyPhase = 'day' | 'evening' | 'night'
export type TransitionMode =
  | null
  | 'day-to-night'
  | 'night-to-day'
  | 'day-to-evening'
  | 'evening-to-night'

// Twinkling Minecraft night stars coordinate layout
const NIGHT_STARS = [
  { x: 8, y: 12, s: 1.5, d: '0s' },
  { x: 18, y: 6, s: 2, d: '0.8s' },
  { x: 28, y: 18, s: 1, d: '1.4s' },
  { x: 38, y: 8, s: 1.5, d: '0.3s' },
  { x: 48, y: 15, s: 2, d: '1.9s' },
  { x: 58, y: 6, s: 1.5, d: '0.6s' },
  { x: 68, y: 20, s: 1, d: '1.2s' },
  { x: 76, y: 9, s: 2, d: '1.7s' },
  { x: 86, y: 14, s: 1.5, d: '0.4s' },
  { x: 92, y: 7, s: 1, d: '2.1s' },
  { x: 14, y: 28, s: 1.5, d: '1.1s' },
  { x: 34, y: 32, s: 2, d: '0.5s' },
  { x: 54, y: 26, s: 1, d: '1.6s' },
  { x: 82, y: 29, s: 1.5, d: '0.9s' },
]

export function VoxelWorldBackdrop() {
  const [skyPhase, setSkyPhase] = useState<SkyPhase>('day')
  const [targetSkyPhase, setTargetSkyPhase] = useState<SkyPhase | null>(null)
  const [transitionMode, setTransitionMode] = useState<TransitionMode>(null)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
  const [activeBirds, setActiveBirds] = useState<ActiveBird[]>([])
  const [treeRustleLeft, setTreeRustleLeft] = useState<boolean>(false)
  const [treeRustleRight, setTreeRustleRight] = useState<boolean>(false)
  const [flowerBounce, setFlowerBounce] = useState<Record<string, boolean>>({})
  const [birdCatchCount, setBirdCatchCount] = useState<number>(0)
  const [showBirdGuiltModal, setShowBirdGuiltModal] = useState<boolean>(false)
  const birdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Initialize day/night mode from localStorage and sync with HTML dark class
  useEffect(() => {
    try {
      const savedBirdCount = parseInt(localStorage.getItem('gdg_bird_catch_count') || '0', 10)
      if (!isNaN(savedBirdCount)) setBirdCatchCount(savedBirdCount)
      const savedTheme = localStorage.getItem('minecraft_dark_mode')
      if (savedTheme === 'true') {
        setSkyPhase('night')
        document.documentElement.classList.add('dark')
      } else {
        setSkyPhase('day')
        document.documentElement.classList.remove('dark')
      }
    } catch {}
  }, [])

  // Spawns a new bird with randomized species, altitude, direction, speed, and depth scale
  const spawnBird = useCallback(() => {
    setActiveBirds((prev) => {
      // Limit concurrent flying birds to max 2 so the scene stays peaceful & realistic
      const flyingCount = prev.filter((b) => b.status === 'flying').length
      if (flyingCount >= 2) return prev

      const speciesPool: { species: BirdSpecies; name: string }[] = [
        { species: 'cyan', name: 'Blue Jay' },
        { species: 'scarlet', name: 'Scarlet Cardinal' },
        { species: 'emerald', name: 'Emerald Budgie' },
        { species: 'cockatiel', name: 'Golden Warbler' },
      ]
      const chosen = speciesPool[Math.floor(Math.random() * speciesPool.length)]
      const direction: 'ltr' | 'rtl' = Math.random() > 0.5 ? 'ltr' : 'rtl'
      const topPercent = Math.floor(4 + Math.random() * 24) // Altitude: 4% to 28%
      const durationSec = Math.floor(11 + Math.random() * 6) // Speed: 11s to 17s flight duration
      const scale = 0.92 + Math.random() * 0.22 // Depth variance

      const newBird: ActiveBird = {
        id: `bird_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        species: chosen.species,
        name: chosen.name,
        topPercent,
        durationSec,
        direction,
        scale,
        status: 'flying',
        hitKey: 0,
      }

      return [...prev, newBird]
    })
  }, [])

  // Randomized Time Spawner: Birds appear at random intervals (every 4.5s - 11.5s)
  useEffect(() => {
    let active = true

    // Initial appearance after 1s so user immediately sees a bird in the sky
    const initialTimer = setTimeout(() => {
      if (active) spawnBird()
    }, 1000)

    const scheduleRandomBird = () => {
      const randomInterval = Math.floor(4500 + Math.random() * 7000)
      birdTimerRef.current = setTimeout(() => {
        if (!active) return
        spawnBird()
        scheduleRandomBird()
      }, randomInterval)
    }

    scheduleRandomBird()

    return () => {
      active = false
      clearTimeout(initialTimer)
      if (birdTimerRef.current) clearTimeout(birdTimerRef.current)
    }
  }, [spawnBird])

  // Despawn bird when its flight animation across the sky finishes
  const handleBirdAnimationEnd = (id: string) => {
    setActiveBirds((prev) => prev.filter((b) => b.id !== id || b.status !== 'flying'))
  }

  // ============================================================================
  // REALISTIC CELESTIAL CYCLE: DAY ⇄ EVENING ⇄ NIGHT TRANSITIONS
  // ============================================================================

  const transitionToPhase = useCallback(
    (target: SkyPhase) => {
      if (isTransitioning || target === skyPhase) return

      let mode: TransitionMode = null
      if (skyPhase === 'day' && target === 'night') mode = 'day-to-night'
      else if (skyPhase === 'night' && target === 'day') mode = 'night-to-day'
      else if (skyPhase === 'evening' && target === 'night') mode = 'evening-to-night'
      else if (skyPhase === 'day' && target === 'evening') mode = 'day-to-night'
      else if (skyPhase === 'evening' && target === 'day') mode = 'night-to-day'
      else if (skyPhase === 'night' && target === 'evening') mode = 'night-to-day'

      setIsTransitioning(true)
      setTransitionMode(mode)

      // 1. Audio cues
      if (target === 'night' || mode === 'day-to-night') {
        voxelAudio.playSunset()
      } else if (target === 'day' || mode === 'night-to-day') {
        voxelAudio.playDay()
      }

      // 2. Synchronized Continuous Celestial Transitions (Zero breaks, smooth 60fps single curves)
      if (mode === 'day-to-night' || mode === 'evening-to-night') {
        // Immediate smooth sky crossfade into deep night sky
        setTargetSkyPhase('night')

        // Exact twilight crossover at 850ms as Sun submerges behind earth line
        setTimeout(() => {
          try {
            localStorage.setItem('minecraft_dark_mode', 'true')
            document.documentElement.classList.add('dark')
            voxelAudio.playNight()
          } catch {}
        }, 850)

        // Fluid lock at 1850ms when Moon arrives smoothly at Night Zenith
        setTimeout(() => {
          setSkyPhase('night')
          setTargetSkyPhase(null)
          setTransitionMode(null)
          setIsTransitioning(false)
        }, 1850)
      } else if (mode === 'night-to-day') {
        // Immediate smooth sky crossfade into daytime azure sky
        setTargetSkyPhase('day')

        // Exact dawn crossover at 850ms as Moon submerges behind earth line
        setTimeout(() => {
          try {
            localStorage.setItem('minecraft_dark_mode', 'false')
            document.documentElement.classList.remove('dark')
          } catch {}
        }, 850)

        // Fluid lock at 1850ms when Sun arrives smoothly at Day Zenith
        setTimeout(() => {
          setSkyPhase('day')
          setTargetSkyPhase(null)
          setTransitionMode(null)
          setIsTransitioning(false)
        }, 1850)
      }
    },
    [isTransitioning, skyPhase]
  )

  // Sun click handler: Single unbroken celestial plunge from Zenith all the way below horizon!
  const handleSunClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      transitionToPhase('night')
    },
    [transitionToPhase]
  )

  // Moon click handler: Single unbroken celestial plunge from Zenith all the way below horizon!
  const handleMoonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      transitionToPhase('day')
    },
    [transitionToPhase]
  )

  // Handle clicking a bird (Red damage flash, realistic gravity fall, landing poof & drops)
  const handleBirdClick = useCallback(
    (id: string, name: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()

      // Calculate exact coordinates relative to the backdrop container
      let hitLeftPercent = 50
      let hitTopPercent = 20
      let fallDistancePx = 220

      if (backdropRef.current) {
        const backdropRect = backdropRef.current.getBoundingClientRect()
        const buttonRect = e.currentTarget.getBoundingClientRect()
        const centerXPx = buttonRect.left + buttonRect.width / 2 - backdropRect.left
        const centerYPx = buttonRect.top + buttonRect.height / 2 - backdropRect.top
        hitLeftPercent = Math.max(3, Math.min(94, (centerXPx / backdropRect.width) * 100))
        hitTopPercent = Math.max(3, Math.min(75, (centerYPx / backdropRect.height) * 100))

        // Ground meadow baseline sits at 86% height of the container
        const groundYPx = backdropRect.height * 0.86
        fallDistancePx = Math.max(60, groundYPx - centerYPx)
      }

      // 1. Play hit sound immediately
      voxelAudio.playHurt()

      // Track caught birds for secret penance easter egg (triggers on 10 birds)
      setBirdCatchCount((prev) => {
        const next = prev + 1
        try {
          localStorage.setItem('gdg_bird_catch_count', String(next))
        } catch {}
        if (next >= 10) {
          setTimeout(() => {
            setShowBirdGuiltModal(true)
          }, 950)
        }
        return next
      })

      // 2. Transition bird to 'hit' status locked at exact clicked coordinates with calculated fall distance
      setActiveBirds((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.status !== 'flying') return b
          const forwardShiftPercent = b.direction === 'ltr' ? 4.5 : -4.5
          const landingLeftPercent = Math.max(4, Math.min(96, hitLeftPercent + forwardShiftPercent))
          return {
            ...b,
            status: 'hit',
            hitLeftPercent,
            hitTopPercent,
            fallDistancePx,
            landingLeftPercent,
          }
        })
      )

      // 3. Fall lasts 0.95s with pure continuous cubic-bezier acceleration - trigger landing poof at ground touchdown
      setTimeout(() => {
        voxelAudio.playPoof()
        voxelAudio.playXp()

        setActiveBirds((inner) =>
          inner.map((item) => (item.id === id ? { ...item, status: 'dead' } : item))
        )

        // 4. Remove dead bird after explosion finishes (1.2s)
        setTimeout(() => {
          setActiveBirds((inner) => inner.filter((item) => item.id !== id))
        }, 1200)
      }, 950)
    },
    []
  )

  // Handle tree click interaction
  const handleTreeClick = useCallback((side: 'left' | 'right') => {
    voxelAudio.playLeafRustle()
    if (side === 'left') {
      setTreeRustleLeft(true)
      setTimeout(() => setTreeRustleLeft(false), 800)
    } else {
      setTreeRustleRight(true)
      setTimeout(() => setTreeRustleRight(false), 800)
    }
  }, [])

  // Handle flower click interaction
  const handleFlowerClick = useCallback((id: string) => {
    voxelAudio.playFlowerPop()
    setFlowerBounce((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setFlowerBounce((prev) => ({ ...prev, [id]: false }))
    }, 600)
  }, [])

  const displayPhase = targetSkyPhase || skyPhase
  const isNight = displayPhase === 'night'
  const isEvening = displayPhase === 'evening'
  const isDay = displayPhase === 'day'
  const isSunset = isEvening
  const isSunrise = transitionMode === 'night-to-day'

  // Sun & Moon visibility logic (both present during continuous handover)
  const showSun =
    skyPhase === 'day' ||
    skyPhase === 'evening' ||
    transitionMode === 'day-to-night' ||
    transitionMode === 'evening-to-night' ||
    transitionMode === 'night-to-day'

  const showMoon =
    skyPhase === 'night' ||
    transitionMode === 'day-to-night' ||
    transitionMode === 'evening-to-night' ||
    transitionMode === 'night-to-day'

  let sunAnimClass = ''
  if (transitionMode === 'day-to-night') {
    sunAnimClass = 'anim-sun-sink-smooth'
  } else if (transitionMode === 'evening-to-night') {
    sunAnimClass = 'anim-sun-sink-from-evening'
  } else if (transitionMode === 'night-to-day') {
    sunAnimClass = 'anim-sun-rise-smooth'
  } else if (skyPhase === 'evening') {
    sunAnimClass = 'anim-celestial-sun-evening'
  } else if (skyPhase === 'day') {
    sunAnimClass = 'anim-celestial-sun-day'
  }

  let moonAnimClass = ''
  if (transitionMode === 'day-to-night' || transitionMode === 'evening-to-night') {
    moonAnimClass = 'anim-moon-rise-smooth'
  } else if (transitionMode === 'night-to-day') {
    moonAnimClass = 'anim-moon-sink-smooth'
  } else if (skyPhase === 'night') {
    moonAnimClass = 'anim-celestial-moon-night'
  }

  return (
    <div
      ref={backdropRef}
      aria-label="Interactive Minecraft Backdrop"
      className="pointer-events-none absolute -inset-x-2 sm:-inset-x-5 -inset-y-3 sm:-inset-y-5 z-0 select-none overflow-hidden rounded-3xl transition-all duration-700"
    >
      {/* ======================================================== */}
      {/* 0. ATMOSPHERIC SKY BACKDROP (PASSIVE BACKGROUND)          */}
      {/* ======================================================== */}
      <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl overflow-hidden">
        {/* 0A. DAYTIME SKY LAYER */}
        <div
          className={`absolute inset-0 rounded-3xl border transition-opacity duration-1200 ease-in-out ${
            displayPhase === 'day' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          } bg-gradient-to-b from-[#7DD3FC]/55 via-[#BAE6FD]/35 to-[#F0FDF4]/30 border-[#7DD3FC]/40 shadow-[inset_0_0_60px_rgba(255,255,255,0.4)]`}
        />

        {/* 0B. EVENING / SUNSET / GOLDEN HOUR SKY LAYER */}
        <div
          className={`absolute inset-0 rounded-3xl border transition-opacity duration-1200 ease-in-out ${
            displayPhase === 'evening' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          } bg-gradient-to-b from-[#2E1065] via-[#701A75]/90 via-[#C2410C]/85 via-[#EA580C]/85 to-[#FBBF24]/80 border-[#EA580C]/70 shadow-[inset_0_0_90px_rgba(234,88,12,0.45)]`}
        />

        {/* 0C. DEEP STARRY MIDNIGHT SKY LAYER */}
        <div
          className={`absolute inset-0 rounded-3xl border transition-opacity duration-1200 ease-in-out ${
            displayPhase === 'night' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          } bg-gradient-to-b from-[#020617] via-[#0B0F19] via-[#0F172A] to-[#1E1B4B]/90 border-[#38BDF8]/25 shadow-[inset_0_0_80px_rgba(15,23,42,0.8)]`}
        />

        {/* HORIZON VOLUMETRIC ATMOSPHERIC GLOW STRIP */}
        <div
          className={`absolute bottom-0 inset-x-0 h-28 pointer-events-none transition-opacity duration-1200 ease-in-out rounded-b-3xl ${
            displayPhase === 'evening'
              ? 'opacity-100 bg-gradient-to-t from-[#EA580C]/60 via-[#F97316]/30 to-transparent'
              : displayPhase === 'night'
              ? 'opacity-100 bg-gradient-to-t from-[#1E1B4B]/40 via-[#0F172A]/20 to-transparent'
              : 'opacity-0'
          }`}
        />
      </div>



      {/* Twinkling Minecraft Pixel Night Stars */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1200 ease-in-out ${
          displayPhase === 'night' ? 'opacity-100' : displayPhase === 'evening' ? 'opacity-25' : 'opacity-0'
        }`}
      >
        {NIGHT_STARS.map((star, idx) => (
          <span
            key={idx}
            className="absolute rounded-[0.2px] bg-white anim-voxel-star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s * 1.5}px`,
              height: `${star.s * 1.5}px`,
              animationDelay: star.d,
            }}
          />
        ))}
      </div>

      {/* ======================================================== */}
      {/* 1. CELESTIAL ANCHOR: SUN & MOON (PERFECTLY CENTERED, NEVER DISPLACED) */}
      {/* ======================================================== */}
      <div className="absolute top-2.5 right-4 sm:right-8 z-15 pointer-events-auto h-12 w-12 flex items-center justify-center">
        {/* THE SUN */}
        {showSun && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              disabled={isTransitioning}
              onClick={handleSunClick}
              aria-label={skyPhase === 'day' ? 'Sun' : 'Sunset'}
              className={`pointer-events-auto relative flex items-center justify-center p-1 focus:outline-none transition-all duration-300 ${
                isTransitioning
                  ? 'cursor-wait pointer-events-none'
                  : 'cursor-pointer hover:scale-115 active:scale-95'
              } ${sunAnimClass}`}
            >
              <RealisticSun isEvening={skyPhase === 'evening' || transitionMode === 'day-to-evening'} />
            </button>
          </div>
        )}

        {/* THE MOON */}
        {showMoon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              disabled={isTransitioning}
              onClick={handleMoonClick}
              aria-label="Moon"
              className={`pointer-events-auto relative flex items-center justify-center p-1 focus:outline-none transition-all duration-300 ${
                isTransitioning
                  ? 'cursor-wait pointer-events-none'
                  : 'cursor-pointer hover:scale-115 active:scale-95'
              } ${moonAnimClass}`}
            >
              <RealisticMoon />
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. REALISTIC VOLUMETRIC ATMOSPHERIC CLOUDS (PARALLAX)    */}
      {/* ======================================================== */}
      {/* Cloud 1: High-Altitude Majestic Cumulus Bank */}
      <div className="absolute top-1 sm:top-2 left-0 anim-realistic-cloud-slow pointer-events-none [animation-delay:-16s] z-10">
        <RealisticCloud variant="grand" isEvening={isEvening} isNight={isNight} />
      </div>

      {/* Cloud 2: Mid-Altitude Stratocumulus Bank */}
      <div className="absolute top-9 sm:top-12 left-0 anim-realistic-cloud-med pointer-events-none [animation-delay:-32s] z-10">
        <RealisticCloud variant="fluffy" isEvening={isEvening} isNight={isNight} />
      </div>

      {/* Cloud 3: Foreground Ethereal Wispy Cloudlet */}
      <div className="absolute top-16 sm:top-20 left-0 anim-realistic-cloud-fast pointer-events-none [animation-delay:-8s] z-10">
        <RealisticCloud variant="wisp" isEvening={isEvening} isNight={isNight} />
      </div>

      {/* ======================================================== */}
      {/* 3. DYNAMIC RANDOM MINECRAFT BIRDS (RANDOM APPEARANCE)     */}
      {/* ======================================================== */}
      {activeBirds.map((bird) => {
        if (bird.status === 'dead') {
          // Render Smoke Poof Burst & Dropped Feather / XP Orb at exact ground touchdown location
          const landingTop = 86
          const landingLeft = bird.landingLeftPercent ?? (bird.hitLeftPercent ?? (bird.direction === 'ltr' ? 55 : 45))

          return (
            <div
              key={`${bird.id}-poof-${bird.hitKey}`}
              className="absolute pointer-events-none z-30 flex flex-col items-center"
              style={{
                top: `${landingTop}%`,
                left: `${landingLeft}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* 8-Piece Minecraft Voxel Smoke Poof Explosion */}
              <div className="relative h-6 w-6">
                {[
                  { x: -16, y: -14 },
                  { x: 16, y: -16 },
                  { x: -18, y: 12 },
                  { x: 18, y: 14 },
                  { x: 0, y: -20 },
                  { x: -12, y: 0 },
                  { x: 14, y: 0 },
                  { x: 0, y: 18 },
                ].map((p, pIdx) => (
                  <span
                    key={pIdx}
                    className="absolute top-2 left-2 h-2.5 w-2.5 rounded-[0.5px] border border-[#CBD5E1] bg-[#F1F5F9] shadow-xs anim-voxel-poof"
                    style={
                      {
                        '--poof-x': `${p.x}px`,
                        '--poof-y': `${p.y}px`,
                        animationDelay: `${pIdx * 0.03}s`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>

              {/* Floating Voxel Feather Drop */}
              <div className="relative -mt-2 anim-voxel-feather">
                <div className="flex flex-col items-center rotate-45">
                  <div className="h-2 w-3 rounded-t-[0.5px] border border-[#94A3B8] bg-white" />
                  <div className="h-1.5 w-2.5 border-x border-[#94A3B8] bg-[#E2E8F0]" />
                  <div className="h-2.5 w-0.5 bg-[#64748B]" />
                </div>
              </div>

              {/* Bouncing Minecraft XP Orb (+1 XP) */}
              <div className="absolute -top-4 anim-voxel-xp">
                <div className="h-2.5 w-2.5 rounded-[0.5px] border border-[#15803D] bg-[#A3E635] shadow-[0_0_8px_#A3E635] flex items-center justify-center">
                  <span className="h-1 w-1 bg-[#FEF08A] rounded-[0.2px]" />
                </div>
              </div>
            </div>
          )
        }

        if (bird.status === 'hit') {
          // Bird hit: locked at clicked coordinates, redded up, tumbling down under continuous gravity
          const fallAnimClass =
            bird.direction === 'ltr'
              ? 'anim-realistic-bird-fall-ltr'
              : 'anim-realistic-bird-fall-rtl'

          return (
            <div
              key={bird.id}
              className="absolute z-30 pointer-events-none"
              style={{
                left: `${bird.hitLeftPercent ?? 50}%`,
                top: `${bird.hitTopPercent ?? bird.topPercent}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={fallAnimClass}
                style={{
                  ['--fall-distance-px' as any]: `${bird.fallDistancePx ?? 220}px`,
                }}
              >
                {/* Facing wrapper */}
                <div
                  style={{
                    transform: `scale(${bird.scale}) scaleX(${bird.direction === 'rtl' ? -1 : 1})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <RealisticBird species={bird.species} isHit={true} />
                </div>

                {/* Loose shedding feathers drifting in wind as bird falls */}
                <div className="absolute top-2 left-2 pointer-events-none">
                  <span className="absolute h-1.5 w-2 rounded-[0.5px] bg-[#DC2626]/85 anim-shed-feather-1" />
                  <span className="absolute h-1 w-1.5 rounded-[0.5px] bg-[#EF4444]/85 anim-shed-feather-2" />
                  <span className="absolute h-1 w-2 rounded-[0.5px] bg-[#F59E0B]/85 anim-shed-feather-3" />
                </div>
              </div>
            </div>
          )
        }

        // Flying bird
        const animClass =
          bird.direction === 'ltr'
            ? 'anim-voxel-fly-dynamic-ltr'
            : 'anim-voxel-fly-dynamic-rtl'

        return (
          <div
            key={bird.id}
            onAnimationEnd={() => handleBirdAnimationEnd(bird.id)}
            className={`absolute ${animClass} z-30 pointer-events-auto`}
            style={{
              top: `${bird.topPercent}%`,
              animationDuration: `${bird.durationSec}s`,
            }}
          >
            <button
              type="button"
              onClick={(e) => handleBirdClick(bird.id, bird.name, e)}
              aria-label={bird.name}
              className="group relative flex items-center p-2 focus:outline-none cursor-pointer transition-transform select-none hover:scale-115 active:scale-95"
            >
              {/* Facing & Scaling wrapper: faces RIGHT when ltr, faces LEFT when rtl */}
              <div
                style={{
                  transform: `scale(${bird.scale}) scaleX(${bird.direction === 'rtl' ? -1 : 1})`,
                  transformOrigin: 'center center',
                }}
              >
                <RealisticBird species={bird.species} isHit={false} />
              </div>


            </button>
          </div>
        )
      })}

      {/* ======================================================== */}
      {/* 5. REALISTIC BOTANICAL TERRAIN: TREES, GRASS & MEADOWS   */}
      {/* ======================================================== */}
      <div className="absolute bottom-0 inset-x-0 h-22 sm:h-26 md:h-30 z-25 pointer-events-none select-none overflow-hidden">
        {/* Continuous Soft Ground Horizon Baseline */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-t from-[#14532D]/30 dark:from-[#042F2E]/35 to-transparent pointer-events-none -z-10" />

        {/* Unbroken 100% Edge-to-Edge Meadow Terrain spanning under trees and bucket */}
        <ContinuousMeadowTerrain
          isEvening={isEvening}
          isNight={isNight}
          onFlowerClick={handleFlowerClick}
          flowerBounce={flowerBounce}
        />

        {/* Oak Tree: Rooted securely into the continuous left turf */}
        <div
          onClick={() => handleTreeClick('left')}
          aria-label="Oak Tree"
          className="absolute left-1 sm:left-4 md:left-6 bottom-0.5 sm:bottom-1 z-26 pointer-events-auto select-none"
        >
          <RealisticOakTree
            isEvening={isEvening}
            isNight={isNight}
            rustling={treeRustleLeft}
          />
        </div>

        {/* Birch Tree: Rooted securely into the continuous right turf */}
        <div
          onClick={() => handleTreeClick('right')}
          aria-label="Birch Tree"
          className="absolute right-1 sm:right-4 md:right-6 bottom-0.5 sm:bottom-1 z-26 pointer-events-auto select-none"
        >
          <RealisticBirchTree
            isEvening={isEvening}
            isNight={isNight}
            rustling={treeRustleRight}
          />
        </div>
      </div>

      {/* Secret Penance Easter Egg Full-Page Overlay */}
      <BirdGuiltEasterEggModal
        isOpen={showBirdGuiltModal}
        onClose={() => setShowBirdGuiltModal(false)}
      />

      {/* 6. AMBIENT PARTICLES: DAYTIME MOTES / NIGHT FIREFLIES     */}
      {/* ======================================================== */}
      {skyPhase === 'day' ? (
        <>
          <span className="absolute bottom-16 left-12 h-1.5 w-1.5 rounded-[0.5px] bg-[#1A73E8] shadow-[0_0_6px_rgba(26,115,232,0.8)] anim-voxel-pixel-1" />
          <span className="absolute bottom-12 right-16 h-1.5 w-1.5 rounded-[0.5px] bg-[#FBBC04] shadow-[0_0_6px_rgba(251,188,4,0.8)] anim-voxel-pixel-2" />
          <span className="absolute bottom-20 left-1/4 h-1 w-1 rounded-[0.5px] bg-[#34A853] shadow-[0_0_6px_rgba(52,168,83,0.8)] anim-voxel-pixel-3" />
          <span className="absolute bottom-14 right-1/4 h-1 w-1 rounded-[0.5px] bg-[#EA4335] shadow-[0_0_6px_rgba(234,67,53,0.8)] anim-voxel-pixel-1" />
        </>
      ) : isNight ? (
        /* Glowing Minecraft Nocturnal Fireflies */
        <>
          <span className="absolute bottom-14 left-16 h-1.5 w-1.5 rounded-[0.5px] bg-[#A3E635] shadow-[0_0_10px_#A3E635] anim-voxel-firefly" />
          <span
            className="absolute bottom-18 right-20 h-1.5 w-1.5 rounded-[0.5px] bg-[#FACC15] shadow-[0_0_10px_#FACC15] anim-voxel-firefly"
            style={{ animationDelay: '1.2s' }}
          />
          <span
            className="absolute bottom-24 left-1/3 h-1 w-1 rounded-[0.5px] bg-[#A3E635] shadow-[0_0_8px_#A3E635] anim-voxel-firefly"
            style={{ animationDelay: '2.5s' }}
          />
          <span
            className="absolute bottom-16 right-1/3 h-1 w-1 rounded-[0.5px] bg-[#FACC15] shadow-[0_0_8px_#FACC15] anim-voxel-firefly"
            style={{ animationDelay: '3.1s' }}
          />
        </>
      ) : null}
    </div>
  )
}
