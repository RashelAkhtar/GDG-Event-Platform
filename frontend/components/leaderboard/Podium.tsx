'use client'

import React from 'react'
import { LeaderboardEntry } from '@/lib/api'
import { Trophy, Clock, Crown, Sparkles } from 'lucide-react'

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
      <div className="flex flex-col items-center justify-center p-8 text-center text-[#6B7280]">
        <Trophy className="h-8 w-8 text-[#9CA3AF] mb-2" />
        <p className="text-xs font-mono uppercase tracking-wider">No submissions recorded yet</p>
      </div>
    )
  }

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 pt-10 pb-2 px-1 select-none">
      {/* 2nd Place (Silver Pedestal) */}
      {second ? (
        <div className="group/podium flex flex-1 flex-col items-center transition-transform hover:-translate-y-1 duration-200">
          <div className="relative mb-3 flex flex-col items-center">
            <div className="relative">
              <img
                src={second.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                alt={second.user?.name || 'Player'}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-[#9CA3AF] object-cover ring-2 ring-[#9CA3AF]/20"
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#6B7280] font-mono text-[10px] font-semibold text-white shadow-xs">
                2
              </span>
            </div>
            <span className="mt-2 text-center text-xs font-medium text-[#111827] max-w-[85px] sm:max-w-[100px] truncate">
              {second.user?.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#6B7280] my-0.5">
              Silver
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-[#4B5563] bg-[#FAFAFA] border border-[#E5E7EB] px-2 py-0.5 rounded-full mt-0.5">
              <Clock className="h-2.5 w-2.5 text-[#9CA3AF]" />
              {formatDuration(second.durationMs)}
            </span>
          </div>

          {/* Silver Step Block */}
          <div className="h-24 w-full rounded-t-2xl bg-gradient-to-b from-white to-[#F4F4F5] border border-[#E5E7EB] border-t-[3px] border-t-[#9CA3AF] shadow-[0_8px_20px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center">
            <span className="font-mono text-xs sm:text-sm font-semibold text-[#6B7280]">02</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-[#9CA3AF] mt-0.5">RUNNER UP</span>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* 1st Place (Gold Champion Pedestal) */}
      <div className="group/podium flex flex-1 flex-col items-center transition-transform hover:-translate-y-1.5 duration-200">
        <div className="relative mb-3 flex flex-col items-center">
          <div className="relative">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
              <Crown className="h-5 w-5 text-[#FBBC04] drop-shadow-xs animate-bounce" />
            </div>
            <img
              src={first.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
              alt={first.user?.name || 'Winner'}
              className="h-16 w-16 sm:h-18 sm:w-18 rounded-full border-2 border-[#FBBC04] object-cover ring-4 ring-[#FBBC04]/25 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FBBC04] font-mono text-[10px] font-bold text-[#111827] shadow-xs">
              1
            </span>
          </div>
          <span className="mt-2.5 text-center text-xs sm:text-sm font-semibold text-[#111827] max-w-[95px] sm:max-w-[120px] truncate">
            {first.user?.name}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#B45309] font-medium my-0.5 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-[#FBBC04]" />
            Champion
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-[#15803D] bg-[#F0FDF4] border border-[#DCFCE7] px-2.5 py-0.5 rounded-full mt-0.5 font-medium">
            <Clock className="h-2.5 w-2.5 text-[#16A34A]" />
            {formatDuration(first.durationMs)}
          </span>
        </div>

        {/* Champion Highest Step Block */}
        <div className="h-32 w-full rounded-t-2xl bg-gradient-to-b from-white to-[#FEFDF0] border border-[#E5E7EB] border-t-[3px] border-t-[#FBBC04] shadow-[0_12px_28px_rgba(251,188,4,0.12)] flex flex-col items-center justify-center">
          <span className="font-mono text-base sm:text-lg font-bold text-[#111827]">01</span>
          <span className="font-mono text-[8.5px] uppercase tracking-widest text-[#B45309] mt-0.5 font-medium">WINNER</span>
        </div>
      </div>

      {/* 3rd Place (Bronze Pedestal) */}
      {third ? (
        <div className="group/podium flex flex-1 flex-col items-center transition-transform hover:-translate-y-1 duration-200">
          <div className="relative mb-3 flex flex-col items-center">
            <div className="relative">
              <img
                src={third.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                alt={third.user?.name || 'Player'}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-[#D97706] object-cover ring-2 ring-[#D97706]/20"
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D97706] font-mono text-[10px] font-semibold text-white shadow-xs">
                3
              </span>
            </div>
            <span className="mt-2 text-center text-xs font-medium text-[#111827] max-w-[85px] sm:max-w-[100px] truncate">
              {third.user?.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#D97706] my-0.5">
              Bronze
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-[#4B5563] bg-[#FAFAFA] border border-[#E5E7EB] px-2 py-0.5 rounded-full mt-0.5">
              <Clock className="h-2.5 w-2.5 text-[#9CA3AF]" />
              {formatDuration(third.durationMs)}
            </span>
          </div>

          {/* Bronze Step Block */}
          <div className="h-18 w-full rounded-t-2xl bg-gradient-to-b from-white to-[#FDF8F3] border border-[#E5E7EB] border-t-[3px] border-t-[#D97706] shadow-[0_8px_20px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center">
            <span className="font-mono text-xs sm:text-sm font-semibold text-[#D97706]">03</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-[#B45309] mt-0.5">PODIUM</span>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}
