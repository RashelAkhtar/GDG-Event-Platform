'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { Podium } from '@/components/leaderboard/Podium'
import { RankList } from '@/components/leaderboard/RankList'
import { api, DEFAULT_LEADERBOARD, LeaderboardEntry } from '@/lib/api'
import Loader from '@/components/ui/Loader'
import { ArrowLeft, RefreshCw, Trophy, Home } from 'lucide-react'

export function LeaderboardContent({ customSlug }: { customSlug?: string }) {
  const params = useParams()
  const slug = customSlug || (params?.slug as string) || 'web-dev-quiz'

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
    : slug.includes('wend')
    ? 'Wend Word Arena'
    : 'Web Dev Sprint'

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#080D1A] dark:bg-[#080D1A] text-[#111827] dark:text-[#F9FAFB] relative selection:bg-[#111827] dark:selection:bg-[#38BDF8] selection:text-white dark:selection:text-[#080D1A] transition-colors duration-500">
      <Navbar />

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-5 pb-16 sm:px-6 select-none">
        {/* Navigation & Refresh Bar */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Hub</span>
          </Link>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#111827] dark:text-[#F9FAFB] hover:border-[#111827] dark:hover:border-white transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-2.5 w-2.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Editorial Title Header */}
        <div className="text-center my-4">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04]" />
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#9CA3AF]">
              OFFICIAL TOURNAMENT STANDINGS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-[-0.035em] text-[#111827] dark:text-[#F9FAFB]">
            {trackTitle}
          </h1>
          <p className="mt-1 text-xs text-[#6B7280]">
            Ranked by total score with millisecond tie-breaker timing
          </p>
        </div>

        {loading ? (
          <div className="my-8 flex flex-col items-center justify-center">
            <Loader text="Syncing standings..." />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="my-12 flex flex-col items-center rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
            <Trophy className="h-7 w-7 text-[#9CA3AF] mb-3" />
            <h3 className="text-xl font-normal tracking-[-0.03em] text-[#111827]">No Entries Recorded</h3>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-xs leading-relaxed">
              Be the first to complete this track and set the benchmark time on the podium.
            </p>
            <Link
              href={slug === 'wend-game' ? '/events/wend-game' : `/events/${slug}`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-black transition-all cursor-pointer"
            >
              <span>Enter Track</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top 3 Visual Podium Card */}
            <div className="relative rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-4 sm:p-6 shadow-[0_12px_36px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#1A73E8] via-[#FBBC04] to-[#34A853]" />
              <Podium entries={leaderboard.slice(0, 3)} />
            </div>

            {/* Scrollable Rank List */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">
                  FULL STANDINGS
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                  {leaderboard.length} PARTICIPANTS
                </span>
              </div>
              <RankList entries={leaderboard} />
            </div>

            {/* Return to Hub */}
            <div className="mt-4 mb-6 flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-[#111827] bg-[#111827] px-6 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-black active:scale-98 transition-all"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Hub</span>
              </Link>
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
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#080D1A]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#111827] border-t-transparent" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  )
}
