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
  if (!ms || ms <= 0) return '0.0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

export function RankList({ entries, startIndex = 0 }: RankListProps) {
  const { user } = useAuth()

  const nonAdminEntries = entries.filter((e) => {
    const name = e.user?.name || ''
    return !name.toLowerCase().includes('admin') && e.user?._id !== 'admin_master_aryan'
  })

  // Find user rank if exists
  const userRankIndex = nonAdminEntries.findIndex(
    (e) => e.user?.name === user?.name || (e.user?._id && e.user._id === user?._id)
  )

  const userEntry = userRankIndex !== -1 ? nonAdminEntries[userRankIndex] : null

  return (
    <div className="flex flex-col gap-2 w-full pb-24 select-none">
      {nonAdminEntries.map((entry, idx) => {
        const rank = startIndex + idx + 1
        const isCurrentUser =
          user && (entry.user?.name === user.name || (entry.user?._id && entry.user._id === user._id))

        return (
          <div
            key={entry._id || idx}
            className={`group flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-150 ${
              isCurrentUser
                ? 'border-[#111827] bg-[#F4F4F5] shadow-xs ring-1 ring-[#111827]/10'
                : 'border-[#E5E7EB] bg-white hover:border-[#111827] hover:shadow-xs'
            }`}
          >
            {/* Left: Rank & Avatar & Name */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold text-[#111827] w-6 text-center shrink-0">
                {String(rank).padStart(2, '0')}
              </span>

              <img
                src={entry.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.user?.name}`}
                alt={entry.user?.name}
                className="h-9 w-9 rounded-full border border-[#E5E7EB] object-cover ring-1 ring-black/5 shrink-0"
              />

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-medium text-[#111827] max-w-[130px] sm:max-w-[190px] truncate">
                    {entry.user?.name}
                  </span>
                  {isCurrentUser && (
                    <span className="inline-block rounded bg-[#111827] px-1.5 py-0.2 font-mono text-[8.5px] uppercase tracking-wider text-white">
                      You
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 font-mono text-[9.5px] text-[#9CA3AF] mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDuration(entry.durationMs)}
                </span>
              </div>
            </div>

            {/* Right: Duration badge */}
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-2.5 py-1 font-mono text-[10px] text-[#111827] group-hover:border-[#111827] transition-colors">
                <Clock className="h-2.5 w-2.5 text-[#6B7280]" />
                {formatDuration(entry.durationMs)}
              </span>
            </div>
          </div>
        )
      })}

      {/* Sticky Bottom Bar for Current User (Mobile Viewport) */}
      {userEntry && (
        <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm z-30 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between rounded-full bg-[#111827]/95 backdrop-blur-md px-4 py-2 text-white shadow-2xl border border-neutral-700">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white font-mono text-[10px] font-bold text-[#111827]">
                #{userRankIndex + 1}
              </span>
              <img
                src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
                alt="Me"
                className="h-6 w-6 rounded-full border border-white/20 object-cover"
              />
              <span className="font-mono text-[10px] uppercase tracking-wider truncate max-w-[110px]">
                Your Rank
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-emerald-400">
                {formatDuration(userEntry.durationMs)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
