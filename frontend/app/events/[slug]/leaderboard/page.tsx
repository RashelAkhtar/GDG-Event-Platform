'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { Podium } from '@/components/leaderboard/Podium'
import { RankList } from '@/components/leaderboard/RankList'
import { api, DEFAULT_LEADERBOARD, LeaderboardEntry } from '@/lib/api'
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react'

function LeaderboardContent() {
  const params = useParams()
  const slug = (params?.slug as string) || 'web-dev-quiz'

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadLeaderboard = React.useCallback(async () => {
    try {
      const data = await api.getLeaderboard('event-id', slug)
      setLeaderboard(data)
    } catch {
      setLeaderboard(DEFAULT_LEADERBOARD[slug] || DEFAULT_LEADERBOARD['web-dev-quiz'] || [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [slug])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLeaderboard()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadLeaderboard])

  const handleRefresh = () => {
    setRefreshing(true)
    loadLeaderboard()
  }

  const trackTitle = slug.includes('mentis')
    ? 'Mentis Mind Challenge'
    : 'Web Dev Sprint'

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#202124]">
      <Navbar />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4 sm:px-6">
        {/* Navigation & Refresh Bar */}
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A73E8] hover:text-[#1765CC]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Hub</span>
          </Link>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-xs font-medium text-[#3C4043] hover:bg-[#F8F9FA] transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Title Header */}
        <div className="text-center my-3">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#1A73E8] border border-[#DADCE0] shadow-2xs mb-1.5">
            <Trophy className="h-3 w-3 text-[#FBBC04]" />
            <span>Official Rankings</span>
          </div>
          <h1 className="text-2xl font-normal tracking-tight text-[#202124]">
            {trackTitle} Leaderboard
          </h1>
          <p className="mt-0.5 text-xs text-[#5F6368]">
            Ranked by score with submission duration tiebreaker
          </p>
        </div>

        {loading ? (
          <div className="my-12 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1A73E8] border-t-transparent" />
            <p className="mt-3 text-xs text-[#5F6368]">Loading standings...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="my-12 flex flex-col items-center rounded-3xl border border-[#DADCE0] bg-white p-8 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF7E0] text-[#FBBC04] mb-3">
              <Trophy className="h-8 w-8 text-[#FBBC04]" />
            </div>
            <h3 className="text-lg font-medium text-[#202124]">No Submissions Yet</h3>
            <p className="mt-1 text-xs text-[#5F6368] max-w-xs leading-relaxed">
              Be the first participant to take this challenge and claim the #1 spot on the podium!
            </p>
            <Link
              href={slug === 'wend-game' ? '/events/wend-game' : `/events/${slug}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-6 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all"
            >
              <span>Start Challenge</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top 3 Visual Podium */}
            <Podium entries={leaderboard.slice(0, 3)} />

            {/* Scrollable Rank List */}
            <div className="mt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5F6368] mb-3 px-1">
                Full Standings ({leaderboard.length} Participants)
              </h3>
              <RankList entries={leaderboard} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1A73E8] border-t-transparent" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  )
}
