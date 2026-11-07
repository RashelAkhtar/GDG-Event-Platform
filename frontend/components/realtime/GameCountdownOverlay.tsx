'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { soundManager } from '@/lib/sound'
import { Rocket, Sparkles, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'

const CELEBRATION_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#8B5CF6', '#EC4899'];
const VIBRANT_COUNTDOWN_COLORS = ['#2563EB', '#EC4899', '#8B5CF6', '#10B981'];

export function GameCountdownOverlay() {
  const { activeCountdown } = useWebSocket()
  const router = useRouter()

  useEffect(() => {
    if (activeCountdown) {
      if (activeCountdown.count > 0) {
        soundManager.playCountdownTick(activeCountdown.count)
      } else if (activeCountdown.count === 0) {
        soundManager.playWinner()
        try {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.5 },
            colors: CELEBRATION_COLORS,
          })
        } catch {}

        // Route to game after brief GO flash
        const timeout = setTimeout(() => {
          router.push(`/events/${activeCountdown.gameSlug}`)
        }, 750)

        return () => clearTimeout(timeout)
      }
    }
  }, [activeCountdown, router])

  if (!activeCountdown) return null

  const { count, gameSlug } = activeCountdown
  const colorIndex = Math.max(0, count) % VIBRANT_COUNTDOWN_COLORS.length
  const currentColor = VIBRANT_COUNTDOWN_COLORS[colorIndex]

  return (
    <div
      onClick={() => void soundManager.unlock()}
      onTouchStart={() => void soundManager.unlock()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-2xl transition-all cursor-pointer"
    >
      {/* GDG Event Title Badge */}
      <div className="relative z-10 mb-8 flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 py-2 shadow-xs">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[#EA4335]" />
          <span className="h-2 w-2 rounded-full bg-[#FBBC04]" />
          <span className="h-2 w-2 rounded-full bg-[#34A853]" />
          <span className="h-2 w-2 rounded-full bg-[#1A73E8]" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#111827]">
          Starting Track • {gameSlug.includes('mentis') ? 'Mentis' : gameSlug.includes('wend') ? 'Wend Arena' : 'Web Dev'}
        </span>
      </div>

      {/* Giant Animated Countdown Number with Concentric Radar Waves */}
      <div className="relative z-10 flex h-64 w-64 items-center justify-center">
        {/* Radar concentric waves */}
        <div
          className="absolute inset-0 rounded-full border-2 animate-ripple-1 pointer-events-none"
          style={{ borderColor: currentColor }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 animate-ripple-2 pointer-events-none"
          style={{ borderColor: currentColor }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 animate-ripple-3 pointer-events-none"
          style={{ borderColor: currentColor }}
        />

        {/* Central glowing orb */}
        <div
          className="relative flex h-48 w-48 items-center justify-center rounded-full border-[5px] bg-white shadow-2xl transition-all duration-300 ring-8 ring-white/60"
          style={{ borderColor: currentColor, boxShadow: `0 20px 50px -10px ${currentColor}55` }}
        >
          {count > 0 ? (
            <span
              key={count}
              className="text-8xl sm:text-9xl font-black tracking-tighter select-none animate-count-pop drop-shadow-sm"
              style={{ color: currentColor }}
            >
              {count}
            </span>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 animate-count-pop">
              <Rocket className="h-12 w-12 text-[#34A853] animate-bounce" />
              <span className="text-4xl sm:text-5xl font-black tracking-wider text-[#137333] uppercase">
                GO!
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="relative z-10 mt-8 text-sm font-semibold tracking-wide text-[#5F6368] animate-pulse flex items-center gap-1.5">
        {count > 0 ? (
          <>
            <Zap className="h-4 w-4 text-[#FBBC04]" />
            <span>Get ready to answer fast!</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-[#34A853]" />
            <span>Launching challenge arena now...</span>
          </>
        )}
      </p>
    </div>
  )
}
