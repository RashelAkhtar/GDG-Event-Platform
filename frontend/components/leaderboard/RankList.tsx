'use client'

import React from 'react'
import { LeaderboardEntry } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Clock } from 'lucide-react'

interface RankListProps {
  entries: LeaderboardEntry[]
  startIndex?: number
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

export function RankList({ entries, startIndex = 0 }: RankListProps) {
  const { user } = useAuth()

  // Find user rank if exists
  const userRankIndex = entries.findIndex(
    (e) => e.user?.name === user?.name || (e.user?._id && e.user._id === user?._id)
  )

  const userEntry = userRankIndex !== -1 ? entries[userRankIndex] : null

  return (
    <div className="flex flex-col gap-2 w-full pb-20">
      {entries.map((entry, idx) => {
        const rank = startIndex + idx + 1
        const isCurrentUser =
          user && (entry.user?.name === user.name || (entry.user?._id && entry.user._id === user._id))

        return (
          <div
            key={entry._id || idx}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-all ${
              isCurrentUser
                ? 'border-[#1A73E8] bg-[#E8F0FE]/70 shadow-xs ring-1 ring-[#1A73E8]'
                : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6]'
            }`}
          >
            {/* Left: Rank & Avatar & Name */}
            <div className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  rank === 1
                    ? 'bg-[#FBBC04] text-white'
                    : rank === 2
                    ? 'bg-[#9AA0A6] text-white'
                    : rank === 3
                    ? 'bg-[#E37400] text-white'
                    : 'bg-[#F1F3F4] text-[#5F6368]'
                }`}
              >
                {rank}
              </span>

              <img
                src={entry.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.user?.name}`}
                alt={entry.user?.name}
                className="h-10 w-10 rounded-full border border-[#DADCE0] object-cover"
              />

              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#202124] max-w-[130px] sm:max-w-[180px] truncate">
                  {entry.user?.name} {isCurrentUser && <span className="text-xs font-normal text-[#1A73E8]">(You)</span>}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#5F6368]">
                  <Clock className="h-3 w-3" />
                  {formatDuration(entry.durationMs)}
                </span>
              </div>
            </div>

            {/* Right: Duration badge */}
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-semibold text-[#1A73E8]">
                <Clock className="h-3 w-3" />
                {formatDuration(entry.durationMs)}
              </span>
            </div>
          </div>
        )
      })}

      {/* Sticky Bottom Bar for Current User (Mobile Viewport) */}
      {userEntry && (
        <div className="fixed bottom-3 left-4 right-4 mx-auto max-w-md z-30">
          <div className="flex items-center justify-between rounded-full bg-[#202124] px-5 py-3 text-white shadow-lg border border-[#3C4043]">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A73E8] text-xs font-bold text-white">
                #{userRankIndex + 1}
              </span>
              <img
                src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
                alt="Me"
                className="h-8 w-8 rounded-full border border-white/20 object-cover"
              />
              <span className="text-xs font-medium truncate max-w-[120px]">
                Your Submission
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                <Clock className="h-3 w-3 text-[#8AB4F8]" />
                {formatDuration(userEntry.durationMs)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
