'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { Podium } from '@/components/leaderboard/Podium'
import { RankList } from '@/components/leaderboard/RankList'
import { api, DEFAULT_LEADERBOARD, LeaderboardEntry } from '@/lib/api'
import { ArrowLeft, RefreshCw, Trophy, Home } from 'lucide-react'

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
    : slug.includes('wend')
    ? 'Wend Word Arena'
    : 'Web Dev Sprint'

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#202124] relative overflow-hidden">
      {/* Background Multi-color Aurora Mesh for Google Game Aesthetic */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[#4285F4]/10 blur-3xl animate-aurora" />
        <div className="absolute top-1/2 -right-40 h-[480px] w-[480px] rounded-full bg-[#FBBC04]/10 blur-3xl animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute -bottom-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#34A853]/10 blur-3xl animate-aurora" style={{ animationDelay: '-10s' }} />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4 sm:px-6">
        {/* Navigation & Refresh Bar */}
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3.5 py-1 text-xs font-semibold text-[#5F6368] shadow-2xs backdrop-blur-md hover:bg-white hover:text-[#202124] transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Hub</span>
          </Link>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3.5 py-1 text-xs font-semibold text-[#3C4043] shadow-2xs backdrop-blur-md hover:bg-white hover:text-[#202124] transition-all active:scale-95"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Title Header */}
        <div className="text-center my-4">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1 text-xs font-bold text-[#1A73E8] border border-white/80 shadow-2xs backdrop-blur-md mb-2">
            <Trophy className="h-3.5 w-3.5 text-[#FBBC04]" />
            <span>Official Rankings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202124]">
            {trackTitle} Leaderboard
          </h1>
          <p className="mt-1 text-xs font-medium text-[#5F6368]">
            Ranked by score with duration tiebreaker
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
            {/* Top 3 Visual Podium Card */}
            <div className="relative rounded-[32px] border border-white/90 bg-white/90 p-4 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />
              <Podium entries={leaderboard.slice(0, 3)} />
            </div>

            {/* Scrollable Rank List */}
            <div className="mt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5F6368] mb-3 px-1">
                Full Standings ({leaderboard.length} Participants)
              </h3>
              <RankList entries={leaderboard} />
            </div>

            {/* Redirect to Home Hub Button */}
            <div className="mt-8 mb-6 flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#1557B0] px-7 py-3 text-xs font-bold text-white shadow-sm hover:shadow-md hover:from-[#1765CC] hover:to-[#124BA0] active:scale-95 transition-all"
              >
                <Home className="h-4 w-4" />
                <span>Redirect to Home Hub</span>
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
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1A73E8] border-t-transparent" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  )
}
