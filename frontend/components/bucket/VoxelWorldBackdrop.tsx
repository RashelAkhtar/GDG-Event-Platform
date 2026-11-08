'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { soundManager } from '@/lib/sound'

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

function RealisticOakTree({
  isEvening,
  isNight,
  rustling,
}: {
  isEvening: boolean
  isNight: boolean
  rustling: boolean
}) {
  const foliageDeep = isNight ? '#064E3B' : isEvening ? '#78350F' : '#14532D'
  const foliageMid = isNight ? '#0D9488' : isEvening ? '#B45309' : '#15803D'
  const foliageLush = isNight ? '#0F766E' : isEvening ? '#D97706' : '#16A34A'
  const foliageBright = isNight ? '#14B8A6' : isEvening ? '#EAB308' : '#22C55E'
  const foliageHighlight = isNight ? '#5EEAD4' : isEvening ? '#FEF08A' : '#86EFAC'
  const trunkBase = isNight ? '#0F172A' : isEvening ? '#451A03' : '#451A03'
  const trunkBark = isNight ? '#1E293B' : isEvening ? '#78350F' : '#78350F'
  const trunkHighlight = isNight ? '#334155' : isEvening ? '#92400E' : '#92400E'

  return (
    <div
      className={`relative select-none transition-transform duration-300 origin-bottom cursor-pointer group ${
        rustling ? 'anim-tree-rustle-shake' : 'hover:scale-105 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 92 104"
        className="w-18 h-21 sm:w-22 sm:h-25 overflow-visible drop-shadow-[0_6px_14px_rgba(0,0,0,0.16)] anim-tree-breeze"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="oak-trunk-wood" x1="40" y1="50" x2="52" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={trunkHighlight} />
            <stop offset="50%" stopColor={trunkBark} />
            <stop offset="100%" stopColor={trunkBase} />
          </linearGradient>

          <radialGradient id="oak-foliage-deep" cx="48%" cy="40%" r="55%">
            <stop offset="0%" stopColor={foliageMid} />
            <stop offset="100%" stopColor={foliageDeep} />
          </radialGradient>

          <radialGradient id="oak-foliage-canopy" cx="45%" cy="32%" r="58%">
            <stop offset="0%" stopColor={foliageBright} />
            <stop offset="65%" stopColor={foliageLush} />
            <stop offset="100%" stopColor={foliageDeep} />
          </radialGradient>
        </defs>

        {/* 1. LAYER 1: DEEP SHADOW FOLIAGE MASS (Behind Trunk & Branches) */}
        <path
          d="M 28 62 C 16 60, 10 48, 14 36 C 18 27, 27 24, 34 25 C 38 14, 54 10, 64 16 C 74 13, 84 22, 82 34 C 88 42, 84 54, 74 58 C 66 64, 54 62, 48 58 C 40 64, 33 63, 28 62 Z"
          fill="url(#oak-foliage-deep)"
          opacity="0.95"
        />

        {/* 2. GNARLED OAK TRUNK WITH ROOTS & MAIN BOUGHS */}
        <g>
          {/* Main Root Flare & Trunk Body */}
          <path
            d="M 34 102 C 37 92, 41 80, 42 66 C 43 56, 38 48, 28 40 C 27 38, 29 36, 32 39 C 40 46, 44 54, 46 62 C 49 52, 56 42, 68 34 C 70 33, 72 35, 69 38 C 59 47, 54 58, 52 70 C 54 82, 55 92, 62 102 Z"
            fill="url(#oak-trunk-wood)"
          />
          {/* Central Crown Branch */}
          <path
            d="M 46 62 C 47 50, 48 40, 47 30 C 47 28, 49 28, 50 30 C 51 40, 50 50, 49 62 Z"
            fill={trunkBark}
          />
          {/* Natural Bark Texture Ribs */}
          <path d="M 40 98 C 43 86, 44 74, 45 64" stroke={trunkHighlight} strokeWidth="1" strokeLinecap="round" opacity="0.75" />
          <path d="M 48 99 C 50 88, 49 76, 51 68" stroke={trunkBase} strokeWidth="1" strokeLinecap="round" opacity="0.65" />
          <path d="M 44 94 C 45 84, 46 76, 47 70" stroke={trunkHighlight} strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* 3. LAYER 2: MIDGROUND LOBED CANOPY BOUGHS */}
        {/* Left Bough Foliage Cluster */}
        <path
          d="M 18 46 C 12 40, 14 30, 22 26 C 30 22, 38 27, 36 36 C 34 44, 24 48, 18 46 Z"
          fill="url(#oak-foliage-canopy)"
        />
        {/* Right Bough Foliage Cluster */}
        <path
          d="M 64 48 C 58 42, 60 30, 70 26 C 78 22, 86 28, 84 38 C 82 46, 72 50, 64 48 Z"
          fill="url(#oak-foliage-canopy)"
        />
        {/* Central Upper Crown Canopy */}
        <path
          d="M 30 42 C 22 38, 22 26, 30 20 C 36 14, 48 12, 56 16 C 64 12, 74 18, 72 28 C 76 36, 68 44, 60 44 C 54 48, 44 46, 38 42 C 34 44, 31 43, 30 42 Z"
          fill="url(#oak-foliage-canopy)"
        />

        {/* 4. LAYER 3: FOREGROUND CREST HIGHLIGHTS (Dappled Sunlight) */}
        <path
          d="M 38 18 C 44 14, 52 14, 56 17 C 52 19, 44 19, 38 18 Z"
          fill={foliageHighlight}
          opacity="0.8"
        />
        <ellipse cx="26" cy="24" rx="6" ry="3.5" fill={foliageHighlight} opacity="0.45" />
        <ellipse cx="70" cy="26" rx="6" ry="3.5" fill={foliageHighlight} opacity="0.45" />
        <ellipse cx="48" cy="22" rx="8" ry="4" fill={foliageHighlight} opacity="0.4" />
        <circle cx="48" cy="20" r="2.5" fill={foliageHighlight} opacity="0.6" />
      </svg>

      {/* Floating Falling Leaf Particles when clicked */}
      {rustling && (
        <>
          <span
            className="absolute top-4 left-4 h-1.5 w-1 rounded-full anim-organic-leaf-fall-1 pointer-events-none"
            style={{ backgroundColor: foliageBright }}
          />
          <span
            className="absolute top-6 right-5 h-1.5 w-1 rounded-full anim-organic-leaf-fall-2 pointer-events-none"
            style={{ backgroundColor: foliageHighlight }}
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
  const foliageDeep = isNight ? '#064E3B' : isEvening ? '#78350F' : '#14532D'
  const foliageMid = isNight ? '#0D9488' : isEvening ? '#B45309' : '#16A34A'
  const foliageBright = isNight ? '#14B8A6' : isEvening ? '#F59E0B' : '#22C55E'
  const foliageAiry = isNight ? '#2DD4BF' : isEvening ? '#FACC15' : '#4ADE80'
  const foliageHighlight = isNight ? '#99F6E4' : isEvening ? '#FEF08A' : '#A7F3D0'
  const trunkBase = isNight ? '#1E293B' : isEvening ? '#F5F5F4' : '#F8FAFC'
  const trunkShadow = isNight ? '#0F172A' : isEvening ? '#D6D3D1' : '#CBD5E1'
  const lenticelColor = isNight ? '#0B0F19' : isEvening ? '#292524' : '#1E293B'

  return (
    <div
      className={`relative select-none transition-transform duration-300 origin-bottom cursor-pointer group ${
        rustling ? 'anim-tree-rustle-shake' : 'hover:scale-105 active:scale-95'
      }`}
    >
      <svg
        viewBox="0 0 84 104"
        className="w-16 h-21 sm:w-20 sm:h-25 overflow-visible drop-shadow-[0_6px_14px_rgba(0,0,0,0.16)] anim-tree-breeze"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="birch-trunk-bark" x1="36" y1="46" x2="48" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={trunkBase} />
            <stop offset="65%" stopColor={trunkBase} />
            <stop offset="100%" stopColor={trunkShadow} />
          </linearGradient>

          <radialGradient id="birch-foliage-cluster" cx="46%" cy="36%" r="58%">
            <stop offset="0%" stopColor={foliageAiry} />
            <stop offset="60%" stopColor={foliageBright} />
            <stop offset="100%" stopColor={foliageDeep} />
          </radialGradient>
        </defs>

        {/* 1. SLENDER WEEPING BIRCH TRUNK & GRACEFUL BRANCHES */}
        <g>
          {/* Slender Arched Trunk */}
          <path
            d="M 37 102 C 39 88, 38 72, 40 56 C 41 46, 37 38, 30 30 C 29 29, 31 27, 33 29 C 39 35, 42 44, 43 54 C 45 44, 50 36, 58 28 C 60 27, 61 29, 59 31 C 53 38, 49 48, 48 60 C 49 74, 48 88, 51 102 Z"
            fill="url(#birch-trunk-bark)"
          />

          {/* Delicate Arching Upper Branches */}
          <path d="M 43 54 C 44 42, 43 32, 42 22" stroke={trunkBase} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 41 46 C 36 40, 28 36, 22 34" stroke={trunkBase} strokeWidth="0.9" strokeLinecap="round" />
          <path d="M 45 44 C 52 38, 60 36, 66 34" stroke={trunkBase} strokeWidth="0.9" strokeLinecap="round" />

          {/* Characteristic Birch Bark Charcoal Lenticels & Knot Markings */}
          <path d="M 38 96 L 43 96.5" stroke={lenticelColor} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M 45 91 L 49 92" stroke={lenticelColor} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M 39 83 L 44 83.5" stroke={lenticelColor} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 43 75 L 47 76" stroke={lenticelColor} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M 40 66 L 43.5 66.5" stroke={lenticelColor} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M 41 57 L 44.5 57" stroke={lenticelColor} strokeWidth="1" strokeLinecap="round" />
          {/* Branch Scar Diamond Knot */}
          <polygon points="42,70 44,68 44,72 42,74" fill={lenticelColor} opacity="0.8" />
        </g>

        {/* 2. AIRY WEEPING BIRCH CANOPY CLUSTERS */}
        {/* Rear Canopy Shadow */}
        <path
          d="M 22 48 C 14 42, 12 30, 18 22 C 24 16, 34 14, 40 16 C 44 8, 58 8, 64 14 C 72 12, 78 22, 74 30 C 78 38, 72 48, 62 48 C 54 52, 44 50, 38 46 C 30 50, 24 50, 22 48 Z"
          fill={foliageDeep}
          opacity="0.85"
        />

        {/* Midground Weeping Foliage Mass */}
        <path
          d="M 24 44 C 16 38, 15 28, 22 20 C 28 14, 36 13, 40 16 C 44 7, 56 7, 62 14 C 68 12, 75 20, 70 28 C 76 34, 68 44, 58 44 C 52 48, 42 46, 38 42 C 30 46, 26 46, 24 44 Z"
          fill="url(#birch-foliage-cluster)"
        />

        {/* Delicate Cascading Fringe Drops */}
        <ellipse cx="22" cy="34" rx="7" ry="9" fill="url(#birch-foliage-cluster)" opacity="0.9" />
        <ellipse cx="66" cy="34" rx="7" ry="9" fill="url(#birch-foliage-cluster)" opacity="0.9" />
        <ellipse cx="44" cy="18" rx="14" ry="10" fill="url(#birch-foliage-cluster)" />

        {/* Sunlit Highlights on Canopy Tops */}
        <ellipse cx="44" cy="14" rx="9" ry="3.5" fill={foliageHighlight} opacity="0.75" />
        <ellipse cx="60" cy="18" rx="6" ry="2.8" fill={foliageHighlight} opacity="0.55" />
        <ellipse cx="28" cy="22" rx="6" ry="2.8" fill={foliageHighlight} opacity="0.55" />
      </svg>

      {/* Floating Falling Leaf Particles when clicked */}
      {rustling && (
        <>
          <span
            className="absolute top-4 left-3 h-1.5 w-1 rounded-full anim-organic-leaf-fall-1 pointer-events-none"
            style={{ backgroundColor: foliageBright }}
          />
          <span
            className="absolute top-6 right-4 h-1.5 w-1 rounded-full anim-organic-leaf-fall-2 pointer-events-none"
            style={{ backgroundColor: foliageHighlight }}
          />
        </>
      )}
    </div>
  )
}

function RealisticGrassMeadow({
  isEvening,
  isNight,
  side,
}: {
  isEvening: boolean
  isNight: boolean
  side: 'left' | 'right'
}) {
  const turfDeep = isNight ? '#042F2E' : isEvening ? '#713F12' : '#14532D'
  const turfMid = isNight ? '#0F766E' : isEvening ? '#CA8A04' : '#15803D'
  const turfBright = isNight ? '#14B8A6' : isEvening ? '#EAB308' : '#22C55E'
  const bladeTip = isNight ? '#5EEAD4' : isEvening ? '#FDE047' : '#86EFAC'
  const earthDeep = isNight ? '#090D16' : isEvening ? '#451A03' : '#14532D'

  return (
    <div className="relative select-none pointer-events-none">
      <svg
        viewBox="0 0 150 42"
        className="w-34 h-9 sm:w-42 sm:h-11 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`meadow-earth-${side}`} x1="0" y1="12" x2="0" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={turfMid} />
            <stop offset="40%" stopColor={turfDeep} />
            <stop offset="100%" stopColor={earthDeep} />
          </linearGradient>

          <linearGradient id={`meadow-blade-grad-${side}`} x1="0" y1="2" x2="0" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={bladeTip} />
            <stop offset="45%" stopColor={turfBright} />
            <stop offset="100%" stopColor={turfDeep} />
          </linearGradient>
        </defs>

        {/* 1. NATURAL ROLLING EARTHEN KNOLL (Lush Verdant Contour) */}
        <path
          d={
            side === 'left'
              ? 'M 0 42 L 0 22 C 25 18, 55 14, 95 18 C 122 21, 140 28, 150 42 Z'
              : 'M 0 42 C 10 28, 28 21, 55 18 C 95 14, 125 18, 150 22 L 150 42 Z'
          }
          fill={`url(#meadow-earth-${side})`}
        />

        {/* 2. REAR SHADOW GRASS BLADES (Curved, slender, swaying with delay) */}
        <g fill={turfMid} opacity="0.9" className="anim-grass-wind-sway-delayed">
          {/* Cluster 1 */}
          <path d="M 10 32 C 11 20, 15 10, 22 4 C 18 12, 14 24, 13 33 Z" />
          <path d="M 18 33 C 21 21, 28 12, 36 6 C 30 16, 24 25, 22 34 Z" />
          <path d="M 28 34 C 27 22, 22 13, 16 7 C 22 16, 26 25, 30 35 Z" />

          {/* Cluster 2 */}
          <path d="M 50 30 C 52 18, 58 10, 68 4 C 62 14, 56 22, 54 31 Z" />
          <path d="M 62 31 C 65 20, 74 11, 84 6 C 78 16, 70 24, 66 32 Z" />
          <path d="M 76 32 C 74 22, 68 14, 60 8 C 66 16, 72 24, 78 33 Z" />

          {/* Cluster 3 */}
          <path d="M 98 32 C 100 21, 106 12, 116 7 C 110 16, 104 24, 102 33 Z" />
          <path d="M 112 33 C 114 23, 122 14, 132 10 C 126 18, 118 26, 116 34 Z" />
          <path d="M 126 34 C 124 24, 118 16, 110 11 C 116 18, 122 26, 128 35 Z" />
          <path d="M 136 36 C 137 26, 142 18, 148 13 C 144 21, 139 29, 138 37 Z" />
        </g>

        {/* 3. FOREGROUND VIBRANT GRASS BLADES (Curved botanical blades, sunlit tips) */}
        <g fill={`url(#meadow-blade-grad-${side})`} className="anim-grass-wind-sway">
          {/* Cluster 1 */}
          <path d="M 6 34 C 7 21, 12 11, 20 5 C 16 14, 11 25, 10 35 Z" />
          <path d="M 14 35 C 17 22, 25 12, 34 7 C 28 17, 21 26, 18 36 Z" />
          <path d="M 24 36 C 23 25, 18 16, 11 10 C 17 19, 22 28, 26 37 Z" />

          {/* Cluster 2 */}
          <path d="M 40 32 C 42 19, 48 9, 58 3 C 52 13, 46 23, 44 33 Z" />
          <path d="M 48 33 C 52 20, 60 11, 70 5 C 64 15, 56 24, 52 34 Z" />
          <path d="M 58 34 C 57 23, 50 13, 42 8 C 48 17, 54 26, 60 35 Z" />

          {/* Cluster 3 */}
          <path d="M 84 33 C 86 21, 92 11, 102 5 C 96 15, 90 24, 88 34 Z" />
          <path d="M 94 34 C 97 22, 105 13, 116 8 C 110 18, 102 26, 98 35 Z" />
          <path d="M 106 35 C 105 24, 98 15, 90 10 C 96 18, 102 27, 108 36 Z" />

          {/* Cluster 4 */}
          <path d="M 120 36 C 122 25, 128 16, 138 10 C 132 19, 126 28, 124 37 Z" />
          <path d="M 130 37 C 133 27, 140 18, 147 13 C 142 22, 136 30, 134 38 Z" />
        </g>
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
}

export type SkyPhase = 'day' | 'evening' | 'night'
export type TransitionMode =
  | null
  | 'day-to-evening'
  | 'evening-to-night'
  | 'night-to-day'

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
  const [transitionMode, setTransitionMode] = useState<TransitionMode>(null)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
  const [activeBirds, setActiveBirds] = useState<ActiveBird[]>([])
  const [treeRustleLeft, setTreeRustleLeft] = useState<boolean>(false)
  const [treeRustleRight, setTreeRustleRight] = useState<boolean>(false)
  const [flowerBounce, setFlowerBounce] = useState<Record<string, boolean>>({})
  const birdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Initialize day/night mode from localStorage and sync with HTML dark class
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('minecraft_dark_mode')
      if (savedTheme === 'true') {
        setSkyPhase('night')
        document.documentElement.classList.add('dark')
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
      if (skyPhase === 'day' && target === 'evening') mode = 'day-to-evening'
      else if (skyPhase === 'evening' && target === 'night') mode = 'evening-to-night'
      else if (skyPhase === 'night' && target === 'day') mode = 'night-to-day'
      else if (skyPhase === 'day' && target === 'night') mode = 'evening-to-night'
      else if (skyPhase === 'evening' && target === 'day') mode = 'night-to-day'
      else if (skyPhase === 'night' && target === 'evening') mode = 'day-to-evening'

      setIsTransitioning(true)
      setTransitionMode(mode)

      // Audio cue based on target phase
      if (target === 'evening') {
        voxelAudio.playSunset()
      } else if (target === 'night') {
        voxelAudio.playNight()
        try {
          localStorage.setItem('minecraft_dark_mode', 'true')
          document.documentElement.classList.add('dark')
        } catch {}
      } else if (target === 'day') {
        voxelAudio.playDay()
        try {
          localStorage.setItem('minecraft_dark_mode', 'false')
          document.documentElement.classList.remove('dark')
        } catch {}
      }

      // Smooth 1.4s celestial transition
      setTimeout(() => {
        setSkyPhase(target)
        setTransitionMode(null)
        setIsTransitioning(false)
      }, 1400)
    },
    [isTransitioning, skyPhase]
  )

  // Sun click handler: Day ➔ Evening ➔ Night
  const handleSunClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (skyPhase === 'day') transitionToPhase('evening')
      else if (skyPhase === 'evening') transitionToPhase('night')
    },
    [skyPhase, transitionToPhase]
  )

  // Moon click handler: Night ➔ Day
  const handleMoonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (skyPhase === 'night') transitionToPhase('day')
    },
    [skyPhase, transitionToPhase]
  )

  // Handle clicking a bird (Red damage flash, realistic gravity fall, landing poof & drops)
  const handleBirdClick = useCallback(
    (id: string, name: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()

      // Calculate exact coordinates relative to the backdrop container
      let hitLeftPercent = 50
      let hitTopPercent = 20
      if (backdropRef.current) {
        const backdropRect = backdropRef.current.getBoundingClientRect()
        const buttonRect = e.currentTarget.getBoundingClientRect()
        const centerXPx = buttonRect.left + buttonRect.width / 2 - backdropRect.left
        const centerYPx = buttonRect.top + buttonRect.height / 2 - backdropRect.top
        hitLeftPercent = Math.max(3, Math.min(94, (centerXPx / backdropRect.width) * 100))
        hitTopPercent = Math.max(3, Math.min(75, (centerYPx / backdropRect.height) * 100))
      }

      // 1. Play hit sound immediately
      voxelAudio.playHurt()

      // 2. Transition bird to 'hit' status locked at exact clicked coordinates
      setActiveBirds((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.status !== 'flying') return b
          return {
            ...b,
            status: 'hit',
            hitLeftPercent,
            hitTopPercent,
          }
        })
      )

      // 3. Fall lasts 1.15s - play poof and xp chime upon ground impact
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
      }, 1150)
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

  const isNight = skyPhase === 'night'
  const isEvening = skyPhase === 'evening'
  const isDay = skyPhase === 'day'
  const isSunset = isEvening
  const isSunrise = transitionMode === 'night-to-day'

  // Sun & Moon visibility logic
  const showSun =
    skyPhase === 'day' ||
    skyPhase === 'evening' ||
    transitionMode === 'day-to-evening' ||
    transitionMode === 'evening-to-night' ||
    transitionMode === 'night-to-day'

  const showMoon =
    skyPhase === 'night' ||
    transitionMode === 'evening-to-night' ||
    transitionMode === 'night-to-day'

  let sunAnimClass = ''
  if (transitionMode === 'day-to-evening') {
    sunAnimClass = 'anim-sun-descend-to-evening'
  } else if (transitionMode === 'evening-to-night') {
    sunAnimClass = 'anim-sun-sink-below-horizon'
  } else if (transitionMode === 'night-to-day') {
    sunAnimClass = 'anim-sun-rise-to-day'
  } else if (skyPhase === 'evening') {
    sunAnimClass = 'translate-x-[6px] translate-y-[32px] scale-110'
  } else if (skyPhase === 'day') {
    sunAnimClass = 'anim-celestial-sun-day'
  }

  let moonAnimClass = ''
  if (transitionMode === 'evening-to-night') {
    moonAnimClass = 'anim-moon-rise-from-horizon'
  } else if (transitionMode === 'night-to-day') {
    moonAnimClass = 'anim-moon-sink-below-horizon'
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
          className={`absolute inset-0 rounded-3xl border transition-opacity duration-1000 ${
            skyPhase === 'day' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          } bg-gradient-to-b from-[#7DD3FC]/55 via-[#BAE6FD]/35 to-[#F0FDF4]/30 border-[#7DD3FC]/40 shadow-[inset_0_0_60px_rgba(255,255,255,0.4)]`}
        />

        {/* 0B. EVENING / SUNSET / GOLDEN HOUR SKY LAYER */}
        <div
          className={`absolute inset-0 rounded-3xl border transition-opacity duration-1000 ${
            skyPhase === 'evening' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          } bg-gradient-to-b from-[#2E1065] via-[#701A75]/90 via-[#C2410C]/85 via-[#EA580C]/85 to-[#FBBF24]/80 border-[#EA580C]/70 shadow-[inset_0_0_90px_rgba(234,88,12,0.45)]`}
        />

        {/* 0C. DEEP STARRY MIDNIGHT SKY LAYER */}
        <div
          className={`absolute inset-0 rounded-3xl border transition-opacity duration-1000 ${
            skyPhase === 'night' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          } bg-gradient-to-b from-[#020617] via-[#0B0F19] via-[#0F172A] to-[#1E1B4B]/90 border-[#38BDF8]/25 shadow-[inset_0_0_80px_rgba(15,23,42,0.8)]`}
        />

        {/* HORIZON VOLUMETRIC ATMOSPHERIC GLOW STRIP */}
        <div
          className={`absolute bottom-0 inset-x-0 h-28 pointer-events-none transition-opacity duration-1000 rounded-b-3xl ${
            isEvening
              ? 'opacity-100 bg-gradient-to-t from-[#EA580C]/60 via-[#F97316]/30 to-transparent'
              : isNight
              ? 'opacity-100 bg-gradient-to-t from-[#1E1B4B]/40 via-[#0F172A]/20 to-transparent'
              : 'opacity-0'
          }`}
        />
      </div>



      {/* Twinkling Minecraft Pixel Night Stars */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isNight ? 'opacity-100' : isEvening ? 'opacity-25' : 'opacity-0'
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
      <div className="absolute top-2.5 right-4 sm:right-8 z-30 pointer-events-auto h-12 w-12 flex items-center justify-center">
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
          // Render Smoke Poof Burst & Dropped Feather / XP Orb at impact landing spot
          const landingTop = Math.min(88, (bird.hitTopPercent ?? bird.topPercent) + 38)
          const landingLeft = bird.hitLeftPercent ?? (bird.direction === 'ltr' ? 55 : 45)

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
          // Bird hit: locked at clicked coordinates, redded up, tumbling down under gravity
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
              <div className={fallAnimClass}>
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
      <div className="absolute bottom-0 inset-x-0 flex items-end justify-between z-20 pointer-events-none px-2 sm:px-4">
        {/* Continuous Soft Ground Horizon Baseline */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-t from-[#14532D]/30 dark:from-[#042F2E]/35 to-transparent pointer-events-none -z-10" />

        {/* ---------------------------------------------------- */}
        {/* LEFT FLANK: MAJESTIC OAK GROVE + MEADOW + POPPY & MUSHROOM */}
        {/* ---------------------------------------------------- */}
        <div className="flex items-end gap-1 sm:gap-2 pointer-events-auto select-none">
          {/* Detailed Realistic Oak Tree */}
          <div onClick={() => handleTreeClick('left')} aria-label="Oak Tree">
            <RealisticOakTree
              isEvening={isEvening}
              isNight={isNight}
              rustling={treeRustleLeft}
            />
          </div>

          {/* Organic Rolling Meadow & Grass Blade Fringe */}
          <div className="relative flex items-end -ml-3 sm:-ml-2">
            <RealisticGrassMeadow
              isEvening={isEvening}
              isNight={isNight}
              side="left"
            />

            {/* Poppy nestled naturally inside meadow grass */}
            <div
              onClick={() => handleFlowerClick('poppy')}
              aria-label="Poppy"
              className="absolute bottom-1 left-7 sm:left-9 pointer-events-auto"
            >
              <RealisticPoppy bouncing={!!flowerBounce['poppy']} />
            </div>

            {/* Wild forest mushroom in grass */}
            <div
              onClick={() => handleFlowerClick('shroom')}
              aria-label="Mushroom"
              className="absolute bottom-0.5 right-4 sm:right-6 pointer-events-auto"
            >
              <RealisticMushroom />
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT FLANK: MEADOW + ORCHID & DANDELION + BIRCH GROVE */}
        {/* ---------------------------------------------------- */}
        <div className="flex items-end gap-1 sm:gap-2 pointer-events-auto select-none">
          {/* Organic Rolling Meadow & Grass Blade Fringe */}
          <div className="relative flex items-end -mr-3 sm:-mr-2">
            <RealisticGrassMeadow
              isEvening={isEvening}
              isNight={isNight}
              side="right"
            />

            {/* Blue Orchid nestled in grass */}
            <div
              onClick={() => handleFlowerClick('orchid')}
              aria-label="Blue Orchid"
              className="absolute bottom-1 left-5 sm:left-7 pointer-events-auto"
            >
              <RealisticBlueOrchid bouncing={!!flowerBounce['orchid']} />
            </div>

            {/* Golden Dandelion nestled in grass */}
            <div
              onClick={() => handleFlowerClick('dandelion')}
              aria-label="Dandelion"
              className="absolute bottom-1 right-7 sm:right-9 pointer-events-auto"
            >
              <RealisticDandelion bouncing={!!flowerBounce['dandelion']} />
            </div>
          </div>

          {/* Slender Realistic Birch Tree */}
          <div onClick={() => handleTreeClick('right')} aria-label="Birch Tree">
            <RealisticBirchTree
              isEvening={isEvening}
              isNight={isNight}
              rustling={treeRustleRight}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
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
