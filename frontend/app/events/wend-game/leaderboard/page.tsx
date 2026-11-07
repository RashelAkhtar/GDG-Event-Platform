'use client'

import React, { Suspense } from 'react'
import { LeaderboardContent } from '@/app/events/[slug]/leaderboard/page'

export default function WendLeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#111827] border-t-transparent" />
        </div>
      }
    >
      <LeaderboardContent customSlug="wend-word-game" />
    </Suspense>
  )
}
