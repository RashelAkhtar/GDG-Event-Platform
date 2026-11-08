'use client'

import React from 'react'
import { LeaderboardEntry } from '@/lib/api'
import { Trophy, Clock, Crown, Sparkles, Award } from 'lucide-react'

interface PodiumProps {
  entries: LeaderboardEntry[]
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0.0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

export function Podium({ entries }: PodiumProps) {
  const filtered = entries.filter((e) => {
    const name = e.user?.name || ''
    return !name.toLowerCase().includes('admin') && e.user?._id !== 'admin_master_aryan'
  })
  const first = filtered[0]
  const second = filtered[1]
  const third = filtered[2]

  if (!first) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-[#6B7280]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F5F5F0]">
          <Trophy className="h-5 w-5 text-[#9CA3AF]" />
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#6B7280]">
          Ledger Sheet Empty • Awaiting Official Submissions
        </p>
      </div>
    )
  }

  return (
    <div className="relative pt-12 pb-3 select-none">
      {/* Background Architectural Typographic Watermark */}
      <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[60px] font-black tracking-tighter text-[#111827]/[0.03] dark:text-white/[0.04] whitespace-nowrap">
        TOP TIERS
      </div>

      <div className="flex items-end justify-center gap-2.5 sm:gap-5 px-1 sm:px-2">
        {/* ================= SECOND PLACE (SILVER PEDESTAL) ================= */}
        {second ? (
          <div className="group/podium flex flex-1 flex-col items-center transition-all duration-300 hover:-translate-y-2">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="relative">
                <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-[#D1D5DB] dark:border-[#334155] bg-white dark:bg-[#0F172A] p-1 shadow-sm">
                  <img
                    src={second.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                    alt={second.user?.name || 'Player'}
                    className="h-full w-full rounded-full object-cover contrast-115"
                  />
                </div>
                {/* Monospaced Precision Badge */}
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-[#111827] bg-[#111827] px-2 py-0.2 font-mono text-[9px] font-bold tracking-wider text-white shadow-2xs">
                  02
                </span>
              </div>

              <span className="mt-3.5 text-center text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] max-w-[85px] sm:max-w-[105px] truncate">
                {second.user?.name}
              </span>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Silver Runner
              </span>
              <span className="mt-1 inline-flex items-center gap-1 font-mono text-[9.5px] text-[#111827] rounded-md border border-[#E5E7EB] dark:border-[#334155] bg-[#FBFBF9] dark:bg-[#1E293B] px-2 py-0.5 shadow-2xs text-[#111827] dark:text-[#F9FAFB]">
                <Clock className="h-2.5 w-2.5 text-[#9CA3AF]" />
                {formatDuration(second.durationMs)}
              </span>
            </div>

            {/* Architectural Fluted Column */}
            <div className="relative w-full h-32 sm:h-36 rounded-t-xl border border-[#E5E7EB] dark:border-[#1E293B] border-t-2 border-t-[#6B7280] dark:border-t-[#94A3B8] bg-gradient-to-b from-white dark:from-[#1E293B] via-[#FBFBF9] dark:via-[#0F172A] to-[#F5F5F0] dark:to-[#080D1A] shadow-[0_10px_24px_rgba(0,0,0,0.03)] flex flex-col items-center justify-between py-3 overflow-hidden">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_11px,#00000006_12px)] pointer-events-none" />
              <span className="font-mono text-[8.5px] tracking-[0.24em] uppercase text-[#9CA3AF] font-bold">
                RANK 02
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-black text-[#111827]/12 tracking-tighter">
                II
              </span>
              <div className="h-1 w-8 rounded-full bg-[#D1D5DB]" />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* ================= FIRST PLACE (GOLD CHAMPION PEDESTAL) ================= */}
        <div className="group/podium flex flex-1 flex-col items-center transition-all duration-300 hover:-translate-y-2.5 z-10">
          <div className="relative mb-3 flex flex-col items-center">
            {/* Tilted Floating Crown Stamp */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 anim-badge-sway">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#FBBC04] bg-[#FEF9C3] text-[#B45309] shadow-xs">
                <Crown className="h-3.5 w-3.5 fill-[#FBBC04]" />
              </span>
            </div>

            <div className="relative">
              <div className="relative h-18 w-18 sm:h-20 sm:w-20 rounded-full border-2 border-[#111827] bg-white p-1 shadow-md">
                <img
                  src={first.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
                  alt={first.user?.name || 'Winner'}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border border-[#111827] bg-[#FBBC04] px-2.5 py-0.2 font-mono text-[10px] font-black tracking-wider text-[#111827] shadow-xs">
                01
              </span>
            </div>

            <span className="mt-4 text-center text-xs sm:text-sm font-bold tracking-tight text-[#111827] max-w-[95px] sm:max-w-[120px] truncate">
              {first.user?.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#B45309] font-bold mt-0.5 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-[#FBBC04]" />
              Champion
            </span>
            <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#15803D] rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-0.5 shadow-2xs">
              <Clock className="h-2.5 w-2.5 text-[#16A34A]" />
              {formatDuration(first.durationMs)}
            </span>
          </div>

          {/* Tallest Champion Plinth */}
          <div className="relative w-full h-44 sm:h-48 rounded-t-xl border border-[#E5E7EB] border-t-[3px] border-t-[#111827] bg-gradient-to-b from-white via-[#FEFDF0] to-[#F5F5F0] shadow-[0_16px_36px_rgba(0,0,0,0.06)] flex flex-col items-center justify-between py-4 overflow-hidden">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_11px,#00000008_12px)] pointer-events-none" />
            <div className="flex items-center gap-1 font-mono text-[8.5px] tracking-[0.24em] uppercase text-[#B45309] font-bold">
              <span>VICTOR</span>
            </div>
            <span className="font-mono text-4xl sm:text-5xl font-black text-[#111827]/22 tracking-tighter">
              I
            </span>
            <div className="h-1.5 w-12 rounded-full bg-[#111827]" />
          </div>
        </div>

        {/* ================= THIRD PLACE (BRONZE PEDESTAL) ================= */}
        {third ? (
          <div className="group/podium flex flex-1 flex-col items-center transition-all duration-300 hover:-translate-y-2">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="relative">
                <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-[#D1D5DB] dark:border-[#334155] bg-white dark:bg-[#0F172A] p-1 shadow-sm">
                  <img
                    src={third.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                    alt={third.user?.name || 'Player'}
                    className="h-full w-full rounded-full object-cover contrast-115"
                  />
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-[#111827] bg-[#111827] px-2 py-0.2 font-mono text-[9px] font-bold tracking-wider text-white shadow-2xs">
                  03
                </span>
              </div>

              <span className="mt-3.5 text-center text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] max-w-[85px] sm:max-w-[105px] truncate">
                {third.user?.name}
              </span>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Bronze Stand
              </span>
              <span className="mt-1 inline-flex items-center gap-1 font-mono text-[9.5px] text-[#111827] rounded-md border border-[#E5E7EB] dark:border-[#334155] bg-[#FBFBF9] dark:bg-[#1E293B] px-2 py-0.5 shadow-2xs text-[#111827] dark:text-[#F9FAFB]">
                <Clock className="h-2.5 w-2.5 text-[#9CA3AF]" />
                {formatDuration(third.durationMs)}
              </span>
            </div>

            {/* Bronze Architectural Plinth */}
            <div className="relative w-full h-26 sm:h-30 rounded-t-xl border border-[#E5E7EB] border-t-2 border-t-[#D97706] bg-gradient-to-b from-white via-[#FDF8F3] to-[#F5F5F0] shadow-[0_8px_20px_rgba(0,0,0,0.03)] flex flex-col items-center justify-between py-2.5 overflow-hidden">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_11px,#00000006_12px)] pointer-events-none" />
              <span className="font-mono text-[8.5px] tracking-[0.24em] uppercase text-[#9CA3AF] font-bold">
                RANK 03
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-black text-[#111827]/12 tracking-tighter">
                III
              </span>
              <div className="h-1 w-8 rounded-full bg-[#D1D5DB]" />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  )
}
