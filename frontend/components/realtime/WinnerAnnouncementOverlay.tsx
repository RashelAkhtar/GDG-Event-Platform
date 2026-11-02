'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { soundManager } from '@/lib/sound'
import { Trophy, Crown, Medal, Award, Sparkles, X, Clock, RotateCcw, Zap, Home } from 'lucide-react'
import confetti from 'canvas-confetti'

const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853']

type CeremonyStep =
  | 'COUNTDOWN_3RD'
  | 'REVEAL_3RD'
  | 'COUNTDOWN_2ND'
  | 'REVEAL_2ND'
  | 'COUNTDOWN_1ST'
  | 'REVEAL_1ST'
  | 'SHOWCASE_ALL'

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

export function WinnerAnnouncementOverlay() {
  const router = useRouter()
  const { activeCeremony, closeCeremony } = useWebSocket()
  const [step, setStep] = useState<CeremonyStep>('COUNTDOWN_3RD')
  const [countdown, setCountdown] = useState<number>(5)
  const [revealedItemsCount, setRevealedItemsCount] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const winners = activeCeremony?.winners || []
  const first = winners.find((w) => w.rank === 1)
  const second = winners.find((w) => w.rank === 2)
  const third = winners.find((w) => w.rank === 3)
  const fullLeaderboard = activeCeremony?.fullLeaderboard || []

  // Fire confetti bursts
  const fireBurst = (colors = GOOGLE_COLORS, particleCount = 80) => {
    try {
      confetti({
        particleCount,
        spread: 80,
        origin: { y: 0.55 },
        colors,
      })
    } catch {}
  }

  // Sequence controller: Dynamic adaptive stages (3rd -> 2nd -> 1st) with crisp SFX
  useEffect(() => {
    if (!activeCeremony) return

    const hasThird = Boolean(third)
    const hasSecond = Boolean(second)
    const startStep: CeremonyStep = hasThird
      ? 'COUNTDOWN_3RD'
      : hasSecond
      ? 'COUNTDOWN_2ND'
      : 'COUNTDOWN_1ST'

    const initTimer = setTimeout(() => {
      setStep(startStep)
      setCountdown(5)
      setRevealedItemsCount(0)
      soundManager.playCountdownTick(5)
    }, 0)

    const runCountdownStage = (
      targetStep: 'COUNTDOWN_3RD' | 'COUNTDOWN_2ND' | 'COUNTDOWN_1ST',
      onComplete: () => void
    ) => {
      setStep(targetStep)
      setCountdown(5)
      let c = 5
      soundManager.playCountdownTick(c)

      intervalRef.current = setInterval(() => {
        c -= 1
        if (c >= 1) {
          setCountdown(c)
          soundManager.playCountdownTick(c)
        } else {
          clearInterval(intervalRef.current!)
          onComplete()
        }
      }, 1000)
    }

    const runGrand1st = () => {
      runCountdownStage('COUNTDOWN_1ST', () => {
        setStep('REVEAL_1ST')
        soundManager.playWinner()
        fireBurst(GOOGLE_COLORS, 140)
        setTimeout(() => fireBurst(['#FBBC04', '#FFD700', '#FFA000'], 100), 500)

        setTimeout(() => {
          setStep('SHOWCASE_ALL')
          fireBurst(GOOGLE_COLORS, 70)
        }, 5000)
      })
    }

    const runSilver2nd = () => {
      runCountdownStage('COUNTDOWN_2ND', () => {
        setStep('REVEAL_2ND')
        soundManager.playWinner()
        fireBurst(['#9AA0A6', '#BDC1C6', '#FFFFFF', '#4285F4'], 80)

        setTimeout(() => {
          runGrand1st()
        }, 4000)
      })
    }

    const runBronze3rd = () => {
      runCountdownStage('COUNTDOWN_3RD', () => {
        setStep('REVEAL_3RD')
        soundManager.playWinner()
        fireBurst(['#E37400', '#FF8F00', '#FFE082'], 60)

        setTimeout(() => {
          if (hasSecond) {
            runSilver2nd()
          } else {
            runGrand1st()
          }
        }, 4000)
      })
    }

    if (hasThird) {
      runBronze3rd()
    } else if (hasSecond) {
      runSilver2nd()
    } else {
      runGrand1st()
    }

    return () => {
      clearTimeout(initTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeCeremony, third, second])

  // Staggered reveal of ranklist rows in SHOWCASE_ALL stage
  useEffect(() => {
    if (step === 'SHOWCASE_ALL' && fullLeaderboard.length > 0) {
      const stagger = setInterval(() => {
        setRevealedItemsCount((prev) => {
          if (prev < fullLeaderboard.length) return prev + 1
          clearInterval(stagger)
          return prev
        })
      }, 150)
      return () => clearInterval(stagger)
    }
  }, [step, fullLeaderboard.length])

  if (!activeCeremony) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto bg-[#F8F9FA]/95 p-4 sm:p-6 backdrop-blur-xl">
      {/* Dynamic Ambient Aurora Glow in Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#4285F4]/15 blur-3xl animate-aurora" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-[#FBBC04]/20 blur-3xl animate-aurora" style={{ animationDelay: '-4s' }} />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#34A853]/15 blur-3xl animate-aurora" style={{ animationDelay: '-8s' }} />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex w-full max-w-xl items-center justify-between pt-2">
        <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-1.5 shadow-xs backdrop-blur-md">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#EA4335] animate-ping" />
            <span className="h-2 w-2 rounded-full bg-[#FBBC04]" />
            <span className="h-2 w-2 rounded-full bg-[#34A853]" />
            <span className="h-2 w-2 rounded-full bg-[#4285F4]" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3C4043]">
            {activeCeremony.gameTitle} • Grand Ceremony
          </span>
        </div>

        <button
          onClick={closeCeremony}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DADCE0] bg-white/80 text-[#5F6368] shadow-xs backdrop-blur-md hover:bg-white hover:text-[#202124] active:scale-95 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* --- STAGE 1: COUNTDOWN FOR 3RD PRIZE --- */}
      {step === 'COUNTDOWN_3RD' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#EA580C]/40 bg-gradient-to-r from-[#FFEDD5] to-[#FED7AA] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#C2410C] shadow-xs backdrop-blur-md animate-float">
            <Medal className="h-4 w-4 text-[#EA580C]" />
            <span>Bronze Medal • 3rd Prize Reveal</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
            Announcing 3rd Place In
          </h2>

          {/* Animated Concentric Radar Wave Container */}
          <div className="relative my-8 flex h-48 w-48 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#EA580C]/60 shadow-[0_0_20px_rgba(234,88,12,0.4)] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-[#F97316]/50 shadow-[0_0_25px_rgba(249,115,22,0.3)] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-[#FB923C]/40 shadow-[0_0_30px_rgba(251,146,60,0.2)] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[3px] border-[#EA580C]/50 bg-white/95 shadow-2xl ring-8 ring-[#EA580C]/15 backdrop-blur-md">
              <span
                key={countdown}
                className="text-7xl font-black bg-gradient-to-br from-[#EA580C] to-[#C2410C] bg-clip-text text-transparent select-none animate-count-pop drop-shadow-sm"
              >
                {countdown}
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#64748B]">Hold your breath for the bronze podium place...</p>
        </div>
      )}

      {/* --- STAGE 2: 3RD PRIZE WINNER REVEAL --- */}
      {step === 'REVEAL_3RD' && third && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-[32px] p-8 text-center card-bronze animate-in zoom-in-90 duration-500">
          {/* Top Banner - Non-wrapping */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#EA580C] to-[#F97316] px-5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg ring-2 ring-white/80 animate-float">
            <Medal className="h-4 w-4 text-white" />
            <span>3rd Prize Winner</span>
          </div>

          <div className="relative mt-2 mb-4 flex flex-col items-center">
            <div className="relative">
              <div className="relative p-1 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#FB923C] shadow-xl">
                <img
                  src={third.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                  alt={third.name}
                  className="h-28 w-28 rounded-full bg-white object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#EA580C] to-[#C2410C] text-sm font-black text-white shadow-md ring-2 ring-white">
                3
              </span>
            </div>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">{third.name}</h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EA580C]/15 border border-[#EA580C]/35 px-3.5 py-1 text-xs font-black text-[#9A3412] shadow-xs">
              <Award className="h-3.5 w-3.5 text-[#EA580C]" />
              <span>{third.score} pts</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
              <Clock className="h-3 w-3 text-emerald-600" />
              <span>{formatDuration(third.durationMs)}</span>
            </span>
            {third.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-900 shadow-xs">
                <Zap className="h-2.5 w-2.5 text-amber-600" />
                <span>Tie-Break by Speed</span>
              </span>
            )}
          </div>
          <p className="mt-6 text-xs font-medium text-[#64748B] animate-pulse">
            Next: 2nd Prize Silver Countdown...
          </p>
        </div>
      )}

      {/* --- STAGE 3: COUNTDOWN FOR 2ND PRIZE --- */}
      {step === 'COUNTDOWN_2ND' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-sky-400/40 bg-gradient-to-r from-sky-50 to-indigo-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-sky-800 shadow-xs backdrop-blur-md animate-float">
            <Medal className="h-4 w-4 text-sky-600" />
            <span>Silver Medal • 2nd Prize Reveal</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
            Announcing 2nd Place In
          </h2>

          {/* Animated Concentric Radar Wave Container */}
          <div className="relative my-8 flex h-48 w-48 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-sky-500/60 shadow-[0_0_20px_rgba(14,165,233,0.4)] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.3)] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-slate-400/40 shadow-[0_0_30px_rgba(148,163,184,0.2)] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[3px] border-sky-500/50 bg-white/95 shadow-2xl ring-8 ring-sky-500/15 backdrop-blur-md">
              <span
                key={countdown}
                className="text-7xl font-black bg-gradient-to-br from-sky-600 via-indigo-600 to-slate-700 bg-clip-text text-transparent select-none animate-count-pop drop-shadow-sm"
              >
                {countdown}
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#64748B]">Stepping up to the silver podium spot...</p>
        </div>
      )}

      {/* --- STAGE 4: 2ND PRIZE WINNER REVEAL --- */}
      {step === 'REVEAL_2ND' && second && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-[32px] p-8 text-center card-runnerup-silver animate-in zoom-in-90 duration-500">
          {/* Top Banner - Non-wrapping */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#64748B] via-[#0284C7] to-[#4F46E5] px-5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg ring-2 ring-white/80 animate-float">
            <Medal className="h-4 w-4 text-white" />
            <span>2nd Prize Winner</span>
          </div>

          <div className="relative mt-2 mb-4 flex flex-col items-center">
            <div className="relative">
              <div className="relative p-1 rounded-full bg-gradient-to-tr from-sky-400 via-slate-300 to-indigo-500 shadow-xl">
                <img
                  src={second.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                  alt={second.name}
                  className="h-28 w-28 rounded-full bg-white object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 text-sm font-black text-white shadow-md ring-2 ring-white">
                2
              </span>
            </div>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">{second.name}</h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/35 px-3.5 py-1 text-xs font-black text-sky-900 shadow-xs">
              <Award className="h-3.5 w-3.5 text-sky-600" />
              <span>{second.score} pts</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
              <Clock className="h-3 w-3 text-emerald-600" />
              <span>{formatDuration(second.durationMs)}</span>
            </span>
            {second.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-900 shadow-xs">
                <Zap className="h-2.5 w-2.5 text-amber-600" />
                <span>Tie-Break by Speed</span>
              </span>
            )}
          </div>
          <p className="mt-6 text-xs font-medium text-[#64748B] animate-pulse">
            Brace yourself for the 1st Place Grand Champion...
          </p>
        </div>
      )}

      {/* --- STAGE 5: COUNTDOWN FOR 1ST PRIZE (GRAND FINALE - AESTHETIC VIBRANT GRADIENT) --- */}
      {step === 'COUNTDOWN_1ST' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-purple-500/30 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-5 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_25px_rgba(124,58,237,0.4)] ring-2 ring-white/60 animate-float">
            <Crown className="h-4 w-4 text-amber-300 fill-amber-300" />
            <span>Grand Champion • 1st Prize Reveal</span>
            <Sparkles className="h-3.5 w-3.5 text-pink-200 animate-spin" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0F172A]">
            Who Takes First Place?
          </h2>

          {/* Cosmic Electric Concentric Radar Wave Container (No Yellow!) */}
          <div className="relative my-8 flex h-52 w-52 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.5)] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-pink-500/40 shadow-[0_0_35px_rgba(236,72,153,0.3)] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[3px] border-purple-500/40 bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 shadow-[0_25px_60px_-10px_rgba(124,58,237,0.45),0_0_40px_rgba(236,72,153,0.3)] ring-12 ring-purple-500/15 backdrop-blur-xl">
              <span
                key={countdown}
                className="text-8xl sm:text-9xl font-black tracking-tighter select-none animate-count-pop bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(124,58,237,0.35)]"
              >
                {countdown}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-indigo-50/90 border border-indigo-200/80 px-4 py-1.5 text-xs font-bold text-indigo-900 shadow-xs backdrop-blur-md animate-pulse">
            <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
            <span>The ultimate victor is crowned!</span>
          </div>
        </div>
      )}

      {/* --- STAGE 6: 1ST PRIZE GRAND CHAMPION REVEAL (AESTHETIC & SEXY) --- */}
      {step === 'REVEAL_1ST' && first && (
        <div className="relative z-10 my-auto flex w-full max-w-md flex-col items-center rounded-[36px] p-8 sm:p-9 text-center card-champion-gold animate-in zoom-in-90 duration-700">
          {/* Rotating Radiant Halo in Background */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-gradient-to-tr from-[#F59E0B]/35 via-[#EC4899]/30 to-[#6366F1]/35 blur-3xl animate-halo-spin" />

          {/* Radiant Crown Banner - Centered, Non-wrapping, Glowing */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#F59E0B] via-[#EC4899] to-[#8B5CF6] px-6 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_12px_28px_rgba(236,72,153,0.45)] ring-2 ring-white/80 animate-float">
            <Crown className="h-4 w-4 text-amber-200 fill-amber-200" />
            <span>1ST PLACE • GRAND CHAMPION</span>
            <Sparkles className="h-3.5 w-3.5 text-pink-200 animate-spin" />
          </div>

          <div className="relative mt-4 mb-5 flex flex-col items-center">
            <div className="relative">
              {/* Ambient pulsating glow aura behind avatar */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 opacity-70 blur-md animate-pulse" />

              {/* Luxury Multi-Color Iridescent Avatar Frame */}
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 shadow-2xl">
                <img
                  src={first.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                  alt={first.name}
                  className="h-32 w-32 sm:h-36 sm:w-36 rounded-full bg-white object-cover shadow-inner"
                />
              </div>

              {/* Floating 3D Gold Crown Badge */}
              <span className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-white shadow-[0_6px_16px_rgba(217,119,6,0.6)] ring-3 ring-white animate-bounce">
                <Crown className="h-6 w-6 text-white fill-white drop-shadow-sm" />
              </span>
            </div>
          </div>

          <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A] drop-shadow-xs">
            {first.name}
          </h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border border-amber-500/40 px-4 py-1.5 text-xs font-black text-amber-950 shadow-xs backdrop-blur-md">
              <Crown className="h-4 w-4 text-amber-600 fill-amber-600" />
              <span>{first.score} pts</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/35 px-4 py-1.5 text-xs font-bold text-emerald-950 shadow-xs backdrop-blur-md">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>{formatDuration(first.durationMs)}</span>
            </span>
            {first.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 border border-purple-500/40 px-3.5 py-1 text-[11px] font-black text-purple-950 shadow-xs backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 text-purple-600 fill-purple-600" />
                <span>Won 1st Place by Faster Time!</span>
              </span>
            )}
          </div>

          <div className="mt-7 flex flex-col items-center gap-2">
            <p className="text-xs font-semibold text-[#5F6368] animate-pulse">
              Unfolding the official victory podium & standings...
            </p>
            <div className="h-1.5 w-44 overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#EC4899] to-[#8B5CF6] animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* --- STAGE 7: ALL WINNERS PODIUM & CASCADING FULL RANKLIST --- */}
      {step === 'SHOWCASE_ALL' && (
        <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col pt-4 pb-8 animate-in fade-in duration-500">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-[#1A73E8] border border-[#DADCE0] shadow-xs mb-2">
              <Trophy className="h-3.5 w-3.5 text-[#FBBC04]" />
              <span>Official Contest Champions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#202124]">
              Victory Podium & Standings
            </h2>
          </div>

          {/* Top 3 Visual Steps with 3D Pedestals */}
          <div className="flex items-end justify-center gap-3 px-2 mb-8">
            {/* 2nd Place */}
            {second && (
              <div className="flex flex-1 flex-col items-center animate-in slide-in-from-bottom-8 duration-500">
                <div className="relative mb-2">
                  <img
                    src={second.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                    alt={second.name}
                    className="h-14 w-14 rounded-full border-2 border-[#9AA0A6] object-cover shadow-sm"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#9AA0A6] text-[10px] font-bold text-white shadow-2xs">
                    2
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#202124] truncate max-w-[80px]">
                  {second.name}
                </span>
                <span className="text-[11px] font-semibold text-[#5F6368]">{formatDuration(second.durationMs)}</span>
                {/* 3D Pedestal Step */}
                <div className="mt-2 h-20 w-full rounded-t-2xl bg-gradient-to-t from-[#CFD8DC] via-[#ECEFF1] to-[#FFFFFF] border-t-2 border-[#9AA0A6] shadow-sm flex items-center justify-center font-black text-sm text-[#5F6368] animate-pedestal gap-1">
                  <span>2nd</span>
                  <Medal className="h-3.5 w-3.5 text-[#5F6368]" />
                </div>
              </div>
            )}

            {/* 1st Place (Center, Tallest) */}
            {first && (
              <div className="flex flex-1 flex-col items-center animate-in slide-in-from-bottom-12 duration-700">
                <Crown className="h-5 w-5 text-[#FBBC04] mb-1 animate-float" />
                <div className="relative mb-2">
                  <img
                    src={first.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                    alt={first.name}
                    className="h-18 w-18 rounded-full border-[3px] border-[#FBBC04] object-cover shadow-lg ring-4 ring-[#FBBC04]/30"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FBBC04] text-xs font-black text-white shadow-2xs">
                    1
                  </span>
                </div>
                <span className="text-xs font-bold text-[#202124] truncate max-w-[90px]">
                  {first.name}
                </span>
                <span className="text-xs font-bold text-[#137333]">{formatDuration(first.durationMs)}</span>
                {/* 3D Pedestal Step */}
                <div className="mt-2 h-28 w-full rounded-t-2xl bg-gradient-to-t from-[#FFE082] via-[#FFF9C4] to-[#FFFFFF] border-t-2 border-[#FBBC04] shadow-md flex items-center justify-center font-black text-base text-[#B06000] animate-pedestal gap-1">
                  <span>1st</span>
                  <Crown className="h-4 w-4 text-[#B06000]" />
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {third && (
              <div className="flex flex-1 flex-col items-center animate-in slide-in-from-bottom-6 duration-500">
                <div className="relative mb-2">
                  <img
                    src={third.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                    alt={third.name}
                    className="h-14 w-14 rounded-full border-2 border-[#E37400] object-cover shadow-sm"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E37400] text-[10px] font-bold text-white shadow-2xs">
                    3
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#202124] truncate max-w-[80px]">
                  {third.name}
                </span>
                <span className="text-[11px] font-semibold text-[#5F6368]">{formatDuration(third.durationMs)}</span>
                {/* 3D Pedestal Step */}
                <div className="mt-2 h-16 w-full rounded-t-2xl bg-gradient-to-t from-[#FFCCBC]/70 via-[#FBE9E7] to-[#FFFFFF] border-t-2 border-[#E37400] shadow-sm flex items-center justify-center font-black text-sm text-[#E37400] animate-pedestal gap-1">
                  <span>3rd</span>
                  <Medal className="h-3.5 w-3.5 text-[#E37400]" />
                </div>
              </div>
            )}
          </div>

          {/* Cascading Full Rank List */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5F6368] mb-1">
              Complete Standings ({fullLeaderboard.length} Participants)
            </h3>

            {fullLeaderboard.slice(0, revealedItemsCount).map((entry, idx) => (
              <div
                key={entry._id || idx}
                className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-2xs backdrop-blur-md transition-all hover:translate-y-[-2px] hover:shadow-sm animate-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0
                        ? 'bg-[#FBBC04] text-white shadow-2xs'
                        : idx === 1
                        ? 'bg-[#9AA0A6] text-white shadow-2xs'
                        : idx === 2
                        ? 'bg-[#E37400] text-white shadow-2xs'
                        : 'bg-[#F1F3F4] text-[#5F6368]'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <img
                    src={entry.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.user?.name}`}
                    alt={entry.user?.name}
                    className="h-9 w-9 rounded-full border border-[#DADCE0] object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[#202124] truncate max-w-[140px]">
                      {entry.user?.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#5F6368]">
                      <Clock className="h-2.5 w-2.5 text-[#137333]" />
                      <span>{formatDuration(entry.durationMs)}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-0.5">
                  <span className="inline-flex items-center rounded-full bg-[#E8F0FE] px-2.5 py-0.5 text-xs font-bold text-[#1A73E8]">
                    {entry.totalScore} pts
                  </span>
                  <span className="text-[10px] font-semibold text-[#137333]">
                    {formatDuration(entry.durationMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions with Redirect Home Button */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                if (third) setStep('COUNTDOWN_3RD')
                else if (second) setStep('COUNTDOWN_2ND')
                else setStep('COUNTDOWN_1ST')
                setCountdown(5)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-5 py-2.5 text-xs font-semibold text-[#3C4043] shadow-xs hover:bg-[#F8F9FA] active:scale-95 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay Ceremony</span>
            </button>
            <button
              onClick={() => {
                closeCeremony()
                router.push('/')
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all"
            >
              <Home className="h-4 w-4" />
              <span>Redirect Home</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
