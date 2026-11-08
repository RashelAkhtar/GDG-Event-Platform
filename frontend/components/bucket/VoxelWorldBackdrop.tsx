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
    if (soundManager.isMuted()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const freqs = toNight
        ? [523.25, 440.0, 392.0, 329.63] // C5 -> A4 -> G4 -> E4 (Twilight descent)
        : [329.63, 392.0, 440.0, 523.25, 659.25] // E4 -> G4 -> A4 -> C5 -> E5 (Dawn ascension)

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

export type BirdSpecies = 'scarlet' | 'cyan' | 'emerald' | 'cockatiel'

function DetailedMinecraftBird({
  species,
  isHit,
}: {
  species: BirdSpecies
  isHit: boolean
}) {
  if (species === 'scarlet') {
    // 1. SCARLET MACAW (Classic Red Minecraft Parrot)
    return (
      <div className={`relative flex items-center drop-shadow-md select-none ${isHit ? 'filter-red-flash' : ''}`}>
        {/* Left Wing (Beating in 3D perspective) */}
        <div className={`flex flex-col anim-voxel-wing-l origin-right ${isHit ? '!bg-red-600' : ''}`}>
          <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#B45309] bg-[#FACC15]" />
          <div className="h-1 w-4 border-x border-[#0369A1] bg-[#0284C7]" />
          <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#1E3A8A] bg-[#1D4ED8]" />
        </div>

        {/* Central Bird Body: Tail + Torso + Head & Crest + Hooked Beak */}
        <div className="relative flex items-center">
          {/* Graduated Rectrix Tail */}
          <div className="flex flex-col items-end -mr-0.5">
            <div className="h-1 w-3 rounded-l-[0.5px] bg-[#DC2626] border-y border-[#991B1B]" />
            <div className="h-1.5 w-4.5 rounded-l-[0.5px] bg-[#1D4ED8] border-y border-l border-[#1E3A8A] -mt-0.5" />
            <div className="h-1 w-2.5 rounded-l-[0.5px] bg-[#DC2626] border-y border-[#991B1B] -mt-0.5" />
          </div>

          {/* Main Torso & Breast */}
          <div className="relative flex flex-col items-center">
            {/* Upper Chest Highlight */}
            <div className="h-1 w-5 rounded-t-[0.5px] bg-[#EF4444]" />
            {/* Mid Torso with Wing Covert Saddle */}
            <div className="h-3 w-5 bg-[#DC2626] border-x border-[#991B1B] relative flex items-center justify-center">
              <span className="h-2 w-2 rounded-[0.2px] bg-[#FACC15] border border-[#B45309]/80 shadow-2xs" />
            </div>
            {/* Lower Abdomen & Tucked Talons */}
            <div className="h-1 w-5 rounded-b-[0.5px] bg-[#991B1B] flex justify-center gap-1">
              <span className="h-0.5 w-1 bg-[#475569] rounded-b-[0.2px]" />
              <span className="h-0.5 w-1 bg-[#475569] rounded-b-[0.2px]" />
            </div>
          </div>

          {/* Head, Crest, White Facial Patch, Eye & Hooked Beak */}
          <div className="relative flex flex-col items-start -ml-0.5">
            {/* Raised Feather Crest */}
            <div className="h-1.5 w-2.5 rounded-t-[0.5px] border-t border-x border-[#991B1B] bg-[#EF4444] ml-0.5 flex">
              <span className="h-1 w-1 bg-[#FACC15] rounded-[0.2px]" />
            </div>
            {/* Main Head Cube */}
            <div className="relative h-3.5 w-3.5 rounded-[0.5px] border border-[#991B1B] bg-[#DC2626] flex items-center justify-center">
              {/* Authentic White Facial Skin Patch */}
              <div className="absolute top-0.5 right-0.5 h-2 w-2 rounded-[0.2px] bg-[#F8FAFC] border border-[#CBD5E1]/60 flex items-center justify-center">
                {/* Black Pupil with Specular Gleam */}
                <span className="relative h-1 w-1 rounded-[0.2px] bg-[#0F172A] flex items-start justify-end">
                  <span className="h-0.5 w-0.5 bg-white rounded-[0.1px]" />
                </span>
              </div>
            </div>
          </div>

          {/* Two-piece Hooked Minecraft Beak */}
          <div className="flex flex-col items-start -ml-0.5">
            {/* Upper Hooked Maxilla with Nostril */}
            <div className="relative h-2 w-2 rounded-tr-[0.5px] border-t border-r border-[#0F172A] bg-[#1E293B]">
              <span className="absolute top-0.5 left-0.5 h-0.5 w-0.5 bg-[#475569] rounded-[0.1px]" />
            </div>
            {/* Lower Mandible */}
            <div className="h-1 w-1.5 rounded-br-[0.5px] border-b border-r border-[#64748B] bg-[#E2E8F0]" />
          </div>
        </div>

        {/* Right Wing (Beating in 3D perspective) */}
        <div className={`flex flex-col anim-voxel-wing-r origin-left ${isHit ? '!bg-red-600' : ''}`}>
          <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#B45309] bg-[#FACC15]" />
          <div className="h-1 w-4 border-x border-[#0369A1] bg-[#0284C7]" />
          <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#1E3A8A] bg-[#1D4ED8]" />
        </div>
      </div>
    )
  }

  if (species === 'cyan') {
    // 2. CYAN / HYACINTH PARROT
    return (
      <div className={`relative flex items-center drop-shadow-md select-none ${isHit ? 'filter-red-flash' : ''}`}>
        {/* Left Wing */}
        <div className="flex flex-col anim-voxel-wing-l origin-right">
          <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#0284C7] bg-[#38BDF8]" />
          <div className="h-1 w-4 border-x border-[#0369A1] bg-[#0284C7]" />
          <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#1E3A8A] bg-[#1D4ED8]" />
        </div>

        {/* Tail + Body + Head + Beak */}
        <div className="relative flex items-center">
          <div className="flex flex-col items-end -mr-0.5">
            <div className="h-1 w-2.5 rounded-l-[0.5px] bg-[#0284C7]" />
            <div className="h-1.5 w-4 rounded-l-[0.5px] bg-[#38BDF8] border-y border-l border-[#0284C7] -mt-0.5" />
            <div className="h-1 w-2 rounded-l-[0.5px] bg-[#1E3A8A] -mt-0.5" />
          </div>

          <div className="relative flex flex-col items-center">
            <div className="h-1 w-5 rounded-t-[0.5px] bg-[#38BDF8]" />
            <div className="h-3 w-5 bg-[#0284C7] border-x border-[#0369A1] relative flex items-center justify-center">
              <span className="h-2 w-2 rounded-[0.2px] bg-[#0EA5E9] border border-[#0284C7]" />
            </div>
            <div className="h-1 w-5 rounded-b-[0.5px] bg-[#075985] flex justify-center gap-1">
              <span className="h-0.5 w-1 bg-[#475569] rounded-b-[0.2px]" />
              <span className="h-0.5 w-1 bg-[#475569] rounded-b-[0.2px]" />
            </div>
          </div>

          <div className="relative flex flex-col items-start -ml-0.5">
            <div className="h-1.5 w-2.5 rounded-t-[0.5px] border-t border-x border-[#0369A1] bg-[#38BDF8] ml-0.5" />
            <div className="relative h-3.5 w-3.5 rounded-[0.5px] border border-[#0369A1] bg-[#0284C7] flex items-center justify-center">
              {/* Golden Eye Ring */}
              <div className="absolute top-0.5 right-0.5 h-2 w-2 rounded-[0.2px] bg-[#FEF08A] border border-[#FACC15] flex items-center justify-center">
                <span className="relative h-1 w-1 rounded-[0.2px] bg-[#0F172A] flex items-start justify-end">
                  <span className="h-0.5 w-0.5 bg-white rounded-[0.1px]" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start -ml-0.5">
            <div className="relative h-2 w-2 rounded-tr-[0.5px] border-t border-r border-black bg-[#1E293B]">
              <span className="absolute -top-0.5 left-0 h-0.5 w-1 bg-[#FACC15] rounded-[0.1px]" />
            </div>
            <div className="h-1 w-1.5 rounded-br-[0.5px] border-b border-r border-[#475569] bg-[#64748B]" />
          </div>
        </div>

        {/* Right Wing */}
        <div className="flex flex-col anim-voxel-wing-r origin-left">
          <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#0284C7] bg-[#38BDF8]" />
          <div className="h-1 w-4 border-x border-[#0369A1] bg-[#0284C7]" />
          <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#1E3A8A] bg-[#1D4ED8]" />
        </div>
      </div>
    )
  }

  if (species === 'emerald') {
    // 3. EMERALD BUDGIE / GREEN PARROT
    return (
      <div className={`relative flex items-center drop-shadow-md select-none ${isHit ? 'filter-red-flash' : ''}`}>
        {/* Left Wing */}
        <div className="flex flex-col anim-voxel-wing-l origin-right">
          <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#CA8A04] bg-[#FACC15]" />
          <div className="h-1 w-4 border-x border-[#15803D] bg-[#22C55E]" />
          <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#14532D] bg-[#166534]" />
        </div>

        {/* Tail + Body + Head + Beak */}
        <div className="relative flex items-center">
          <div className="flex flex-col items-end -mr-0.5">
            <div className="h-1 w-2.5 rounded-l-[0.5px] bg-[#15803D]" />
            <div className="h-1.5 w-4 rounded-l-[0.5px] bg-[#FACC15] border-y border-l border-[#CA8A04] -mt-0.5" />
            <div className="h-1 w-2 rounded-l-[0.5px] bg-[#16A34A] -mt-0.5" />
          </div>

          <div className="relative flex flex-col items-center">
            <div className="h-1 w-5 rounded-t-[0.5px] bg-[#4ADE80]" />
            <div className="h-3 w-5 bg-[#22C55E] border-x border-[#15803D] relative flex items-center justify-center">
              <span className="h-2 w-2 rounded-[0.2px] bg-[#86EFAC] border border-[#16A34A]" />
            </div>
            <div className="h-1 w-5 rounded-b-[0.5px] bg-[#15803D] flex justify-center gap-1">
              <span className="h-0.5 w-1 bg-[#475569] rounded-b-[0.2px]" />
              <span className="h-0.5 w-1 bg-[#475569] rounded-b-[0.2px]" />
            </div>
          </div>

          <div className="relative flex flex-col items-start -ml-0.5">
            <div className="h-1.5 w-2.5 rounded-t-[0.5px] border-t border-x border-[#15803D] bg-[#4ADE80] ml-0.5 flex">
              <span className="h-1 w-1 bg-[#FACC15] rounded-[0.2px]" />
            </div>
            <div className="relative h-3.5 w-3.5 rounded-[0.5px] border border-[#15803D] bg-[#16A34A] flex items-center justify-center">
              <div className="absolute top-0.5 right-0.5 h-2 w-2 rounded-[0.2px] bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center">
                <span className="relative h-1 w-1 rounded-[0.2px] bg-[#0F172A] flex items-start justify-end">
                  <span className="h-0.5 w-0.5 bg-white rounded-[0.1px]" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start -ml-0.5">
            <div className="relative h-2 w-2 rounded-tr-[0.5px] border-t border-r border-[#991B1B] bg-[#EA4335]" />
            <div className="h-1 w-1.5 rounded-br-[0.5px] border-b border-r border-[#B45309] bg-[#FBBC04]" />
          </div>
        </div>

        {/* Right Wing */}
        <div className="flex flex-col anim-voxel-wing-r origin-left">
          <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#CA8A04] bg-[#FACC15]" />
          <div className="h-1 w-4 border-x border-[#15803D] bg-[#22C55E]" />
          <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#14532D] bg-[#166534]" />
        </div>
      </div>
    )
  }

  // 4. COCKATIEL / GREY PARROT (Iconic yellow crest & orange blush)
  return (
    <div className={`relative flex items-center drop-shadow-md select-none ${isHit ? 'filter-red-flash' : ''}`}>
      {/* Left Wing with White Flash Bar */}
      <div className="flex flex-col anim-voxel-wing-l origin-right">
        <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#334155] bg-[#64748B]" />
        <div className="h-1 w-4 border-x border-[#CBD5E1] bg-[#F8FAFC]" />
        <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#0F172A] bg-[#1E293B]" />
      </div>

      {/* Tail + Body + Head + Beak */}
      <div className="relative flex items-center">
        <div className="flex flex-col items-end -mr-0.5">
          <div className="h-1 w-2.5 rounded-l-[0.5px] bg-[#475569]" />
          <div className="h-1.5 w-4 rounded-l-[0.5px] bg-[#FEF08A] border-y border-l border-[#CA8A04] -mt-0.5" />
          <div className="h-1 w-2 rounded-l-[0.5px] bg-[#334155] -mt-0.5" />
        </div>

        <div className="relative flex flex-col items-center">
          <div className="h-1 w-5 rounded-t-[0.5px] bg-[#64748B]" />
          <div className="h-3 w-5 bg-[#475569] border-x border-[#334155] relative flex items-center justify-center">
            <span className="h-2 w-2 rounded-[0.2px] bg-[#64748B] border border-[#475569]" />
          </div>
          <div className="h-1 w-5 rounded-b-[0.5px] bg-[#334155] flex justify-center gap-1">
            <span className="h-0.5 w-1 bg-[#1E293B] rounded-b-[0.2px]" />
            <span className="h-0.5 w-1 bg-[#1E293B] rounded-b-[0.2px]" />
          </div>
        </div>

        {/* Head with Tall Yellow Crest & Orange Cheek Blush */}
        <div className="relative flex flex-col items-start -ml-0.5">
          <div className="h-2 w-2.5 rounded-t-[0.5px] border-t border-x border-[#CA8A04] bg-[#FACC15] ml-0.5 flex">
            <span className="h-1.5 w-1 bg-[#FEF08A] rounded-[0.2px]" />
          </div>
          <div className="relative h-3.5 w-3.5 rounded-[0.5px] border border-[#CA8A04] bg-[#FEF08A] flex items-center justify-center">
            {/* Adorable Orange Cheek Blush */}
            <span className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-[0.5px] bg-[#EA580C] shadow-2xs" />
            <div className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-[0.2px] bg-[#0F172A] flex items-start justify-end">
              <span className="h-0.5 w-0.5 bg-white rounded-[0.1px]" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start -ml-0.5">
          <div className="relative h-2 w-2 rounded-tr-[0.5px] border-t border-r border-[#475569] bg-[#94A3B8]" />
          <div className="h-1 w-1.5 rounded-br-[0.5px] border-b border-r border-[#334155] bg-[#64748B]" />
        </div>
      </div>

      {/* Right Wing */}
      <div className="flex flex-col anim-voxel-wing-r origin-left">
        <div className="h-1.5 w-4 rounded-t-[0.5px] border border-[#334155] bg-[#64748B]" />
        <div className="h-1 w-4 border-x border-[#CBD5E1] bg-[#F8FAFC]" />
        <div className="h-1.5 w-4.5 rounded-b-[0.5px] border-b border-x border-[#0F172A] bg-[#1E293B]" />
      </div>
    </div>
  )
}

// ============================================================================
// DYNAMIC RANDOM BIRD DATA TYPES
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
}

export type SkyPhase = 'day' | 'sunset' | 'night' | 'sunrise'

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
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
  const [activeBirds, setActiveBirds] = useState<ActiveBird[]>([])
  const [treeRustleLeft, setTreeRustleLeft] = useState<boolean>(false)
  const [treeRustleRight, setTreeRustleRight] = useState<boolean>(false)
  const [flowerBounce, setFlowerBounce] = useState<Record<string, boolean>>({})
  const birdTimerRef = useRef<NodeJS.Timeout | null>(null)

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
        { species: 'scarlet', name: 'Scarlet Macaw' },
        { species: 'cyan', name: 'Cyan Parrot' },
        { species: 'emerald', name: 'Emerald Budgie' },
        { species: 'cockatiel', name: 'Grey Cockatiel' },
      ]
      const chosen = speciesPool[Math.floor(Math.random() * speciesPool.length)]
      const direction: 'ltr' | 'rtl' = Math.random() > 0.35 ? 'ltr' : 'rtl'
      const topPercent = Math.floor(5 + Math.random() * 26) // Altitude: 5% to 31%
      const durationSec = Math.floor(12 + Math.random() * 6) // Speed: 12s to 18s flight duration
      const scale = 0.88 + Math.random() * 0.22 // Depth variance

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
  // REALISTIC CELESTIAL CYCLE: SUNSET & SUNRISE WITH STAGED DELAY & SKY TRANSITION
  // ============================================================================

  // When Sun is clicked: Sun descends & sets, evening dusk settles, then Moon rises into starry night
  const handleSunClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isTransitioning || skyPhase !== 'day') return

      setIsTransitioning(true)
      setSkyPhase('sunset')
      voxelAudio.playDayNight(true) // descending sunset chime

      // Midpoint: at 1.2s, as Sun sinks below horizon, dark mode triggers and Moon starts rising
      setTimeout(() => {
        setSkyPhase('night')
        try {
          localStorage.setItem('minecraft_dark_mode', 'true')
          document.documentElement.classList.add('dark')
        } catch {}
      }, 1200)

      // Animation fully concludes at 2.6s
      setTimeout(() => {
        setIsTransitioning(false)
      }, 2600)
    },
    [isTransitioning, skyPhase]
  )

  // When Moon is clicked: Moon descends & sets, dawn breaks, then Sun rises into bright day
  const handleMoonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isTransitioning || skyPhase !== 'night') return

      setIsTransitioning(true)
      setSkyPhase('sunrise')
      voxelAudio.playDayNight(false) // ascending dawn chime

      // Midpoint: at 1.2s, as Moon sinks below horizon, daylight triggers and Sun starts rising
      setTimeout(() => {
        setSkyPhase('day')
        try {
          localStorage.setItem('minecraft_dark_mode', 'false')
          document.documentElement.classList.remove('dark')
        } catch {}
      }, 1200)

      // Animation fully concludes at 2.6s
      setTimeout(() => {
        setIsTransitioning(false)
      }, 2600)
    },
    [isTransitioning, skyPhase]
  )

  // Handle clicking a bird (Red damage blink, tumble, death poof, drops)
  const handleBirdClick = useCallback((id: string, name: string) => {
    setActiveBirds((prev) =>
      prev.map((b) => {
        if (b.id !== id || b.status !== 'flying') return b

        // 1. Play hit sound & flash red damage
        voxelAudio.playHurt()

        // 2. Schedule death poof and loot drop after damage tumble
        setTimeout(() => {
          voxelAudio.playPoof()
          voxelAudio.playXp()

          setActiveBirds((inner) =>
            inner.map((item) => (item.id === id ? { ...item, status: 'dead' } : item))
          )

          // 3. Remove dead bird after explosion finishes (1.4s)
          setTimeout(() => {
            setActiveBirds((inner) => inner.filter((item) => item.id !== id))
          }, 1400)
        }, 550)

        return { ...b, status: 'hit' }
      })
    )
  }, [])

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
  const isSunset = skyPhase === 'sunset'
  const isSunrise = skyPhase === 'sunrise'

  return (
    <div
      aria-label="Interactive Minecraft Backdrop"
      className="pointer-events-none absolute -inset-x-2 sm:-inset-x-5 -inset-y-3 sm:-inset-y-5 z-0 select-none overflow-hidden rounded-3xl transition-all duration-700"
    >
      {/* ======================================================== */}
      {/* 0. DYNAMIC SKY GRADIENT & ATMOSPHERE (DAY -> SUNSET -> NIGHT -> SUNRISE) */}
      {/* ======================================================== */}
      {/* 0A. DAY SKY LAYER */}
      <div
        className={`absolute inset-0 rounded-3xl border transition-opacity duration-1000 ${
          skyPhase === 'day' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        } bg-gradient-to-b from-[#7DD3FC]/50 via-[#BAE6FD]/30 to-[#F0FDF4]/20 border-[#7DD3FC]/40 shadow-[inset_0_0_60px_rgba(255,255,255,0.4)]`}
      />

      {/* 0B. SUNSET / GOLDEN HOUR SKY LAYER */}
      <div
        className={`absolute inset-0 rounded-3xl border transition-opacity duration-1000 ${
          skyPhase === 'sunset' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        } bg-gradient-to-b from-[#2E1065]/95 via-[#C026D3]/75 via-[#EA580C]/85 to-[#FDE047]/80 border-[#F97316]/70 shadow-[inset_0_0_90px_rgba(234,88,12,0.45)]`}
      />

      {/* 0C. DEEP STARRY NIGHT SKY LAYER */}
      <div
        className={`absolute inset-0 rounded-3xl border transition-opacity duration-1000 ${
          skyPhase === 'night' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        } bg-gradient-to-b from-[#020617]/95 via-[#0F172A]/90 to-[#1E1B4B]/70 border-[#38BDF8]/20 shadow-[inset_0_0_80px_rgba(15,23,42,0.8)]`}
      />

      {/* 0D. SUNRISE / DAWN SKY LAYER */}
      <div
        className={`absolute inset-0 rounded-3xl border transition-opacity duration-1000 ${
          skyPhase === 'sunrise' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        } bg-gradient-to-b from-[#1E1B4B]/85 via-[#BE185D]/65 via-[#FB923C]/75 to-[#FEF08A]/75 border-[#F43F5E]/50 shadow-[inset_0_0_90px_rgba(251,146,60,0.4)]`}
      />

      {/* HORIZON VOLUMETRIC ATMOSPHERIC GLOW STRIP */}
      <div
        className={`absolute bottom-0 inset-x-0 h-28 pointer-events-none transition-opacity duration-1000 rounded-b-3xl ${
          isSunset
            ? 'opacity-100 bg-gradient-to-t from-[#EA580C]/50 via-[#F97316]/25 to-transparent'
            : isSunrise
            ? 'opacity-100 bg-gradient-to-t from-[#FB923C]/40 via-[#F43F5E]/20 to-transparent'
            : 'opacity-0'
        }`}
      />

      {/* Twinkling Minecraft Pixel Night Stars */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isNight ? 'opacity-100' : 'opacity-0'
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
      {/* 1. REALISTIC CELESTIAL ORBIT: SUN & MOON (ARC DESCENT & ASCENT) */}
      {/* ======================================================== */}
      <div className="absolute top-2.5 right-4 sm:right-8 z-30 pointer-events-auto flex items-center justify-center">
        {/* THE SUN */}
        {(skyPhase === 'day' || skyPhase === 'sunset' || (skyPhase === 'sunrise' && isTransitioning)) && (
          <button
            type="button"
            disabled={isTransitioning}
            onClick={handleSunClick}
            aria-label="Sun"
            className={`group relative flex items-center justify-center p-1.5 focus:outline-none transition-transform duration-300 ${
              isTransitioning
                ? 'cursor-wait pointer-events-none'
                : 'cursor-pointer hover:scale-115 active:scale-95'
            } ${
              skyPhase === 'sunset'
                ? 'anim-voxel-sun-set'
                : skyPhase === 'sunrise'
                ? 'anim-voxel-sun-rise'
                : 'anim-voxel-sun'
            }`}
          >
            <div className="relative flex items-center justify-center">
              {/* Outer Golden/Sunset Corona */}
              <div
                className={`h-8 w-8 rounded-[1px] border-2 transition-colors duration-700 flex items-center justify-center ${
                  skyPhase === 'sunset'
                    ? 'border-[#EA580C] bg-[#F97316] shadow-[0_0_28px_rgba(234,88,12,0.85)]'
                    : 'border-[#FDE047] bg-[#FEF08A] shadow-[0_0_22px_rgba(253,224,71,0.7)]'
                }`}
              >
                {/* Mid Sun Slab */}
                <div
                  className={`h-5 w-5 rounded-[0.5px] flex items-center justify-center border transition-colors duration-700 ${
                    skyPhase === 'sunset'
                      ? 'bg-[#FFEDD5] border-[#EA580C]/70'
                      : 'bg-[#FFFBEB] border-[#FDE047]/60'
                  }`}
                >
                  {/* Radiant Pure White Core */}
                  <div className="h-3 w-3 bg-white rounded-[0.2px] shadow-[0_0_6px_#FFFFFF]" />
                </div>
              </div>

              {/* Pulsing Sun Rays */}
              <span
                className={`absolute -top-1 h-0.5 w-1.5 rounded-[0.2px] transition-colors duration-700 ${
                  skyPhase === 'sunset' ? 'bg-[#F97316]' : 'bg-[#FEF08A]'
                }`}
              />
              <span
                className={`absolute -bottom-1 h-0.5 w-1.5 rounded-[0.2px] transition-colors duration-700 ${
                  skyPhase === 'sunset' ? 'bg-[#F97316]' : 'bg-[#FEF08A]'
                }`}
              />
              <span
                className={`absolute -left-1 h-1.5 w-0.5 rounded-[0.2px] transition-colors duration-700 ${
                  skyPhase === 'sunset' ? 'bg-[#F97316]' : 'bg-[#FEF08A]'
                }`}
              />
              <span
                className={`absolute -right-1 h-1.5 w-0.5 rounded-[0.2px] transition-colors duration-700 ${
                  skyPhase === 'sunset' ? 'bg-[#F97316]' : 'bg-[#FEF08A]'
                }`}
              />
            </div>

            {/* Interactive Sun Tooltip Indicator */}
            {!isTransitioning && skyPhase === 'day' && (
              <span className="pointer-events-none absolute -bottom-6 right-0 whitespace-nowrap rounded-[2px] border border-[#1E293B] bg-black/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-md">
                ☀️ Click Sun to Set
              </span>
            )}
          </button>
        )}

        {/* THE MOON */}
        {(skyPhase === 'night' || (skyPhase === 'sunrise' && isTransitioning) || (skyPhase === 'sunset' && isTransitioning)) && (
          <button
            type="button"
            disabled={isTransitioning}
            onClick={handleMoonClick}
            aria-label="Moon"
            className={`group relative flex items-center justify-center p-1.5 focus:outline-none transition-transform duration-300 ${
              isTransitioning
                ? 'cursor-wait pointer-events-none'
                : 'cursor-pointer hover:scale-115 active:scale-95'
            } ${
              skyPhase === 'sunrise'
                ? 'anim-voxel-moon-set'
                : skyPhase === 'sunset'
                ? 'anim-voxel-moon-rise'
                : 'anim-voxel-moon'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className="h-8 w-8 rounded-[1px] border-2 border-[#CBD5E1] bg-[#F1F5F9] shadow-[0_0_20px_rgba(186,230,253,0.6)] relative overflow-hidden flex flex-col justify-between p-0.5">
                {/* Lunar Mare / Crater Spots */}
                <div className="flex justify-between">
                  <span className="h-1.5 w-2 bg-[#94A3B8]/80 rounded-[0.2px]" />
                  <span className="h-2 w-1.5 bg-[#64748B]/70 rounded-[0.2px]" />
                </div>
                <div className="flex justify-center">
                  <span className="h-2 w-2.5 bg-[#94A3B8]/90 rounded-[0.2px]" />
                </div>
                <div className="flex justify-end pr-1">
                  <span className="h-1.5 w-1.5 bg-[#64748B]/80 rounded-[0.2px]" />
                </div>
              </div>
            </div>

            {/* Interactive Moon Tooltip Indicator */}
            {!isTransitioning && skyPhase === 'night' && (
              <span className="pointer-events-none absolute -bottom-6 right-0 whitespace-nowrap rounded-[2px] border border-[#1E293B] bg-black/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-md">
                🌙 Click Moon to Rise Sun
              </span>
            )}
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. PROCEDURAL 3D VOLUMETRIC MINECRAFT CLOUDS             */}
      {/* ======================================================== */}
      {/* Cloud 1: High-Altitude Stepped 3D Voxel Cloud */}
      <div className="absolute top-2 left-0 anim-voxel-cloud-slow pointer-events-none">
        <div className="flex flex-col items-center">
          <div
            className={`h-2.5 w-20 rounded-t-[1px] border-t border-x transition-colors duration-1000 ${
              isNight
                ? 'border-[#475569] bg-[#64748B]/90'
                : isSunset
                ? 'border-[#EA580C] bg-[#FFEDD5]'
                : isSunrise
                ? 'border-[#FB923C] bg-[#FFF7ED]'
                : 'border-[#E2E8F0] bg-white'
            }`}
          />
          <div
            className={`h-4 w-36 border shadow-[0_2px_0_0_rgba(0,0,0,0.06)] transition-colors duration-1000 ${
              isNight
                ? 'border-[#334155] bg-[#475569]/90'
                : isSunset
                ? 'border-[#EA580C]/80 bg-[#FEF08A]/95'
                : isSunrise
                ? 'border-[#F43F5E]/70 bg-[#FFF1F2]/95'
                : 'border-[#CBD5E1] bg-white'
            }`}
          />
          <div
            className={`h-2 w-24 rounded-b-[1px] border-b border-x transition-colors duration-1000 ${
              isNight
                ? 'border-[#1E293B] bg-[#1E293B]/90'
                : isSunset
                ? 'border-[#C2410C] bg-[#FED7AA]'
                : isSunrise
                ? 'border-[#BE185D] bg-[#FCE7F3]'
                : 'border-[#94A3B8] bg-[#E2E8F0]'
            }`}
          />
        </div>
      </div>

      {/* Cloud 2: Mid-Altitude Trailing Stepped Cloud */}
      <div className="absolute top-12 left-0 anim-voxel-cloud-med pointer-events-none">
        <div className="flex flex-col items-center">
          <div
            className={`h-2 w-14 rounded-t-[1px] border-t border-x transition-colors duration-1000 ${
              isNight
                ? 'border-[#475569] bg-[#64748B]/80'
                : isSunset
                ? 'border-[#EA580C] bg-[#FFEDD5]'
                : 'border-[#E2E8F0] bg-white'
            }`}
          />
          <div
            className={`h-3 w-28 border transition-colors duration-1000 ${
              isNight
                ? 'border-[#334155] bg-[#475569]/80'
                : isSunset
                ? 'border-[#EA580C]/80 bg-[#FEF08A]/90'
                : 'border-[#CBD5E1] bg-white'
            }`}
          />
          <div
            className={`h-1.5 w-18 rounded-b-[1px] border-b border-x transition-colors duration-1000 ${
              isNight
                ? 'border-[#1E293B] bg-[#1E293B]/80'
                : isSunset
                ? 'border-[#C2410C] bg-[#FED7AA]'
                : 'border-[#94A3B8] bg-[#E2E8F0]'
            }`}
          />
        </div>
      </div>

      {/* Cloud 3: Foreground Crisp Cloud */}
      <div className="absolute top-22 left-0 anim-voxel-cloud-slow pointer-events-none [animation-delay:-24s]">
        <div className="flex flex-col items-center">
          <div
            className={`h-1.5 w-10 border-t border-x transition-colors duration-1000 ${
              isNight
                ? 'border-[#475569] bg-[#64748B]/70'
                : isSunset
                ? 'border-[#EA580C] bg-[#FFEDD5]'
                : 'border-[#E2E8F0] bg-white'
            }`}
          />
          <div
            className={`h-2.5 w-20 border transition-colors duration-1000 ${
              isNight
                ? 'border-[#334155] bg-[#475569]/70'
                : isSunset
                ? 'border-[#EA580C]/80 bg-[#FEF08A]/85'
                : 'border-[#CBD5E1] bg-white'
            }`}
          />
          <div
            className={`h-1 w-12 border-b border-x transition-colors duration-1000 ${
              isNight
                ? 'border-[#1E293B] bg-[#1E293B]/70'
                : 'border-[#94A3B8] bg-[#E2E8F0]'
            }`}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DYNAMIC RANDOM MINECRAFT BIRDS (RANDOM APPEARANCE)     */}
      {/* ======================================================== */}
      {activeBirds.map((bird) => {
        if (bird.status === 'dead') {
          // Render Smoke Poof Burst & Dropped Feather / XP Orb at hit position
          return (
            <div
              key={`${bird.id}-poof-${bird.hitKey}`}
              className="absolute pointer-events-none z-20 flex flex-col items-center"
              style={{
                top: `${bird.topPercent}%`,
                left: bird.direction === 'ltr' ? '45%' : '55%',
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

        const isHit = bird.status === 'hit'
        const animClass =
          bird.direction === 'ltr'
            ? 'anim-voxel-fly-dynamic-ltr'
            : 'anim-voxel-fly-dynamic-rtl'

        return (
          <div
            key={bird.id}
            onAnimationEnd={() => handleBirdAnimationEnd(bird.id)}
            className={`absolute ${animClass} z-20 pointer-events-auto`}
            style={{
              top: `${bird.topPercent}%`,
              animationDuration: `${bird.durationSec}s`,
              transform: `scale(${bird.scale})`,
            }}
          >
            <button
              type="button"
              onClick={() => handleBirdClick(bird.id, bird.name)}
              aria-label={bird.name}
              className={`group relative flex items-center p-2 focus:outline-none cursor-crosshair transition-transform select-none ${
                isHit
                  ? 'anim-voxel-damage anim-voxel-tumble pointer-events-none'
                  : 'hover:scale-125'
              }`}
            >
              {/* Hit Red Damage Overlay Tint */}
              {isHit && (
                <div className="absolute inset-0 bg-red-600/40 rounded-[2px] animate-ping pointer-events-none" />
              )}

              {/* High-Fidelity Minecraft Bird with Anatomical Details */}
              <DetailedMinecraftBird species={bird.species} isHit={isHit} />

              
            </button>
          </div>
        )
      })}

      {/* 5. STEPPED MINECRAFT TERRAIN: TREES, GRASS & MEADOWS     */}
      {/* ======================================================== */}
      <div className="absolute bottom-1 inset-x-2 sm:inset-x-5 flex items-end justify-between z-10">
        {/* ---------------------------------------------------- */}
        {/* LEFT FLANK: MAJESTIC MINECRAFT OAK GROVE + POPPY     */}
        {/* ---------------------------------------------------- */}
        <div className="flex items-end gap-1.5">
          {/* Detailed Minecraft 3D Oak Tree */}
          <div
            onClick={() => handleTreeClick('left')}
            aria-label="Oak Tree"
            className={`flex flex-col items-center mb-0.5 pointer-events-auto cursor-pointer group transition-transform hover:scale-105 active:scale-95 ${
              treeRustleLeft ? 'anim-voxel-leaf-shake' : ''
            }`}
          >
            {/* Multi-tier Leaf Block Canopy */}
            <div className="relative">
              {/* Top Leaf Dome */}
              <div
                className={`h-3 w-8 rounded-t-[1px] border border-[#14532D] shadow-[0_1px_0_0_#14532D] transition-colors duration-1000 ${
                  isNight ? 'bg-[#15803D]' : isSunset ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                } flex items-center justify-between px-1`}
              >
                <span className="h-1 w-1 bg-[#4ADE80] rounded-[0.2px]" />
                <span className="h-1 w-1 bg-[#166534] rounded-[0.2px]" />
              </div>
              {/* Mid Layer Leaf Blocks with Pixel Dapples */}
              <div
                className={`relative h-6 w-11 border border-[#14532D] shadow-[0_2px_0_0_#14532D] transition-colors duration-1000 ${
                  isNight ? 'bg-[#166534]' : 'bg-[#16A34A]'
                } p-0.5 flex flex-col justify-between`}
              >
                <div className="flex justify-between">
                  <span className="h-1.5 w-1.5 bg-[#4ADE80] rounded-[0.2px]" />
                  <span className="h-1.5 w-2 bg-[#15803D] rounded-[0.2px]" />
                </div>
                {/* Tiny Minecraft Red Apple */}
                <div className="flex justify-end pr-1">
                  <span className="h-1.5 w-1.5 bg-[#EA4335] rounded-[0.2px] border border-[#991B1B] shadow-2xs" />
                </div>
                <div className="flex justify-between">
                  <span className="h-1.5 w-2 bg-[#14532D] rounded-[0.2px]" />
                  <span className="h-1.5 w-1.5 bg-[#4ADE80] rounded-[0.2px]" />
                </div>
              </div>
            </div>

            {/* Textured Oak Wood Trunk */}
            <div className="h-5 w-3 rounded-[0.5px] border border-[#451A03] bg-[#78350F] flex flex-col justify-between py-0.5">
              <span className="h-0.5 w-full bg-[#92400E]" />
              <span className="h-0.5 w-full bg-[#451A03]" />
            </div>

            {/* Falling Leaf Particles on Click */}
            {treeRustleLeft && (
              <span className="absolute -top-1 left-2 h-1 w-1 bg-[#4ADE80] anim-voxel-leaf-fall" />
            )}
          </div>

          {/* Stepped Grass & Dirt Block Ridge */}
          <div className="flex items-end shadow-xs">
            {/* Block 1 */}
            <div className="flex flex-col items-center">
              {/* Top Grass Turf with Overhang Fringe */}
              <div
                className={`h-2.5 w-5 border-t border-x rounded-t-[1px] relative transition-colors duration-1000 ${
                  isNight
                    ? 'border-[#14532D] bg-[#16A34A]'
                    : isSunset
                    ? 'border-[#CA8A04] bg-[#65A30D]'
                    : 'border-[#15803D] bg-[#22C55E]'
                }`}
              >
                <span className="absolute -bottom-1 left-1 h-1 w-1 bg-[#22C55E] rounded-b-[0.2px]" />
              </div>
              <div className="h-3 w-5 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>

            {/* Block 2 (Elevated Center) */}
            <div className="flex flex-col items-center">
              <div
                className={`h-3.5 w-6 border-t border-x rounded-t-[1px] relative transition-colors duration-1000 ${
                  isNight
                    ? 'border-[#14532D] bg-[#16A34A]'
                    : isSunset
                    ? 'border-[#CA8A04] bg-[#65A30D]'
                    : 'border-[#15803D] bg-[#22C55E]'
                }`}
              >
                <span className="absolute -bottom-1 left-1.5 h-1 w-1.5 bg-[#22C55E] rounded-b-[0.2px]" />
                <span className="absolute -bottom-1.5 right-1 h-1.5 w-1 bg-[#22C55E] rounded-b-[0.2px]" />
              </div>
              <div className="h-5 w-6 border-b border-x border-[#451A03] bg-[#78350F] relative">
                {/* Iron / Coal Ore Specks in Dirt */}
                <span className="absolute top-1 left-1 h-1 w-1 bg-[#1F2937] rounded-[0.2px]" />
                <span className="absolute bottom-1 right-1.5 h-1 w-1 bg-[#94A3B8] rounded-[0.2px]" />
              </div>
            </div>

            {/* Block 3 */}
            <div className="flex flex-col items-center">
              <div
                className={`h-2.5 w-5 border-t border-x rounded-t-[1px] transition-colors duration-1000 ${
                  isNight
                    ? 'border-[#14532D] bg-[#16A34A]'
                    : isSunset
                    ? 'border-[#CA8A04] bg-[#65A30D]'
                    : 'border-[#15803D] bg-[#22C55E]'
                }`}
              />
              <div className="h-3 w-5 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
          </div>

          {/* Interactive Minecraft Red Poppy */}
          <div
            onClick={() => handleFlowerClick('poppy')}
            aria-label="Poppy"
            className={`flex flex-col items-center mb-1 pointer-events-auto cursor-pointer group origin-bottom anim-badge-sway ${
              flowerBounce['poppy'] ? 'anim-voxel-flower-bounce' : ''
            }`}
          >
            <div className="h-3 w-3 rounded-[0.5px] border border-[#991B1B] bg-[#EA4335] shadow-2xs flex items-center justify-center group-hover:scale-120 transition-transform">
              <span className="h-1 w-1 bg-[#450A0A] rounded-[0.2px]" />
            </div>
            <div className="h-3.5 w-0.5 bg-[#16A34A]" />
          </div>

          {/* Minecraft Red Spotted Mushroom (Amanita) */}
          <div
            onClick={() => handleFlowerClick('shroom')}
            aria-label="Mushroom"
            className="flex flex-col items-center mb-0.5 pointer-events-auto cursor-pointer group"
          >
            <div className="h-2 w-3 rounded-t-[1px] border border-[#991B1B] bg-[#DC2626] flex items-center justify-center gap-0.5">
              <span className="h-0.5 w-0.5 bg-white rounded-[0.2px]" />
              <span className="h-0.5 w-0.5 bg-white rounded-[0.2px]" />
            </div>
            <div className="h-2 w-1 bg-[#E2E8F0] border-x border-[#94A3B8]" />
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT FLANK: MINECRAFT BIRCH TREE + DANDELION + BLUE ORCHID */}
        {/* ---------------------------------------------------- */}
        <div className="flex items-end gap-1.5">
          {/* Minecraft Blue Orchid */}
          <div
            onClick={() => handleFlowerClick('orchid')}
            aria-label="Blue Orchid"
            className={`flex flex-col items-center mb-1 pointer-events-auto cursor-pointer group origin-bottom anim-badge-sway ${
              flowerBounce['orchid'] ? 'anim-voxel-flower-bounce' : ''
            }`}
          >
            <div className="h-2.5 w-2.5 rounded-[0.5px] border border-[#0284C7] bg-[#38BDF8] flex items-center justify-center">
              <span className="h-1 w-1 bg-white rounded-[0.2px]" />
            </div>
            <div className="h-3.5 w-0.5 bg-[#16A34A]" />
          </div>

          {/* Interactive Minecraft Yellow Dandelion */}
          <div
            onClick={() => handleFlowerClick('dandelion')}
            aria-label="Dandelion"
            className={`flex flex-col items-center mb-1 pointer-events-auto cursor-pointer group origin-bottom anim-badge-sway ${
              flowerBounce['dandelion'] ? 'anim-voxel-flower-bounce' : ''
            }`}
          >
            <div className="h-2.5 w-2.5 rounded-[0.5px] border border-[#B45309] bg-[#FBBC04] shadow-2xs group-hover:scale-120 transition-transform" />
            <div className="h-3 w-0.5 bg-[#16A34A]" />
          </div>

          {/* Stepped Grass Blocks */}
          <div className="flex items-end shadow-xs">
            <div className="flex flex-col items-center">
              <div
                className={`h-2.5 w-5 border-t border-x rounded-t-[1px] relative transition-colors duration-1000 ${
                  isNight
                    ? 'border-[#14532D] bg-[#16A34A]'
                    : isSunset
                    ? 'border-[#CA8A04] bg-[#65A30D]'
                    : 'border-[#15803D] bg-[#22C55E]'
                }`}
              >
                <span className="absolute -bottom-1 right-1 h-1 w-1 bg-[#22C55E] rounded-b-[0.2px]" />
              </div>
              <div className="h-3 w-5 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
            <div className="flex flex-col items-center">
              <div
                className={`h-3.5 w-6 border-t border-x rounded-t-[1px] relative transition-colors duration-1000 ${
                  isNight
                    ? 'border-[#14532D] bg-[#16A34A]'
                    : isSunset
                    ? 'border-[#CA8A04] bg-[#65A30D]'
                    : 'border-[#15803D] bg-[#22C55E]'
                }`}
              >
                <span className="absolute -bottom-1 left-1.5 h-1 w-1.5 bg-[#22C55E] rounded-b-[0.2px]" />
              </div>
              <div className="h-4.5 w-6 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
          </div>

          {/* Minecraft Birch Tree */}
          <div
            onClick={() => handleTreeClick('right')}
            aria-label="Birch Tree"
            className={`flex flex-col items-center mb-0.5 pointer-events-auto cursor-pointer group transition-transform hover:scale-105 active:scale-95 ${
              treeRustleRight ? 'anim-voxel-leaf-shake' : ''
            }`}
          >
            {/* Birch Foliage Canopy */}
            <div className="relative">
              <div
                className={`h-2.5 w-7 rounded-t-[1px] border border-[#14532D] transition-colors duration-1000 ${
                  isNight ? 'bg-[#15803D]' : isSunset ? 'bg-[#16A34A]' : 'bg-[#4ADE80]'
                }`}
              />
              <div
                className={`h-5 w-9 border border-[#14532D] transition-colors duration-1000 ${
                  isNight ? 'bg-[#166534]' : isSunset ? 'bg-[#15803D]' : 'bg-[#22C55E]'
                } p-0.5 flex justify-between`}
              >
                <span className="h-1.5 w-1.5 bg-[#86EFAC] rounded-[0.2px]" />
                <span className="h-1.5 w-1.5 bg-[#15803D] rounded-[0.2px]" />
              </div>
            </div>

            {/* Characteristic Birch White Trunk with Dark Clefts */}
            <div className="h-4.5 w-2.5 rounded-[0.5px] border border-[#94A3B8] bg-[#F8FAFC] flex flex-col justify-between py-0.5">
              <span className="h-0.5 w-1.5 bg-[#1E293B]" />
              <span className="h-0.5 w-2 bg-[#0F172A] self-end" />
            </div>

            {treeRustleRight && (
              <span className="absolute -top-1 right-2 h-1 w-1 bg-[#86EFAC] anim-voxel-leaf-fall" />
            )}
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
