'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { CircleBucket } from '@/components/bucket/CircleBucket'
import { DualQuizSection } from '@/components/quiz/DualQuizSection'
import { api, DEFAULT_WEB_EVENT, DEFAULT_MENTIS_EVENT, GdgEvent } from '@/lib/api'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

export default function HomePage() {
  const [webEvent, setWebEvent] = useState<GdgEvent>(DEFAULT_WEB_EVENT)
  const [mentisEvent, setMentisEvent] = useState<GdgEvent>(DEFAULT_MENTIS_EVENT)

  useEffect(() => {
    async function loadEvents() {
      try {
        const events = await api.getEvents()
        const web = events.find((e) => e.slug.includes('web')) || DEFAULT_WEB_EVENT
        const mentis = events.find((e) => e.slug.includes('mentis')) || DEFAULT_MENTIS_EVENT
        setWebEvent(web)
        setMentisEvent(mentis)
      } catch {
        // Fallback to default Web and Mentis events
      }
    }
    loadEvents()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#202124] relative overflow-hidden bg-tech-grid">
      {/* Background Ambient Aurora Gradient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] bg-[#4285F4]/10 blur-3xl animate-aurora" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] bg-[#FBBC04]/10 blur-3xl animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] bg-[#34A853]/10 blur-3xl animate-aurora" style={{ animationDelay: '-10s' }} />
      </div>

      {/* 1. Google Authentication & App Bar */}
      <Navbar />

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 pb-16 sm:px-6 select-none" onContextMenu={(e) => e.preventDefault()}>
        {/* Minimal Hero Header */}
        <section className="text-center select-none">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#202124] leading-tight select-none uppercase font-mono">
            Learn • Compete • Build
          </h1>
        </section>

        {/* 2. Interactive Circle Bucket with Falling Profile Bubbles */}
        <section className="mt-6 mb-8 select-none touch-none">
          <CircleBucket />
        </section>

        {/* 3. Mobile Top & Bottom Quiz Section (Web & Mentis) with Dynamic Lock/Unlock */}
        <section className="mt-2">
          <DualQuizSection
            webEvent={webEvent}
            mentisEvent={mentisEvent}
            onStatusChange={(id, newStatus) => {
              if (webEvent._id === id) setWebEvent({ ...webEvent, status: newStatus })
              if (mentisEvent._id === id) setMentisEvent({ ...mentisEvent, status: newStatus })
            }}
          />
        </section>

        {/* Leaderboards Quick Access Bar */}
        <section className="mt-8 flex items-center justify-between border border-[#DADCE0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-[#FBBC04] bg-[#FEF7E0] text-[#B06000]">
              <Trophy className="h-5 w-5 text-[#FBBC04]" />
            </div>
            <div>
              <h4 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#202124]">Live Leaderboards</h4>
              <p className="text-[11px] text-[#5F6368]">Live Tie-Breaker Standings</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href={`/events/${webEvent.slug}/leaderboard`}
              className="border border-[#1A73E8] bg-[#E8F0FE] px-3 py-1 font-mono text-xs font-bold text-[#1967D2] hover:bg-[#1A73E8] hover:text-white transition-all cursor-pointer shadow-2xs"
            >
              WEB
            </Link>
            <Link
              href={`/events/${mentisEvent.slug}/leaderboard`}
              className="border border-[#FBBC04] bg-[#FEF7E0] px-3 py-1 font-mono text-xs font-bold text-[#B06000] hover:bg-[#FBBC04] hover:text-[#202124] transition-all cursor-pointer shadow-2xs"
            >
              MENTIS
            </Link>
            <Link
              href="/events/wend-game/leaderboard"
              className="border border-[#34A853] bg-[#E6F4EA] px-3 py-1 font-mono text-xs font-bold text-[#137333] hover:bg-[#34A853] hover:text-white transition-all cursor-pointer shadow-2xs"
            >
              WEND
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#DADCE0] bg-white py-5">
        <div className="mx-auto flex max-w-lg flex-col items-center justify-between gap-2 px-4 text-center text-xs text-[#5F6368] sm:flex-row">
          <span>© 2026 Google Developer Groups</span>
          <div className="flex items-center gap-3">
            <a
              href="https://developers.google.com/community/gdg"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#202124] transition-colors"
            >
              Community
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}