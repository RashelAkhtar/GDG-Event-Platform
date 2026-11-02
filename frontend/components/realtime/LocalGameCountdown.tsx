'use client'

import React, { useEffect, useState } from 'react'
import { soundManager } from '@/lib/sound'
import confetti from 'canvas-confetti'

const CELEBRATION_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#8B5CF6', '#EC4899']
const VIBRANT_COUNTDOWN_COLORS = ['#2563EB', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B']

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
              particleCount: 80,
              spread: 80,
              origin: { y: 0.5 },
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

  const colorIndex = Math.max(0, count) % VIBRANT_COUNTDOWN_COLORS.length
  const currentColor = VIBRANT_COUNTDOWN_COLORS[colorIndex]

  return (
    <div
      onClick={handleInteractiveUnlock}
      onTouchStart={handleInteractiveUnlock}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl transition-all animate-in fade-in duration-300 cursor-pointer"
    >
      {/* Background Multi-color Aurora Mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl transition-colors duration-700 animate-aurora"
          style={{ backgroundColor: currentColor }}
        />
      </div>

      {/* GDG Event Title Badge */}
      <div className="relative z-10 mb-8 flex items-center gap-2 border border-[#DADCE0] bg-white px-5 py-2 shadow-xs backdrop-blur-md">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 bg-[#EA4335] animate-pulse" />
          <span className="h-2 w-2 bg-[#FBBC04]" />
          <span className="h-2 w-2 bg-[#34A853]" />
          <span className="h-2 w-2 bg-[#4285F4]" />
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#3C4043]">
          STARTING ARENA • {gameTitle}
        </span>
      </div>

      {/* Giant Animated Countdown Number with Concentric Square Radar Waves */}
      <div className="relative z-10 flex h-64 w-64 items-center justify-center">
        <div
          className="absolute inset-0 border-2 animate-ripple-1 pointer-events-none"
          style={{ borderColor: currentColor }}
        />
        <div
          className="absolute inset-0 border-2 animate-ripple-2 pointer-events-none"
          style={{ borderColor: currentColor }}
        />
        <div
          className="absolute inset-0 border-2 animate-ripple-3 pointer-events-none"
          style={{ borderColor: currentColor }}
        />

        <div
          className="relative flex h-48 w-48 items-center justify-center border-4 bg-white shadow-2xl transition-all duration-300 ring-4 ring-black/5"
          style={{ borderColor: currentColor, boxShadow: `0 16px 40px -10px ${currentColor}44` }}
        >
          {count > 0 ? (
            <span
              key={count}
              className="font-mono text-8xl sm:text-9xl font-black tracking-tighter select-none animate-count-pop drop-shadow-sm"
              style={{ color: currentColor }}
            >
              {count}
            </span>
          ) : (
            <span className="font-mono text-6xl sm:text-7xl font-black tracking-tight text-[#1E8E3E] select-none animate-count-pop">
              GO!
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-8 text-center flex flex-col items-center">
        <p className="font-mono text-base font-extrabold uppercase tracking-wider text-[#202124]">GET READY</p>
        <p className="text-xs text-[#5F6368] mt-1 font-medium">
          Challenge begins when the countdown reaches GO
        </p>

        {/* Mobile Sound Assist Pill */}
        <div className="mt-4 inline-flex items-center gap-1.5 border border-[#DADCE0] bg-white px-3 py-1 font-mono text-[11px] font-semibold text-[#5F6368] shadow-2xs">
          <span>{audioUnlocked ? '🔊 GAME AUDIO ACTIVE' : '🔊 TAP SCREEN TO ENABLE AUDIO'}</span>
        </div>
      </div>
    </div>
  )
}
