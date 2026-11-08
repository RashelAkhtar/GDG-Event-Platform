'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket, CeremonyData } from '@/context/WebSocketContext'
import { useAuth } from '@/context/AuthContext'
import { soundManager } from '@/lib/sound'
import { Trophy, Crown, Medal, Award, Sparkles, X, Clock, Zap, Home, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'

// Curated light celebration palette: gold leaf, deep carbon, crisp white, and archival ink accents
const CELEBRATION_PALETTE = ['#D4AF37', '#111827', '#FFFFFF', '#1A73E8', '#EA4335', '#FBBC04', '#34A853']

type CeremonyStep =
  | 'COUNTDOWN_3RD'
  | 'REVEAL_3RD'
  | 'COUNTDOWN_2ND'
  | 'REVEAL_2ND'
  | 'COUNTDOWN_1ST'
  | 'REVEAL_1ST'
  | 'SHOWCASE_ALL'

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0.0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

export function WinnerAnnouncementOverlay() {
  const { activeCeremony } = useWebSocket()
  if (!activeCeremony) return null
  const ceremonyKey = activeCeremony.broadcastId || activeCeremony.gameSlug

  return (
    <WinnerAnnouncementStage
      key={ceremonyKey}
      ceremony={activeCeremony}
    />
  )
}

function WinnerAnnouncementStage({ ceremony }: { ceremony: CeremonyData }) {
  const router = useRouter()
  const { closeCeremony, sendWinnerCeremonyStart } = useWebSocket()
  const { user } = useAuth()
  const [step, setStep] = useState<CeremonyStep>('COUNTDOWN_3RD')
  const [countdown, setCountdown] = useState<number>(5)
  const [revealedItemsCount, setRevealedItemsCount] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const winners = ceremony.winners || []
  const first = winners.find((w) => w.rank === 1)
  const second = winners.find((w) => w.rank === 2)
  const third = winners.find((w) => w.rank === 3)
  const fullLeaderboard = ceremony.fullLeaderboard || []

  // Confetti bursts using our archival ink palette
  const fireBurst = (colors = CELEBRATION_PALETTE, particleCount = 100) => {
    try {
      confetti({
        particleCount,
        spread: 90,
        origin: { y: 0.52 },
        colors,
      })
    } catch {}
  }

  // Sequence controller: Adaptive stages (3rd -> 2nd -> 1st) with SFX
  useEffect(() => {
    if (!ceremony) return
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gdg_ceremony_revealed_${ceremony.gameSlug}`, 'true')
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
        fireBurst(CELEBRATION_PALETTE, 160)
        setTimeout(() => fireBurst(['#D4AF37', '#111827', '#FBBC04', '#FFFFFF'], 120), 400)
        setTimeout(() => fireBurst(['#1A73E8', '#34A853', '#EA4335'], 90), 800)

        setTimeout(() => {
          setStep('SHOWCASE_ALL')
          fireBurst(CELEBRATION_PALETTE, 90)
        }, 5000)
      })
    }

    const runSilver2nd = () => {
      runCountdownStage('COUNTDOWN_2ND', () => {
        setStep('REVEAL_2ND')
        soundManager.playWinner()
        fireBurst(['#6B7280', '#9CA3AF', '#111827', '#FFFFFF', '#1A73E8'], 90)

        setTimeout(() => {
          runGrand1st()
        }, 4000)
      })
    }

    const runBronze3rd = () => {
      runCountdownStage('COUNTDOWN_3RD', () => {
        setStep('REVEAL_3RD')
        soundManager.playWinner()
        fireBurst(['#D97706', '#B45309', '#111827', '#FEF3C7'], 75)

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
  }, [ceremony, third, second])

  // Staggered reveal of standings rows in SHOWCASE_ALL stage
  useEffect(() => {
    if (step === 'SHOWCASE_ALL' && fullLeaderboard.length > 0) {
      const stagger = setInterval(() => {
        setRevealedItemsCount((prev) => {
          if (prev < fullLeaderboard.length) return prev + 1
          clearInterval(stagger)
          return prev
        })
      }, 100)
      return () => clearInterval(stagger)
    }
  }, [step, fullLeaderboard.length])

  return (
    <div
      onClick={() => void soundManager.unlock()}
      onTouchStart={() => void soundManager.unlock()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto bg-[#FBFBF9]/96 p-4 sm:p-6 backdrop-blur-3xl text-[#111827] selection:bg-[#111827] selection:text-white"
    >
      {/* Pristine Light Canvas Atmosphere & Architectural Hairline Grid */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Soft Pearlescent Ambient Prisms */}
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-amber-200/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-sky-200/25 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/4 h-[460px] w-[460px] rounded-full bg-emerald-100/30 blur-[120px]" />

        {/* Minimal Architectural Grid Structure */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      {/* Top Technical Masthead */}
      <div className="relative z-10 flex w-full max-w-xl items-center justify-between pt-2">
        <div className="flex items-center gap-2.5 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#1A73E8]" />
            <span className="h-2 w-2 rounded-full bg-[#EA4335]" />
            <span className="h-2 w-2 rounded-full bg-[#FBBC04]" />
            <span className="h-2 w-2 rounded-full bg-[#34A853]" />
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#111827]">
            {ceremony.gameTitle} • VICTORY DISPATCH
          </span>
        </div>

        <button
          onClick={() => {
            closeCeremony()
            router.push('/')
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563] shadow-xs hover:border-[#111827] hover:text-[#111827] active:scale-95 transition-all cursor-pointer"
          title="Dismiss Broadcast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* --- STAGE 1: COUNTDOWN FOR 3RD PRIZE (BRONZE REVEAL) --- */}
      {/* ======================================================== */}
      {step === 'COUNTDOWN_3RD' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center animate-in fade-in duration-300">
          {/* Rotating Orbital Stamp Ring */}
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-dashed border-[#D97706]/50 anim-stamp-orbit" />
            <div className="flex h-13 w-13 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-xs">
              <Medal className="h-6 w-6 text-[#D97706]" />
            </div>
          </div>

          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.26em] text-[#B45309]">
            OFFICIAL PODIUM // BRONZE REVEAL
          </span>
          <h2 className="mt-1.5 text-3xl sm:text-4xl font-normal tracking-[-0.035em] text-[#111827]">
            Announcing 3rd Place
          </h2>

          {/* Monumental Architectural Ticker Box */}
          <div className="relative my-7 flex h-44 w-44 sm:h-52 sm:w-52 items-center justify-center rounded-2xl border-2 border-[#111827] bg-white shadow-[8px_8px_0px_#111827]">
            <span className="absolute top-2 left-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">RANK.03</span>
            <span className="absolute top-2 right-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">CHRONO</span>
            <span className="absolute bottom-2 left-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">AUTO</span>
            <span className="absolute bottom-2 right-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">LOCK</span>

            <span
              key={countdown}
              className="font-mono text-7xl sm:text-8xl font-black text-[#111827] select-none anim-ticker-pop tracking-tighter"
            >
              0{countdown}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 shadow-2xs">
            <Sparkles className="h-3 w-3 text-[#D97706]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
              Verifying bronze placement accuracy...
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 2: 3RD PRIZE WINNER REVEAL (BRONZE SHEET) ---- */}
      {/* ======================================================== */}
      {step === 'REVEAL_3RD' && third && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-3xl border-2 border-[#111827] bg-white p-7 sm:p-8 text-center shadow-[10px_10px_0px_#111827] anim-sheet-unfold">
          {/* Issue Header Bar */}
          <div className="flex w-full items-center justify-between border-b border-[#E5E7EB] pb-3 mb-5">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#6B7280]">
              OFFICIAL DISPATCH // ENTRY 03
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider rounded-full bg-[#111827] text-white px-2 py-0.5 font-bold">
              BRONZE
            </span>
          </div>

          {/* Watermark Numeral */}
          <div className="pointer-events-none absolute top-12 right-6 font-mono text-7xl font-black text-[#111827]/[0.04] select-none">
            03
          </div>

          {/* Avatar Section */}
          <div className="relative my-3 flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-[#111827] bg-[#FDF8F3] p-1 shadow-md">
                <img
                  src={third.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                  alt={third.name}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#111827] bg-[#D97706] text-white shadow-xs font-mono text-xs font-black anim-badge-sway">
                3
              </span>
            </div>
          </div>

          <h3 className="mt-2 text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#111827]">
            {third.name}
          </h3>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#6B7280] mt-0.5">
            Bronze Medal Benchmark
          </p>

          {/* Performance Ledgers */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FBFBF9] px-3.5 py-1 font-mono text-xs font-bold text-[#111827]">
              <Award className="h-3.5 w-3.5 text-[#D97706]" />
              <span>{third.score} PTS</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-1 font-mono text-xs font-bold text-[#15803D]">
              <Clock className="h-3.5 w-3.5 text-[#16A34A]" />
              <span>{formatDuration(third.durationMs)}</span>
            </span>
            {third.tieBrokenByTime && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FEF08A] bg-[#FEF9C3] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#854D0E]">
                <Zap className="h-2.5 w-2.5" />
                <span>Speed Tie-Break</span>
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col items-center gap-1.5 w-full pt-3 border-t border-[#F3F4F6]">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-[#9CA3AF]">
              Proceeding to 2nd Prize Silver countdown...
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 3: COUNTDOWN FOR 2ND PRIZE (SILVER REVEAL) --- */}
      {/* ======================================================== */}
      {step === 'COUNTDOWN_2ND' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center animate-in fade-in duration-300">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-dashed border-[#6B7280]/50 anim-stamp-orbit" />
            <div className="flex h-13 w-13 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-xs">
              <Medal className="h-6 w-6 text-[#6B7280]" />
            </div>
          </div>

          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.26em] text-[#4B5563]">
            OFFICIAL PODIUM // SILVER REVEAL
          </span>
          <h2 className="mt-1.5 text-3xl sm:text-4xl font-normal tracking-[-0.035em] text-[#111827]">
            Announcing 2nd Place
          </h2>

          <div className="relative my-7 flex h-44 w-44 sm:h-52 sm:w-52 items-center justify-center rounded-2xl border-2 border-[#111827] bg-white shadow-[8px_8px_0px_#111827]">
            <span className="absolute top-2 left-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">RANK.02</span>
            <span className="absolute top-2 right-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">CHRONO</span>
            <span className="absolute bottom-2 left-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">AUTO</span>
            <span className="absolute bottom-2 right-2.5 font-mono text-[8px] text-[#9CA3AF] uppercase">LOCK</span>

            <span
              key={countdown}
              className="font-mono text-7xl sm:text-8xl font-black text-[#111827] select-none anim-ticker-pop tracking-tighter"
            >
              0{countdown}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 shadow-2xs">
            <Sparkles className="h-3 w-3 text-[#6B7280]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
              Stepping up to the silver runner spot...
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 4: 2ND PRIZE WINNER REVEAL (SILVER SHEET) ---- */}
      {/* ======================================================== */}
      {step === 'REVEAL_2ND' && second && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-3xl border-2 border-[#111827] bg-white p-7 sm:p-8 text-center shadow-[10px_10px_0px_#111827] anim-sheet-unfold">
          <div className="flex w-full items-center justify-between border-b border-[#E5E7EB] pb-3 mb-5">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#6B7280]">
              OFFICIAL DISPATCH // ENTRY 02
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider rounded-full bg-[#111827] text-white px-2 py-0.5 font-bold">
              SILVER
            </span>
          </div>

          <div className="pointer-events-none absolute top-12 right-6 font-mono text-7xl font-black text-[#111827]/[0.04] select-none">
            02
          </div>

          <div className="relative my-3 flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-[#111827] bg-[#F5F5F0] p-1 shadow-md">
                <img
                  src={second.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                  alt={second.name}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#111827] bg-[#6B7280] text-white shadow-xs font-mono text-xs font-black anim-badge-sway">
                2
              </span>
            </div>
          </div>

          <h3 className="mt-2 text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#111827]">
            {second.name}
          </h3>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#6B7280] mt-0.5">
            Silver Runner-Up Benchmark
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FBFBF9] px-3.5 py-1 font-mono text-xs font-bold text-[#111827]">
              <Award className="h-3.5 w-3.5 text-[#6B7280]" />
              <span>{second.score} PTS</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-1 font-mono text-xs font-bold text-[#15803D]">
              <Clock className="h-3.5 w-3.5 text-[#16A34A]" />
              <span>{formatDuration(second.durationMs)}</span>
            </span>
            {second.tieBrokenByTime && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FEF08A] bg-[#FEF9C3] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#854D0E]">
                <Zap className="h-2.5 w-2.5" />
                <span>Speed Tie-Break</span>
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col items-center gap-1.5 w-full pt-3 border-t border-[#F3F4F6]">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-[#9CA3AF]">
              Stand by for the 1st Place Grand Victor...
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 5: COUNTDOWN FOR 1ST PRIZE (GRAND VICTOR) ---- */}
      {/* ======================================================== */}
      {step === 'COUNTDOWN_1ST' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center animate-in fade-in duration-300">
          <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#111827]/40 anim-stamp-orbit" />
            <div className="flex h-15 w-15 items-center justify-center rounded-full border-2 border-[#111827] bg-[#FEF9C3] shadow-sm anim-badge-sway">
              <Crown className="h-7 w-7 text-[#B45309] fill-[#FBBC04]" />
            </div>
          </div>

          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#B45309]">
            OFFICIAL PODIUM // GRAND VICTOR
          </span>
          <h2 className="mt-1.5 text-3xl sm:text-5xl font-normal tracking-[-0.04em] text-[#111827]">
            Who Takes First Place?
          </h2>

          <div className="relative my-7 flex h-48 w-48 sm:h-56 sm:w-56 items-center justify-center rounded-3xl border-2 border-[#111827] bg-white shadow-[10px_10px_0px_#111827]">
            <span className="absolute top-2.5 left-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">RANK.01</span>
            <span className="absolute top-2.5 right-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">CHAMPION</span>
            <span className="absolute bottom-2.5 left-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">GOLD</span>
            <span className="absolute bottom-2.5 right-3 font-mono text-[8.5px] text-[#9CA3AF] uppercase">LOCK</span>

            <span
              key={countdown}
              className="font-mono text-8xl sm:text-9xl font-black text-[#111827] select-none anim-ticker-pop tracking-tighter"
            >
              0{countdown}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4.5 py-1.5 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-[#B45309]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
              Calibrating official tournament benchmark victor...
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 6: 1ST PRIZE GRAND VICTOR REVEAL (GOLD SHEET)  */}
      {/* ======================================================== */}
      {step === 'REVEAL_1ST' && first && (
        <div className="relative z-10 my-auto flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-[#111827] bg-white p-8 sm:p-10 text-center shadow-[14px_14px_0px_#111827] anim-sheet-unfold">
          <div className="flex w-full items-center justify-between border-b border-[#E5E7EB] pb-3 mb-5">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#6B7280]">
              OFFICIAL DISPATCH // ENTRY 01
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider rounded-full border border-[#111827] bg-[#FBBC04] text-[#111827] px-2.5 py-0.5 font-bold shadow-2xs">
              GRAND VICTOR
            </span>
          </div>

          <div className="pointer-events-none absolute top-12 right-6 font-mono text-8xl font-black text-[#111827]/[0.05] select-none">
            01
          </div>

          <div className="relative my-3 flex flex-col items-center">
            <div className="relative">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-2 border-[#111827] bg-[#FEFDF0] p-1.5 shadow-lg">
                <img
                  src={first.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                  alt={first.name}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#111827] bg-[#FBBC04] text-[#111827] shadow-sm anim-badge-sway">
                <Crown className="h-5 w-5 fill-[#111827]" />
              </span>
            </div>
          </div>

          <h3 className="mt-2 text-3xl sm:text-4xl font-normal tracking-[-0.035em] text-[#111827]">
            {first.name}
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#B45309] font-bold mt-0.5">
            Tournament Champion &benchmark Leader
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FBFBF9] px-4 py-1.5 font-mono text-xs font-bold text-[#111827]">
              <Crown className="h-3.5 w-3.5 text-[#B45309] fill-[#FBBC04]" />
              <span>{first.score} PTS</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-1.5 font-mono text-xs font-bold text-[#15803D]">
              <Clock className="h-3.5 w-3.5 text-[#16A34A]" />
              <span>{formatDuration(first.durationMs)}</span>
            </span>
            {first.tieBrokenByTime && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FEF08A] bg-[#FEF9C3] px-3 py-1 font-mono text-[10px] font-bold text-[#854D0E]">
                <Zap className="h-3 w-3" />
                <span>Won 1st Place by Faster Time!</span>
              </span>
            )}
          </div>

          <div className="mt-7 flex flex-col items-center gap-2 w-full pt-4 border-t border-[#F3F4F6]">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#9CA3AF]">
              Unfolding Full Tournament Podium & Standings...
            </span>
            <div className="h-1 w-36 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div className="h-full w-full bg-[#111827] animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- STAGE 7: ALL WINNERS PODIUM & COMPLETE STANDINGS --- */}
      {/* ======================================================== */}
      {step === 'SHOWCASE_ALL' && (
        <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col pt-3 pb-8 animate-in fade-in duration-500">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1 text-xs font-medium text-[#111827] shadow-2xs mb-1.5">
              <Trophy className="h-3.5 w-3.5 text-[#B45309]" />
              <span className="font-mono text-[10px] uppercase tracking-wider">OFFICIAL CONTEST RECORD</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-normal tracking-[-0.035em] text-[#111827]">
              Victory Plinths & Standings
            </h2>
          </div>

          {/* Stepped Fluted Architectural Plinths */}
          <div className="flex items-end justify-center gap-2 sm:gap-4 px-1 mb-7">
            {/* 2nd Place Plinth */}
            {second && (
              <div className="flex flex-1 flex-col items-center anim-plinth-rise">
                <div className="relative mb-2">
                  <div className="h-13 w-13 rounded-full border border-[#D1D5DB] bg-white p-0.5 shadow-xs">
                    <img
                      src={second.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                      alt={second.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#6B7280] font-mono text-[9px] font-bold text-white shadow-2xs">
                    2
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#111827] truncate max-w-[80px]">
                  {second.name}
                </span>
                <span className="font-mono text-[10px] text-[#6B7280]">{formatDuration(second.durationMs)}</span>

                <div className="relative mt-2 h-24 w-full rounded-t-xl border border-[#E5E7EB] border-t-2 border-t-[#6B7280] bg-gradient-to-b from-white to-[#F5F5F0] shadow-xs flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_9px,#00000005_10px)] pointer-events-none" />
                  <span className="font-mono text-xs font-bold text-[#6B7280]">02</span>
                  <span className="font-mono text-[7.5px] uppercase tracking-widest text-[#9CA3AF] mt-0.5">SILVER</span>
                </div>
              </div>
            )}

            {/* 1st Place Tallest Champion Plinth */}
            {first && (
              <div className="flex flex-1 flex-col items-center anim-plinth-rise z-10">
                <Crown className="h-4 w-4 text-[#B45309] fill-[#FBBC04] mb-1 anim-badge-sway" />
                <div className="relative mb-2">
                  <div className="h-16 w-16 rounded-full border-2 border-[#111827] bg-white p-1 shadow-sm">
                    <img
                      src={first.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                      alt={first.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FBBC04] border border-[#111827] font-mono text-[10px] font-black text-[#111827] shadow-2xs">
                    1
                  </span>
                </div>
                <span className="text-xs font-bold text-[#111827] truncate max-w-[90px]">
                  {first.name}
                </span>
                <span className="font-mono text-[10px] font-semibold text-[#15803D]">{formatDuration(first.durationMs)}</span>

                <div className="relative mt-2 h-34 w-full rounded-t-xl border border-[#E5E7EB] border-t-[3px] border-t-[#111827] bg-gradient-to-b from-white via-[#FEFDF0] to-[#F5F5F0] shadow-sm flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_9px,#00000007_10px)] pointer-events-none" />
                  <span className="font-mono text-sm font-black text-[#111827]">01</span>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#B45309] font-bold mt-0.5">VICTOR</span>
                </div>
              </div>
            )}

            {/* 3rd Place Plinth */}
            {third && (
              <div className="flex flex-1 flex-col items-center anim-plinth-rise">
                <div className="relative mb-2">
                  <div className="h-13 w-13 rounded-full border border-[#D1D5DB] bg-white p-0.5 shadow-xs">
                    <img
                      src={third.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                      alt={third.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#D97706] font-mono text-[9px] font-bold text-white shadow-2xs">
                    3
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#111827] truncate max-w-[80px]">
                  {third.name}
                </span>
                <span className="font-mono text-[10px] text-[#6B7280]">{formatDuration(third.durationMs)}</span>

                <div className="relative mt-2 h-20 w-full rounded-t-xl border border-[#E5E7EB] border-t-2 border-t-[#D97706] bg-gradient-to-b from-white to-[#F5F5F0] shadow-xs flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_9px,#00000005_10px)] pointer-events-none" />
                  <span className="font-mono text-xs font-bold text-[#D97706]">03</span>
                  <span className="font-mono text-[7.5px] uppercase tracking-widest text-[#B45309] mt-0.5">BRONZE</span>
                </div>
              </div>
            )}
          </div>

          {/* Staggered Full Rank List */}
          <div className="flex flex-col gap-2">
            <h3 className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#6B7280] mb-0.5 px-1">
              FULL RECORD SHEET ({fullLeaderboard.length} PARTICIPANTS)
            </h3>

            {fullLeaderboard.slice(0, revealedItemsCount).map((entry, idx) => (
              <div
                key={entry._id || idx}
                className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 shadow-2xs hover:border-[#111827] transition-all duration-200 anim-sheet-unfold"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5.5 w-5.5 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                      idx === 0
                        ? 'bg-[#FBBC04] text-[#111827] border border-[#111827]'
                        : idx === 1
                        ? 'bg-[#E5E7EB] text-[#111827]'
                        : idx === 2
                        ? 'bg-[#FED7AA] text-[#7C2D12]'
                        : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <img
                    src={entry.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.user?.name}`}
                    alt={entry.user?.name}
                    className="h-8 w-8 rounded-full border border-[#E5E7EB] object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#111827] truncate max-w-[140px]">
                      {entry.user?.name}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[9px] text-[#6B7280]">
                      <Clock className="h-2.5 w-2.5 text-[#16A34A]" />
                      <span>{formatDuration(entry.durationMs)}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-0.5">
                  <span className="inline-flex items-center rounded-md border border-[#E5E7EB] bg-[#FBFBF9] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#111827]">
                    {entry.totalScore} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  sendWinnerCeremonyStart({
                    gameSlug: ceremony.gameSlug,
                    gameTitle: ceremony.gameTitle,
                    winners: ceremony.winners,
                    fullLeaderboard: ceremony.fullLeaderboard,
                    broadcastId: `ceremony_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    timestamp: Date.now(),
                  })
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#111827] bg-white px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[#111827] shadow-xs hover:bg-[#F9FAFB] active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#B45309]" />
                <span>Replay Broadcast</span>
              </button>
            )}

            <button
              onClick={() => {
                closeCeremony()
                router.push('/')
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#111827] bg-[#111827] px-7 py-2.5 font-mono text-xs uppercase tracking-wider text-white shadow-[4px_4px_0px_#9CA3AF] hover:bg-black active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Return to Hub</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
