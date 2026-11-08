'use client'

import React, { useEffect, useState } from 'react'
import { soundManager } from '@/lib/sound'
import confetti from 'canvas-confetti'
import { Sparkles, Zap, Volume2 } from 'lucide-react'

// Curated Google 4-color palette + archival gold and carbon (Zero purple)
const CELEBRATION_COLORS = ['#1A73E8', '#EA4335', '#FBBC04', '#34A853', '#D4AF37', '#111827', '#FFFFFF']
const GOOGLE_STAGE_COLORS = ['#1A73E8', '#EA4335', '#FBBC04', '#34A853']

export function LocalGameCountdown({
  gameTitle,
  onComplete,
}: {
  gameTitle: string
  onComplete: () => void
}) {
  const [count, setCount] = useState(5)
  const [audioUnlocked, setAudioUnlocked] = useState(soundManager.isAudioUnlocked())

  useEffect(() => {
    const unsub = soundManager.subscribe((unlocked) => {
      setAudioUnlocked(unlocked)
    })
    return () => unsub()
  }, [])

  const handleInteractiveUnlock = () => {
    void soundManager.unlock().then(() => {
      setAudioUnlocked(true)
    })
  }

  useEffect(() => {
    try {
      soundManager.playCountdownTick(5)
    } catch {}

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          try {
            soundManager.playWinner()
            confetti({
              particleCount: 90,
              spread: 85,
              origin: { y: 0.52 },
              colors: CELEBRATION_COLORS,
            })
          } catch {}
          setTimeout(() => {
            onComplete()
          }, 700)
          return 0
        }
        const next = prev - 1
        try {
          soundManager.playCountdownTick(next)
        } catch {}
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onComplete])

  const stageColor = GOOGLE_STAGE_COLORS[Math.max(0, count - 1) % GOOGLE_STAGE_COLORS.length]

  return (
    <div
      onClick={handleInteractiveUnlock}
      onTouchStart={handleInteractiveUnlock}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-8 bg-[#FBFBF9]/96 backdrop-blur-3xl text-[#111827] select-none transition-all cursor-pointer"
    >
      {/* Pristine Light Canvas Atmosphere & Architectural Hairline Grid */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Soft Pearlescent Google 4-Color Ambient Refractions (Zero purple) */}
        <div className="absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-[#1A73E8]/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-[#FBBC04]/14 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/3 h-[460px] w-[460px] rounded-full bg-[#34A853]/12 blur-[130px]" />

        {/* Minimal Architectural Grid Structure */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      {/* Top Technical Masthead */}
      <div className="relative z-10 pt-2 flex items-center justify-center">
        <div className="flex items-center gap-2.5 rounded-full border border-[#E5E7EB] bg-white px-5 py-2 shadow-xs">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#1A73E8]" />
            <span className="h-2 w-2 rounded-full bg-[#EA4335]" />
            <span className="h-2 w-2 rounded-full bg-[#FBBC04]" />
            <span className="h-2 w-2 rounded-full bg-[#34A853]" />
          </span>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#111827]">
            COMMENCING ARENA // {gameTitle}
          </span>
        </div>
      </div>

      {/* Centerpiece Monolithic Ticker Box with Spring Physics */}
      <div className="relative z-10 my-auto flex flex-col items-center text-center">
        {/* Orbiting Rotating Dashed Ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-8 rounded-full border border-dashed border-[#111827]/25 anim-stamp-orbit pointer-events-none" />

          {/* High-Contrast Architectural Box */}
          <div className="relative flex h-52 w-52 sm:h-64 sm:w-64 flex-col items-center justify-center rounded-3xl border-2 border-[#111827] bg-white shadow-[10px_10px_0px_#111827]">
            {/* Corner Registration Tags */}
            <span className="absolute top-2.5 left-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">SYS.01</span>
            <span className="absolute top-2.5 right-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">CHRONO</span>
            <span className="absolute bottom-2.5 left-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">LIVE</span>
            <span className="absolute bottom-2.5 right-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">PRECISION</span>

            {count > 0 ? (
              <div className="flex flex-col items-center justify-center">
                <span
                  key={count}
                  className="font-mono text-8xl sm:text-9xl font-black text-[#111827] select-none anim-ticker-pop tracking-tighter"
                >
                  0{count}
                </span>
                <span
                  className="mt-1 h-2 w-2 rounded-full transition-colors duration-300"
                  style={{ backgroundColor: stageColor }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center anim-sheet-unfold">
                <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-[#15803D] select-none">
                  GO!
                </span>
                <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#15803D] font-bold">
                  ARENA LIVE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Playful Instruction Pill */}
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 shadow-2xs">
          <Zap className="h-3.5 w-3.5 text-[#FBBC04] fill-[#FBBC04]" />
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-[#4B5563]">
            {count > 0 ? 'Calibrating precision benchmark...' : 'Arena engaged! Good luck!'}
          </span>
        </div>
      </div>

      {/* Footer Technical Stamp */}
      <div className="relative z-10 pb-2 flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">
          <Volume2 className="h-3 w-3 text-[#9CA3AF]" />
          <span>{audioUnlocked ? 'Multiplayer Audio Synced' : 'Tap Screen to Enable Sound FX'}</span>
        </div>
      </div>
    </div>
  )
}
