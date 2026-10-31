'use client'

import React from 'react'
import { LeaderboardEntry } from '@/lib/api'
import { Trophy, Clock, Crown } from 'lucide-react'

interface PodiumProps {
  entries: LeaderboardEntry[]
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

export function Podium({ entries }: PodiumProps) {
  const first = entries[0]
  const second = entries[1]
  const third = entries[2]

  if (!first) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-[#5F6368]">
        <Trophy className="h-10 w-10 text-[#DADCE0] mb-2" />
        <p className="text-sm">No submissions recorded yet. Be the first to play!</p>
      </div>
    )
  }

  return (
    <div className="flex items-end justify-center gap-3 pt-6 pb-2 px-2">
      {/* 2nd Place (Silver) */}
      {second ? (
        <div className="flex flex-1 flex-col items-center">
          <div className="relative mb-2 flex flex-col items-center">
            <div className="relative">
              <img
                src={second.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                alt={second.user?.name || 'Player'}
                className="h-14 w-14 rounded-full border-2 border-[#9AA0A6] object-cover shadow-xs"
              />
              <span className="absolute -bottom-1.5 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#9AA0A6] text-[11px] font-bold text-white shadow-2xs">
                2
              </span>
            </div>
            <span className="mt-2 text-center text-xs font-medium text-[#202124] max-w-[80px] truncate">
              {second.user?.name}
            </span>
            <span className="rounded-full bg-[#E8F0FE] px-2.5 py-0.5 text-[10px] font-bold text-[#1967D2] my-0.5">
              Silver Podium
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[#5F6368]">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(second.durationMs)}
            </span>
          </div>
          {/* Step block */}
          <div className="h-20 w-full rounded-t-2xl bg-gradient-to-t from-[#CFD8DC] via-[#ECEFF1] to-[#FFFFFF] border-t-2 border-[#9AA0A6] shadow-xs flex items-center justify-center text-sm font-black text-[#5F6368] animate-pedestal">
            2nd
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* 1st Place (Gold) */}
      <div className="flex flex-1 flex-col items-center">
        <div className="relative mb-2 flex flex-col items-center">
          <div className="relative">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2">
              <Trophy className="h-6 w-6 text-[#FBBC04] drop-shadow-md animate-float" />
            </div>
            <img
              src={first.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
              alt={first.user?.name || 'Winner'}
              className="h-16 w-16 rounded-full border-[3px] border-[#FBBC04] object-cover shadow-md ring-4 ring-[#FBBC04]/30"
            />
            <span className="absolute -bottom-1.5 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FBBC04] text-[11px] font-black text-white shadow-xs">
              1
            </span>
          </div>
          <span className="mt-2 text-center text-xs font-black text-[#202124] max-w-[84px] truncate">
            {first.user?.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] px-2.5 py-0.5 text-[10px] font-black text-[#B06000] my-0.5">
            <Crown className="h-3 w-3 text-[#B06000]" />
            <span>Champion</span>
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#137333]">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(first.durationMs)}
          </span>
        </div>
        {/* Highest Step block */}
        <div className="mt-2 h-28 w-full rounded-t-2xl bg-gradient-to-t from-[#FFE082] via-[#FFF9C4] to-[#FFFFFF] border-t-2 border-[#FBBC04] shadow-md flex items-center justify-center font-black text-base text-[#B06000] animate-pedestal gap-1">
          <span>1st</span>
          <Crown className="h-4 w-4 text-[#B06000]" />
        </div>
      </div>

      {/* 3rd Place (Bronze) */}
      {third ? (
        <div className="flex flex-1 flex-col items-center">
          <div className="relative mb-2 flex flex-col items-center">
            <div className="relative">
              <img
                src={third.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                alt={third.user?.name || 'Player'}
                className="h-14 w-14 rounded-full border-2 border-[#E37400] object-cover shadow-xs"
              />
              <span className="absolute -bottom-1.5 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#E37400] text-[11px] font-bold text-white shadow-2xs">
                3
              </span>
            </div>
            <span className="mt-2 text-center text-xs font-medium text-[#202124] max-w-[80px] truncate">
              {third.user?.name}
            </span>
            <span className="rounded-full bg-[#FBE9E7] px-2.5 py-0.5 text-[10px] font-bold text-[#E37400] my-0.5">
              Bronze Podium
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[#5F6368]">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(third.durationMs)}
            </span>
          </div>
          {/* Step block */}
          <div className="h-14 w-full rounded-t-2xl bg-gradient-to-t from-[#FFCCBC]/60 via-[#FBE9E7] to-[#FFFFFF] border-t-2 border-[#E37400] shadow-2xs flex items-center justify-center text-sm font-black text-[#E37400] animate-pedestal">
            3rd
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}
