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
    <div className="flex items-end justify-center gap-2.5 pt-8 pb-2 px-2">
      {/* 2nd Place (Silver) */}
      {second ? (
        <div className="flex flex-1 flex-col items-center">
          <div className="relative mb-2.5 flex flex-col items-center">
            <div className="relative">
              <img
                src={second.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=2nd'}
                alt={second.user?.name || 'Player'}
                className="h-13 w-13 rounded-full border border-[#E5E7EB] object-cover"
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#6B7280] font-mono text-[10px] font-medium text-white">
                2
              </span>
            </div>
            <span className="mt-2 text-center text-xs font-medium text-[#111827] max-w-[80px] truncate">
              {second.user?.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#6B7280] my-0.5">
              Silver
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-[#9CA3AF]">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(second.durationMs)}
            </span>
          </div>
          {/* Step block */}
          <div className="h-20 w-full rounded-t-xl bg-white border border-[#E5E7EB] border-t-2 border-t-[#6B7280] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-center font-mono text-xs font-medium text-[#6B7280]">
            02
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* 1st Place (Gold Champion) */}
      <div className="flex flex-1 flex-col items-center">
        <div className="relative mb-2.5 flex flex-col items-center">
          <div className="relative">
            <div className="absolute -top-4.5 left-1/2 -translate-x-1/2">
              <Crown className="h-4 w-4 text-[#FBBC04]" />
            </div>
            <img
              src={first.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1st'}
              alt={first.user?.name || 'Winner'}
              className="h-16 w-16 rounded-full border-2 border-[#FBBC04] object-cover ring-4 ring-[#FBBC04]/10"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FBBC04] font-mono text-[10px] font-bold text-[#111827]">
              1
            </span>
          </div>
          <span className="mt-2 text-center text-xs font-medium text-[#111827] max-w-[90px] truncate">
            {first.user?.name}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#B45309] font-medium my-0.5">
            Champion
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-[#15803D]">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(first.durationMs)}
          </span>
        </div>
        {/* Highest Step block */}
        <div className="h-28 w-full rounded-t-xl bg-white border border-[#E5E7EB] border-t-2 border-t-[#FBBC04] shadow-[0_6px_24px_rgba(0,0,0,0.03)] flex items-center justify-center font-mono text-sm font-semibold text-[#111827]">
          01
        </div>
      </div>

      {/* 3rd Place (Bronze) */}
      {third ? (
        <div className="flex flex-1 flex-col items-center">
          <div className="relative mb-2.5 flex flex-col items-center">
            <div className="relative">
              <img
                src={third.user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=3rd'}
                alt={third.user?.name || 'Player'}
                className="h-13 w-13 rounded-full border border-[#E5E7EB] object-cover"
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D97706] font-mono text-[10px] font-medium text-white">
                3
              </span>
            </div>
            <span className="mt-2 text-center text-xs font-medium text-[#111827] max-w-[80px] truncate">
              {third.user?.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#D97706] my-0.5">
              Bronze
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-[#9CA3AF]">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(third.durationMs)}
            </span>
          </div>
          {/* Step block */}
          <div className="h-14 w-full rounded-t-xl bg-white border border-[#E5E7EB] border-t-2 border-t-[#D97706] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-center font-mono text-xs font-medium text-[#D97706]">
            03
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}
