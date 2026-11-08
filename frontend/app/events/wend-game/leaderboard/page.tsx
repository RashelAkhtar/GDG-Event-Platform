'use client'

import React, { Suspense } from 'react'
import Loader from '@/components/ui/Loader'
import { LeaderboardContent } from '@/app/events/[slug]/leaderboard/page'

export default function WendLeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#080D1A]">
          <Loader />
        </div>
      }
    >
      <LeaderboardContent customSlug="wend-word-game" />
    </Suspense>
  )
}
