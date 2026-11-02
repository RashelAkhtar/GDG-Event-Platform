'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { soundManager } from '@/lib/sound'
import { Trophy, Crown, Medal, Award, Sparkles, X, Clock, Zap, Home, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'

const CELEBRATION_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#8B5CF6', '#EC4899', '#00E5FF']

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

  // Fire celebratory fireworks / confetti against the dark cinematic canvas
  const fireBurst = (colors = CELEBRATION_COLORS, particleCount = 100) => {
    try {
      confetti({
        particleCount,
        spread: 90,
        origin: { y: 0.55 },
        colors,
      })
    } catch {}
  }

  // Sequence controller: Dynamic adaptive stages (3rd -> 2nd -> 1st) with crisp SFX
  useEffect(() => {
    if (!activeCeremony) return
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gdg_ceremony_revealed_${activeCeremony.gameSlug}`, 'true')
    }

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
        fireBurst(CELEBRATION_COLORS, 160)
        setTimeout(() => fireBurst(['#FFD700', '#FFA000', '#FF4081', '#7C4DFF'], 120), 400)
        setTimeout(() => fireBurst(['#00E5FF', '#76FF03', '#FFD600'], 90), 800)

        setTimeout(() => {
          setStep('SHOWCASE_ALL')
          fireBurst(CELEBRATION_COLORS, 80)
        }, 5000)
      })
    }

    const runSilver2nd = () => {
      runCountdownStage('COUNTDOWN_2ND', () => {
        setStep('REVEAL_2ND')
        soundManager.playWinner()
        fireBurst(['#00E5FF', '#38BDF8', '#818CF8', '#FFFFFF'], 90)

        setTimeout(() => {
          runGrand1st()
        }, 4000)
      })
    }

    const runBronze3rd = () => {
      runCountdownStage('COUNTDOWN_3RD', () => {
        setStep('REVEAL_3RD')
        soundManager.playWinner()
        fireBurst(['#FB923C', '#F97316', '#EA580C', '#FFE082'], 70)

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
      }, 120)
      return () => clearInterval(stagger)
    }
  }, [step, fullLeaderboard.length])

  if (!activeCeremony) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto bg-[#070B14]/98 p-4 sm:p-6 backdrop-blur-3xl text-white selection:bg-fuchsia-500 selection:text-white">
      {/* Cinematic Ambient Multi-Color Aurora Mesh & Laser Flares */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[130px] animate-aurora" />
        <div className="absolute top-1/4 -right-40 h-[550px] w-[550px] rounded-full bg-fuchsia-600/25 blur-[140px] animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[130px] animate-aurora" style={{ animationDelay: '-9s' }} />
        {/* Subtle grid pattern for high-tech arena feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex w-full max-w-xl items-center justify-between pt-2">
        <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-4.5 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#EA4335] animate-ping" />
            <span className="h-2 w-2 rounded-full bg-[#FBBC04]" />
            <span className="h-2 w-2 rounded-full bg-[#34A853]" />
            <span className="h-2 w-2 rounded-full bg-[#4285F4]" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {activeCeremony.gameTitle} • Victory Broadcast
          </span>
        </div>

        <button
          onClick={closeCeremony}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-slate-300 shadow-md backdrop-blur-xl hover:bg-white/20 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="Close broadcast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* --- STAGE 1: COUNTDOWN FOR 3RD PRIZE (BRONZE REVEAL) --- */}
      {/* ======================================================== */}
      {step === 'COUNTDOWN_3RD' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center animate-in fade-in duration-300">
          <span className="mb-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-orange-500/40 bg-gradient-to-r from-orange-600/30 to-amber-600/30 px-5 py-2 text-xs font-black uppercase tracking-widest text-orange-300 shadow-[0_0_25px_rgba(234,88,12,0.35)] backdrop-blur-xl animate-float">
            <Medal className="h-4 w-4 text-orange-400" />
            <span>Bronze Medal • 3rd Place Reveal</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_25px_rgba(255,255,255,0.2)]">
            Announcing 3rd Place In
          </h2>

          {/* Animated Concentric Radar Wave Container */}
          <div className="relative my-9 flex h-52 w-52 sm:h-60 sm:w-60 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/50 shadow-[0_0_25px_rgba(249,115,22,0.5)] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 shadow-[0_0_35px_rgba(234,179,8,0.3)] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center rounded-full border-2 border-orange-500/40 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-[0_0_50px_rgba(234,88,12,0.45)] ring-10 ring-orange-500/15 backdrop-blur-2xl">
              <span
                key={countdown}
                className="text-8xl sm:text-9xl font-black select-none animate-count-pop bg-gradient-to-b from-white via-orange-200 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(249,115,22,0.8)]"
              >
                {countdown}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-xl animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <span>Hold your breath for the bronze podium champion...</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 2: 3RD PRIZE WINNER REVEAL (BRONZE CHAMPION) - */}
      {/* ======================================================== */}
      {step === 'REVEAL_3RD' && third && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-[36px] p-8 text-center bg-slate-900/85 border border-orange-500/35 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(234,88,12,0.3)] backdrop-blur-2xl animate-in zoom-in-90 duration-500">
          {/* Top Banner - Non-wrapping */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_8px_25px_rgba(234,88,12,0.5)] ring-2 ring-white/30 animate-float">
            <Medal className="h-4 w-4 text-orange-200" />
            <span>3RD PRIZE • BRONZE MEDAL</span>
          </div>

          <div className="relative mt-3 mb-4 flex flex-col items-center">
            <div className="relative">
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-orange-500 via-amber-400 to-yellow-500 shadow-[0_0_35px_rgba(249,115,22,0.6)]">
                <img
                  src={third.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                  alt={third.name}
                  className="h-28 w-28 rounded-full bg-slate-950 object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-black text-white shadow-lg ring-2 ring-slate-900">
                3
              </span>
            </div>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">{third.name}</h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 px-4 py-1.5 text-xs font-black text-orange-300 shadow-xs backdrop-blur-md">
              <Award className="h-3.5 w-3.5 text-orange-400" />
              <span>{third.score} pts</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow-xs backdrop-blur-md">
              <Clock className="h-3 w-3 text-emerald-400" />
              <span>{formatDuration(third.durationMs)}</span>
            </span>
            {third.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-[11px] font-black text-amber-300 shadow-xs backdrop-blur-md">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>Tie-Break by Speed</span>
              </span>
            )}
          </div>
          <p className="mt-6 text-xs font-medium text-slate-400 animate-pulse">
            Next: 2nd Prize Silver Countdown...
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 3: COUNTDOWN FOR 2ND PRIZE (SILVER REVEAL) --- */}
      {/* ======================================================== */}
      {step === 'COUNTDOWN_2ND' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center animate-in fade-in duration-300">
          <span className="mb-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-sky-400/40 bg-gradient-to-r from-sky-600/30 to-indigo-600/30 px-5 py-2 text-xs font-black uppercase tracking-widest text-sky-300 shadow-[0_0_25px_rgba(14,165,233,0.35)] backdrop-blur-xl animate-float">
            <Medal className="h-4 w-4 text-sky-400" />
            <span>Silver Medal • 2nd Place Reveal</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_25px_rgba(255,255,255,0.2)]">
            Announcing 2nd Place In
          </h2>

          {/* Animated Concentric Radar Wave Container */}
          <div className="relative my-9 flex h-52 w-52 sm:h-60 sm:w-60 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-sky-500/50 shadow-[0_0_25px_rgba(14,165,233,0.5)] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.4)] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 shadow-[0_0_35px_rgba(6,182,212,0.3)] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center rounded-full border-2 border-sky-500/40 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-[0_0_50px_rgba(14,165,233,0.45)] ring-10 ring-sky-500/15 backdrop-blur-2xl">
              <span
                key={countdown}
                className="text-8xl sm:text-9xl font-black select-none animate-count-pop bg-gradient-to-b from-white via-sky-200 to-sky-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(14,165,233,0.8)]"
              >
                {countdown}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-xl animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            <span>Stepping up to the silver podium spot...</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 4: 2ND PRIZE WINNER REVEAL (SILVER RUNNER-UP)  */}
      {/* ======================================================== */}
      {step === 'REVEAL_2ND' && second && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-[36px] p-8 text-center bg-slate-900/85 border border-sky-500/35 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(14,165,233,0.3)] backdrop-blur-2xl animate-in zoom-in-90 duration-500">
          {/* Top Banner - Non-wrapping */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-500 px-6 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_8px_25px_rgba(14,165,233,0.5)] ring-2 ring-white/30 animate-float">
            <Medal className="h-4 w-4 text-sky-200" />
            <span>2ND PRIZE • SILVER RUNNER-UP</span>
          </div>

          <div className="relative mt-3 mb-4 flex flex-col items-center">
            <div className="relative">
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-400 to-cyan-400 shadow-[0_0_35px_rgba(14,165,233,0.6)]">
                <img
                  src={second.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                  alt={second.name}
                  className="h-28 w-28 rounded-full bg-slate-950 object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-black text-white shadow-lg ring-2 ring-slate-900">
                2
              </span>
            </div>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">{second.name}</h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-400/40 px-4 py-1.5 text-xs font-black text-sky-300 shadow-xs backdrop-blur-md">
              <Award className="h-3.5 w-3.5 text-sky-400" />
              <span>{second.score} pts</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow-xs backdrop-blur-md">
              <Clock className="h-3 w-3 text-emerald-400" />
              <span>{formatDuration(second.durationMs)}</span>
            </span>
            {second.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-[11px] font-black text-amber-300 shadow-xs backdrop-blur-md">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>Tie-Break by Speed</span>
              </span>
            )}
          </div>
          <p className="mt-6 text-xs font-medium text-slate-400 animate-pulse">
            Brace yourself for the 1st Place Grand Champion...
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 5: COUNTDOWN FOR 1ST PRIZE (NO YELLOW! SEXY) - */}
      {/* ======================================================== */}
      {step === 'COUNTDOWN_1ST' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center animate-in fade-in duration-300">
          {/* Cyber Holographic Pill Badge */}
          <div className="mb-5 inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-fuchsia-500/40 bg-gradient-to-r from-indigo-600/30 via-fuchsia-600/30 to-pink-600/30 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.35)] backdrop-blur-2xl ring-1 ring-white/20 animate-float">
            <Crown className="h-4 w-4 text-amber-300 fill-amber-300" />
            <span>GRAND CHAMPION • REVEAL COUNTDOWN</span>
            <Sparkles className="h-4 w-4 text-fuchsia-300 animate-spin" />
          </div>

          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_35px_rgba(255,255,255,0.25)]">
            Who Takes First Place?
          </h2>

          {/* Futuristic Concentric Radar Reactor with Cyber Pulses (Zero Flat Yellow!) */}
          <div className="relative my-9 flex h-60 w-60 sm:h-72 sm:w-72 items-center justify-center">
            {/* Outer dynamic ripples in electric neon tones */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.5)] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-fuchsia-500/40 shadow-[0_0_35px_rgba(217,70,239,0.4)] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-pink-500/35 shadow-[0_0_40px_rgba(236,72,153,0.35)] animate-ripple-3 pointer-events-none" />

            {/* Rotating dashed holographic ring */}
            <div className="absolute inset-3 rounded-full border border-dashed border-cyan-400/30 animate-halo-spin pointer-events-none" />

            {/* Deep Glassmorphic Core */}
            <div className="relative flex h-44 w-44 sm:h-52 sm:w-52 items-center justify-center rounded-full border-2 border-fuchsia-500/40 bg-gradient-to-b from-slate-900/95 to-slate-950 shadow-[0_0_60px_rgba(168,85,247,0.45),inset_0_0_30px_rgba(236,72,153,0.25)] ring-12 ring-fuchsia-500/15 backdrop-blur-3xl">
              <span
                key={countdown}
                className="text-8xl sm:text-9xl font-black tracking-tighter select-none animate-count-pop bg-gradient-to-b from-white via-fuchsia-200 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(236,72,153,0.85)]"
              >
                {countdown}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-5 py-2 text-xs font-bold text-slate-300 backdrop-blur-xl animate-pulse">
            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span>Hold your breath... crowning the ultimate victor!</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 6: 1ST PRIZE GRAND CHAMPION REVEAL (AESTHETIC) */}
      {/* ======================================================== */}
      {step === 'REVEAL_1ST' && first && (
        <div className="relative z-10 my-auto flex w-full max-w-md flex-col items-center rounded-[40px] p-8 sm:p-10 text-center bg-slate-900/90 border border-amber-400/35 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_70px_rgba(245,158,11,0.35)] backdrop-blur-3xl animate-in zoom-in-90 duration-700">
          {/* Rotating Radiant Halo in Background */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-amber-500/30 via-rose-500/30 to-violet-600/30 blur-[100px] animate-halo-spin" />

          {/* Radiant Crown Banner - Centered, Non-wrapping, Glowing */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 px-7 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_35px_rgba(244,63,94,0.55)] ring-2 ring-white/40 animate-float">
            <Crown className="h-4 w-4 text-amber-200 fill-amber-200" />
            <span>1ST PLACE • GRAND CHAMPION</span>
            <Sparkles className="h-4 w-4 text-pink-200 animate-spin" />
          </div>

          <div className="relative mt-4 mb-5 flex flex-col items-center">
            <div className="relative">
              {/* Ambient pulsating glow aura behind avatar */}
              <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 opacity-80 blur-xl animate-pulse" />

              {/* Luxury Multi-Color Iridescent Avatar Frame */}
              <div className="relative p-2 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 shadow-[0_0_40px_rgba(245,158,11,0.6)]">
                <img
                  src={first.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                  alt={first.name}
                  className="h-32 w-32 sm:h-36 sm:w-36 rounded-full bg-slate-950 object-cover shadow-inner"
                />
              </div>

              {/* Floating 3D Gold Crown Badge */}
              <span className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-white shadow-[0_6px_20px_rgba(217,119,6,0.7)] ring-3 ring-slate-900 animate-bounce">
                <Crown className="h-6 w-6 text-white fill-white drop-shadow-md" />
              </span>
            </div>
          </div>

          <h3 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_25px_rgba(255,255,255,0.3)]">
            {first.name}
          </h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-4.5 py-1.5 text-xs font-black text-amber-300 shadow-xs backdrop-blur-md">
              <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>{first.score} pts</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-4.5 py-1.5 text-xs font-bold text-emerald-300 shadow-xs backdrop-blur-md">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>{formatDuration(first.durationMs)}</span>
            </span>
            {first.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-violet-500/20 border border-violet-400/40 px-3.5 py-1 text-[11px] font-black text-violet-300 shadow-xs backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 text-violet-400 fill-violet-400" />
                <span>Won 1st Place by Faster Time!</span>
              </span>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center gap-2.5">
            <p className="text-xs font-semibold text-slate-300 animate-pulse">
              Unfolding the official victory podium & standings...
            </p>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10 shadow-inner">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-violet-600 animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 7: ALL WINNERS PODIUM & COMPLETE STANDINGS --- */}
      {/* ======================================================== */}
      {step === 'SHOWCASE_ALL' && (
        <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col pt-4 pb-8 animate-in fade-in duration-500">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-sky-300 border border-white/15 shadow-xs backdrop-blur-md mb-2">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>Official Contest Champions</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
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
                    className="h-14 w-14 rounded-full border-2 border-sky-400 object-cover shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white shadow-2xs">
                    2
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-200 truncate max-w-[80px]">
                  {second.name}
                </span>
                <span className="text-[11px] font-semibold text-sky-300">{formatDuration(second.durationMs)}</span>
                {/* 3D Pedestal Step */}
                <div className="mt-2 h-20 w-full rounded-t-2xl bg-gradient-to-t from-slate-900 via-slate-800 to-sky-950/80 border-t-2 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] flex items-center justify-center font-black text-sm text-sky-200 animate-pedestal gap-1">
                  <span>2nd</span>
                  <Medal className="h-3.5 w-3.5 text-sky-400" />
                </div>
              </div>
            )}

            {/* 1st Place (Center, Tallest) */}
            {first && (
              <div className="flex flex-1 flex-col items-center animate-in slide-in-from-bottom-12 duration-700">
                <Crown className="h-5 w-5 text-amber-400 mb-1 animate-float" />
                <div className="relative mb-2">
                  <img
                    src={first.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                    alt={first.name}
                    className="h-18 w-18 rounded-full border-[3px] border-amber-400 object-cover shadow-[0_0_25px_rgba(245,158,11,0.6)] ring-4 ring-amber-400/30"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white shadow-2xs">
                    1
                  </span>
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[90px]">
                  {first.name}
                </span>
                <span className="text-xs font-bold text-emerald-400">{formatDuration(first.durationMs)}</span>
                {/* 3D Pedestal Step */}
                <div className="mt-2 h-28 w-full rounded-t-2xl bg-gradient-to-t from-slate-900 via-amber-950/70 to-amber-900/50 border-t-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center font-black text-base text-amber-200 animate-pedestal gap-1">
                  <span>1st</span>
                  <Crown className="h-4 w-4 text-amber-400" />
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
                    className="h-14 w-14 rounded-full border-2 border-orange-400 object-cover shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-2xs">
                    3
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-200 truncate max-w-[80px]">
                  {third.name}
                </span>
                <span className="text-[11px] font-semibold text-orange-300">{formatDuration(third.durationMs)}</span>
                {/* 3D Pedestal Step */}
                <div className="mt-2 h-16 w-full rounded-t-2xl bg-gradient-to-t from-slate-900 via-slate-800 to-orange-950/80 border-t-2 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.25)] flex items-center justify-center font-black text-sm text-orange-200 animate-pedestal gap-1">
                  <span>3rd</span>
                  <Medal className="h-3.5 w-3.5 text-orange-400" />
                </div>
              </div>
            )}
          </div>

          {/* Cascading Full Rank List */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Complete Standings ({fullLeaderboard.length} Participants)
            </h3>

            {fullLeaderboard.slice(0, revealedItemsCount).map((entry, idx) => (
              <div
                key={entry._id || idx}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm backdrop-blur-md transition-all hover:bg-white/10 hover:translate-y-[-2px] animate-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0
                        ? 'bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                        : idx === 1
                        ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.6)]'
                        : idx === 2
                        ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(234,88,12,0.6)]'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <img
                    src={entry.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.user?.name}`}
                    alt={entry.user?.name}
                    className="h-9 w-9 rounded-full border border-white/20 object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white truncate max-w-[140px]">
                      {entry.user?.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-2.5 w-2.5 text-emerald-400" />
                      <span>{formatDuration(entry.durationMs)}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-0.5">
                  <span className="inline-flex items-center rounded-full bg-sky-500/20 border border-sky-400/40 px-2.5 py-0.5 text-xs font-black text-sky-300">
                    {entry.totalScore} pts
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400">
                    {formatDuration(entry.durationMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions with ONLY Redirect Home Button (No Replay Ceremony Button) */}
          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={() => {
                closeCeremony()
                router.push('/')
              }}
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#1A73E8] via-[#4285F4] to-[#60A5FA] px-8 py-3.5 text-sm font-bold text-white shadow-[0_10px_35px_rgba(26,115,232,0.5)] hover:shadow-[0_15px_45px_rgba(26,115,232,0.7)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="h-4 w-4" />
              <span>Redirect Home</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
