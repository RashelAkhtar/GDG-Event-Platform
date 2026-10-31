'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { Trophy, Crown, Medal, Award, Sparkles, X, Clock, RotateCcw, Zap } from 'lucide-react'
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

  // Sequence controller: 5-4-3-2-1 -> 3rd -> 5-4-3-2-1 -> 2nd -> 5-4-3-2-1 -> 1st -> Ranklist
  useEffect(() => {
    if (!activeCeremony) return

    const initTimer = setTimeout(() => {
      setStep('COUNTDOWN_3RD')
      setCountdown(5)
      setRevealedItemsCount(0)
    }, 0)

    let currentCount = 5

    // Stage 1: Countdown for 3rd Place
    intervalRef.current = setInterval(() => {
      currentCount -= 1
      if (currentCount >= 1) {
        setCountdown(currentCount)
      } else {
        clearInterval(intervalRef.current!)
        setStep('REVEAL_3RD')
        fireBurst(['#E37400', '#FF8F00', '#FFE082'], 60)

        // After 4 seconds of 3rd place glory, start countdown for 2nd
        setTimeout(() => {
          setStep('COUNTDOWN_2ND')
          setCountdown(5)
          let c2 = 5
          intervalRef.current = setInterval(() => {
            c2 -= 1
            if (c2 >= 1) {
              setCountdown(c2)
            } else {
              clearInterval(intervalRef.current!)
              setStep('REVEAL_2ND')
              fireBurst(['#9AA0A6', '#BDC1C6', '#FFFFFF', '#4285F4'], 80)

              // After 4 seconds of 2nd place glory, start countdown for 1st
              setTimeout(() => {
                setStep('COUNTDOWN_1ST')
                setCountdown(5)
                let c1 = 5
                intervalRef.current = setInterval(() => {
                  c1 -= 1
                  if (c1 >= 1) {
                    setCountdown(c1)
                  } else {
                    clearInterval(intervalRef.current!)
                    setStep('REVEAL_1ST')
                    // Massive Grand Champion Confetti
                    fireBurst(GOOGLE_COLORS, 140)
                    setTimeout(() => fireBurst(['#FBBC04', '#FFD700', '#FFA000'], 100), 500)

                    // After 5 seconds, smoothly transition to the complete podium & cascading ranklist
                    setTimeout(() => {
                      setStep('SHOWCASE_ALL')
                      fireBurst(GOOGLE_COLORS, 70)
                    }, 5000)
                  }
                }, 1000)
              }, 4000)
            }
          }, 1000)
        }, 4000)
      }
    }, 1000)

    return () => {
      clearTimeout(initTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeCeremony])

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
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E37400]/30 bg-[#FBE9E7]/80 px-4 py-1.5 text-xs font-bold text-[#E37400] shadow-xs backdrop-blur-md animate-float">
            <Medal className="h-4 w-4 text-[#E37400]" />
            <span>Bronze Medal • 3rd Prize Reveal</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#202124]">
            Announcing 3rd Place In
          </h2>

          {/* Animated Concentric Radar Wave Container */}
          <div className="relative my-8 flex h-48 w-48 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#E37400] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-[#E37400] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-[#E37400] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#E37400] bg-white shadow-2xl">
              <span
                key={countdown}
                className="text-7xl font-black text-[#E37400] select-none animate-count-pop"
              >
                {countdown}
              </span>
            </div>
          </div>
          <p className="text-xs font-medium text-[#5F6368]">Hold your breath for the bronze podium place...</p>
        </div>
      )}

      {/* --- STAGE 2: 3RD PRIZE WINNER REVEAL --- */}
      {step === 'REVEAL_3RD' && third && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-[32px] p-8 text-center card-bronze animate-in zoom-in-90 duration-500">
          <div className="relative mb-5 flex flex-col items-center">
            <div className="absolute -top-12 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E37400] to-[#FF8F00] px-5 py-1.5 text-xs font-bold text-white shadow-lg animate-float">
              <Medal className="h-4 w-4 text-white" />
              <span>3rd Prize Winner</span>
            </div>
            <div className="relative">
              <img
                src={third.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                alt={third.name}
                className="h-28 w-28 rounded-full border-4 border-[#E37400] object-cover shadow-xl ring-8 ring-[#E37400]/25"
              />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#E37400] text-sm font-black text-white shadow-md">
                3
              </span>
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202124]">{third.name}</h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E37400]/15 border border-[#E37400]/30 px-3.5 py-1 text-xs font-bold text-[#E37400]">
              <Award className="h-3.5 w-3.5 text-[#E37400]" />
              <span>{third.score} pts</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/90 border border-[#DADCE0] px-3 py-1 text-xs font-semibold text-[#137333] shadow-2xs">
              <Clock className="h-3 w-3" />
              {formatDuration(third.durationMs)}
            </span>
            {third.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#B06000]">
                <Zap className="h-2.5 w-2.5 text-[#FBBC04]" />
                <span>Tie-Break by Speed</span>
              </span>
            )}
          </div>
          <p className="mt-6 text-xs font-medium text-[#5F6368] animate-pulse">
            Next: 2nd Prize Silver Countdown...
          </p>
        </div>
      )}

      {/* --- STAGE 3: COUNTDOWN FOR 2ND PRIZE --- */}
      {step === 'COUNTDOWN_2ND' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#9AA0A6]/40 bg-white/90 px-4 py-1.5 text-xs font-bold text-[#5F6368] shadow-xs backdrop-blur-md animate-float">
            <Medal className="h-4 w-4 text-[#5F6368]" />
            <span>Silver Medal • 2nd Prize Reveal</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#202124]">
            Announcing 2nd Place In
          </h2>

          {/* Animated Concentric Radar Wave Container */}
          <div className="relative my-8 flex h-48 w-48 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#9AA0A6] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-[#9AA0A6] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-[#9AA0A6] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#9AA0A6] bg-white shadow-2xl">
              <span
                key={countdown}
                className="text-7xl font-black text-[#5F6368] select-none animate-count-pop"
              >
                {countdown}
              </span>
            </div>
          </div>
          <p className="text-xs font-medium text-[#5F6368]">Stepping up to the silver podium spot...</p>
        </div>
      )}

      {/* --- STAGE 4: 2ND PRIZE WINNER REVEAL --- */}
      {step === 'REVEAL_2ND' && second && (
        <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center rounded-[32px] p-8 text-center card-runnerup-silver animate-in zoom-in-90 duration-500">
          <div className="relative mb-5 flex flex-col items-center">
            <div className="absolute -top-12 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#70757A] to-[#9AA0A6] px-5 py-1.5 text-xs font-bold text-white shadow-lg animate-float">
              <Medal className="h-4 w-4 text-white" />
              <span>2nd Prize Winner</span>
            </div>
            <div className="relative">
              <img
                src={second.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                alt={second.name}
                className="h-28 w-28 rounded-full border-4 border-[#9AA0A6] object-cover shadow-xl ring-8 ring-[#9AA0A6]/25"
              />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#9AA0A6] text-sm font-black text-white shadow-md">
                2
              </span>
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202124]">{second.name}</h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8]/10 border border-[#1A73E8]/30 px-3.5 py-1 text-xs font-bold text-[#1A73E8]">
              <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span>{second.score} pts</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/90 border border-[#DADCE0] px-3 py-1 text-xs font-semibold text-[#137333] shadow-2xs">
              <Clock className="h-3 w-3" />
              {formatDuration(second.durationMs)}
            </span>
            {second.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#B06000]">
                <Zap className="h-2.5 w-2.5 text-[#FBBC04]" />
                <span>Tie-Break by Speed</span>
              </span>
            )}
          </div>
          <p className="mt-6 text-xs font-medium text-[#5F6368] animate-pulse">
            Brace yourself for the 1st Place Grand Champion...
          </p>
        </div>
      )}

      {/* --- STAGE 5: COUNTDOWN FOR 1ST PRIZE (GRAND FINALE) --- */}
      {step === 'COUNTDOWN_1ST' && (
        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FBBC04]/50 bg-gradient-to-r from-[#FEF7E0] to-[#FFF8E1] px-5 py-2 text-xs font-extrabold text-[#B06000] shadow-md animate-float">
            <Crown className="h-4 w-4 text-[#FBBC04]" />
            <span className="uppercase tracking-wider">Grand Champion • 1st Prize</span>
            <Sparkles className="h-3.5 w-3.5 text-[#FBBC04]" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#202124]">
            Who Takes First Place?
          </h2>

          {/* Golden Concentric Radar Wave Container */}
          <div className="relative my-8 flex h-52 w-52 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-3 border-[#FBBC04] animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-3 border-[#FBBC04] animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-3 border-[#FBBC04] animate-ripple-3 pointer-events-none" />

            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[5px] border-[#FBBC04] bg-white shadow-2xl ring-8 ring-[#FBBC04]/20">
              <span
                key={countdown}
                className="text-8xl font-black text-[#FBBC04] select-none animate-count-pop drop-shadow-sm"
              >
                {countdown}
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#5F6368]">The ultimate winner is crowned!</p>
        </div>
      )}

      {/* --- STAGE 6: 1ST PRIZE GRAND CHAMPION REVEAL --- */}
      {step === 'REVEAL_1ST' && first && (
        <div className="relative z-10 my-auto flex w-full max-w-md flex-col items-center rounded-[36px] p-9 text-center card-champion-gold animate-in zoom-in-90 duration-700">
          {/* Rotating Radiant Halo in Background */}
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-gradient-to-tr from-[#FBBC04]/30 via-[#EA4335]/20 to-[#4285F4]/30 blur-2xl animate-halo-spin" />

          <div className="relative mb-6 flex flex-col items-center">
            {/* Radiant Crown Banner */}
            <div className="absolute -top-14 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FBBC04] via-[#EA4335] to-[#4285F4] px-6 py-2 text-xs font-black uppercase tracking-wider text-white shadow-xl animate-float">
              <Crown className="h-4 w-4" />
              <span>1st Place • Grand Champion</span>
            </div>

            <div className="relative">
              <img
                src={first.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                alt={first.name}
                className="h-36 w-36 rounded-full border-[5px] border-[#FBBC04] object-cover shadow-2xl ring-12 ring-[#FBBC04]/35"
              />
              <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#FBBC04] text-white shadow-lg ring-4 ring-white">
                <Crown className="h-5 w-5 text-white" />
              </span>
            </div>
          </div>

          <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-[#202124]">{first.name}</h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FEF7E0] to-[#FFF8E1] border border-[#FBBC04]/50 px-4 py-1.5 text-xs font-black text-[#B06000] shadow-2xs">
              <Crown className="h-4 w-4 text-[#B06000]" />
              <span>{first.score} pts</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/90 border border-[#DADCE0] px-3.5 py-1.5 text-xs font-bold text-[#137333] shadow-2xs">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(first.durationMs)}
            </span>
            {first.tieBrokenByTime && (
              <span className="flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/60 px-3 py-1 text-[11px] font-extrabold text-[#B06000] shadow-xs">
                <Zap className="h-3 w-3 text-[#FBBC04]" />
                <span>Won 1st Place by Faster Time!</span>
              </span>
            )}
          </div>

          <p className="mt-7 text-xs font-medium text-[#5F6368] animate-pulse">
            Unfolding the official victory podium & standings...
          </p>
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

          {/* Bottom Actions */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setStep('COUNTDOWN_3RD')
                setCountdown(5)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-5 py-2.5 text-xs font-medium text-[#3C4043] shadow-xs hover:bg-[#F8F9FA] active:scale-95 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay Ceremony</span>
            </button>
            <button
              onClick={closeCeremony}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-6 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
