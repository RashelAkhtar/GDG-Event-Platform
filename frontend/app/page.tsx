'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { CircleBucket } from '@/components/bucket/CircleBucket'
import { VoxelWorldBackdrop } from '@/components/bucket/VoxelWorldBackdrop'
import { DualQuizSection } from '@/components/quiz/DualQuizSection'
import { api, DEFAULT_WEB_EVENT, DEFAULT_MENTIS_EVENT, DEFAULT_WEND_EVENT, GdgEvent } from '@/lib/api'
import Link from 'next/link'
import { Trophy, ArrowUpRight, Sparkles, Activity } from 'lucide-react'

export default function HomePage() {
  const [webEvent, setWebEvent] = useState<GdgEvent>(DEFAULT_WEB_EVENT)
  const [mentisEvent, setMentisEvent] = useState<GdgEvent>(DEFAULT_MENTIS_EVENT)
  const [wendEvent, setWendEvent] = useState<GdgEvent>(DEFAULT_WEND_EVENT)

  useEffect(() => {
    async function loadEvents() {
      try {
        const events = await api.getEvents()
        const web = events.find((e) => e.slug.includes('web')) || DEFAULT_WEB_EVENT
        const mentis = events.find((e) => e.slug.includes('mentis')) || DEFAULT_MENTIS_EVENT
        const wend = events.find((e) => e.slug.includes('wend')) || DEFAULT_WEND_EVENT
        setWebEvent(web)
        setMentisEvent(mentis)
        setWendEvent(wend)
      } catch {
        // Fallback to initial defaults
      }
    }
    loadEvents()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111827] relative selection:bg-[#111827] selection:text-white">
      {/* 1. Publication Masthead Navigation */}
      <Navbar />

      <main
        className="relative mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-8 pb-20 sm:px-6 select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Editorial Hero Header */}
        <section className="text-center select-none pt-2 pb-6">
          <div className="inline-flex items-center gap-2 mb-3 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E8] animate-pulse" />
            <span className="font-mono text-[9.5px] tracking-[0.24em] uppercase text-[#6B7280]">
              GDG LIVE ARENA SESSIONS
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-normal tracking-[-0.04em] text-[#111827] leading-[1.06]">
            Compete. Build. <span className="font-serif italic font-normal text-[#111827]">Excel.</span>
          </h1>

          <p className="mt-3.5 text-xs sm:text-sm text-[#4B5563] font-normal leading-relaxed max-w-md mx-auto">
            Quick-fire dev quizzes, sneaky word mazes, and live showdowns.
            <br className="hidden sm:inline" /> Bring your sharpest keystrokes—the podium waits for no one.
          </p>

          {/* Micro Metrics Ribbon */}
          <div className="mt-4 inline-flex items-center justify-center gap-3 sm:gap-4 font-mono text-[9px] tracking-[0.16em] uppercase text-[#9CA3AF]">
            <span className="flex items-center gap-1 text-[#111827]">
              <span className="h-1 w-1 rounded-full bg-[#34A853]" />
              03 Arenas Active
            </span>
            <span>•</span>
            <span className="hidden xs:inline flex items-center gap-1">
              <Activity className="h-2.5 w-2.5 text-[#1A73E8]" />
              Realtime Sync
            </span>
            <span className="hidden xs:inline">•</span>
            <span>Live Standings</span>
          </div>
        </section>

        {/* 2. Interactive Kinetic Circle Vessel with Miniature Voxel World Behind */}
        <section className="relative isolate mt-2 mb-8 select-none touch-none">
          <VoxelWorldBackdrop />
          <div className="relative z-10">
            <CircleBucket />
          </div>
        </section>

        {/* Hairline Divider Rule */}
        <div className="hairline-divider mb-8" />

        {/* 3. Challenge Tracks Arena */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#1A73E8]" />
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#9CA3AF]">
                FEATURED TRACKS
              </span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#6B7280]">
              03 ARENAS READY
            </span>
          </div>

          <DualQuizSection
            webEvent={webEvent}
            mentisEvent={mentisEvent}
            wendEvent={wendEvent}
            onStatusChange={(id, newStatus) => {
              if (webEvent._id === id) setWebEvent({ ...webEvent, status: newStatus })
              if (mentisEvent._id === id) setMentisEvent({ ...mentisEvent, status: newStatus })
              if (wendEvent._id === id) setWendEvent({ ...wendEvent, status: newStatus })
            }}
          />
        </section>

        {/* 4. Official Tournament Standings Index */}
        <section className="group relative overflow-hidden mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 transition-all duration-300 hover:border-[#111827] hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#1A73E8] via-[#FBBC04] to-[#34A853] opacity-60 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111827] text-white">
                  <Trophy className="h-3 w-3" />
                </span>
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#9CA3AF]">
                  LEADERBOARDS
                </span>
              </div>
              <h4 className="text-base font-medium tracking-tight text-[#111827] mt-1.5">
                Official Tournament Standings
              </h4>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Verified score rankings with millisecond tie-breaker timing.
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 flex-wrap">
              <Link
                href={`/events/${webEvent.slug}/leaderboard`}
                className="group/btn inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-1.5 text-xs font-medium text-[#111827] hover:border-[#111827] hover:bg-white transition-all active:scale-95"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E8]" />
                <span>Web</span>
                <ArrowUpRight className="h-3 w-3 text-[#9CA3AF] group-hover/btn:text-[#111827] transition-colors" />
              </Link>
              <Link
                href={`/events/${mentisEvent.slug}/leaderboard`}
                className="group/btn inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-1.5 text-xs font-medium text-[#111827] hover:border-[#111827] hover:bg-white transition-all active:scale-95"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04]" />
                <span>Mentis</span>
                <ArrowUpRight className="h-3 w-3 text-[#9CA3AF] group-hover/btn:text-[#111827] transition-colors" />
              </Link>
              <Link
                href="/events/wend-game/leaderboard"
                className="group/btn inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-1.5 text-xs font-medium text-[#111827] hover:border-[#111827] hover:bg-white transition-all active:scale-95"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
                <span>Wend</span>
                <ArrowUpRight className="h-3 w-3 text-[#9CA3AF] group-hover/btn:text-[#111827] transition-colors" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Colophon / Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-6 mt-auto">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-[#6B7280] sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335]" />
            <span className="font-medium text-[#111827]">Google Developer Groups</span>
            <span className="text-[#9CA3AF] font-mono text-[11px]">© 2026</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono tracking-wider uppercase">
            <a
              href="https://developers.google.com/community/gdg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              Guidelines
            </a>
            <span className="text-[#D1D5DB]">•</span>
            <span className="inline-flex items-center gap-1 text-[#34A853]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34A853] animate-pulse" />
              Live Platform
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
