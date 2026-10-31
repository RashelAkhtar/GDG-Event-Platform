'use client'

import React, { useEffect, useState } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { CircleBucket } from '@/components/bucket/CircleBucket'
import { DualQuizSection } from '@/components/quiz/DualQuizSection'
import { api, DEFAULT_WEB_EVENT, DEFAULT_MENTIS_EVENT, GdgEvent } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { GoogleG } from '@/components/ui/GoogleBrand'
import Link from 'next/link'
import { ShieldCheck, Trophy } from 'lucide-react'

export default function HomePage() {
  const { user, loginWithGoogle } = useAuth()
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#202124] relative overflow-hidden">
      {/* Background Ambient Aurora Gradient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#4285F4]/10 blur-3xl animate-aurora" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-[#FBBC04]/10 blur-3xl animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-[#34A853]/10 blur-3xl animate-aurora" style={{ animationDelay: '-10s' }} />
      </div>

      {/* 1. Google Authentication & App Bar */}
      <Navbar />

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 pb-16 sm:px-6">
        {/* Minimal Hero Header */}
        <section className="text-center">
          <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-[#202124] leading-tight">
            Learn, Compete & Build
          </h1>
          <p className="mt-1 text-xs text-[#5F6368]">
            Sign in to unlock interactive quizzes and join the community bucket.
          </p>

          {/* Quick Google Sign In CTA if unauthenticated */}
          {!user && (
            <div className="mt-3.5 flex justify-center">
              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-[#3C4043] border border-[#DADCE0] shadow-xs hover:bg-[#F8F9FA] hover:shadow-sm active:scale-95 transition-all"
              >
                <GoogleG className="h-4 w-4" />
                <span>One-Tap Sign in with Google</span>
              </button>
            </div>
          )}
        </section>

        {/* 2. Interactive Circle Bucket with Falling Profile Bubbles */}
        <section className="mt-6 mb-8">
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
        <section className="mt-8 flex items-center justify-between rounded-3xl border border-white/80 bg-white/85 p-4 shadow-2xs backdrop-blur-md transition-all hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF7E0] text-[#FBBC04] shadow-2xs">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#202124]">Live Leaderboards</h4>
              <p className="text-[11px] text-[#5F6368]">Scores & Duration Tiebreakers</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href={`/events/${webEvent.slug}/leaderboard`}
              className="rounded-full bg-[#E8F0FE] px-3 py-1.5 text-xs font-semibold text-[#1967D2] hover:bg-[#D2E3FC] transition-all hover:scale-105 active:scale-95"
            >
              Web
            </Link>
            <Link
              href={`/events/${mentisEvent.slug}/leaderboard`}
              className="rounded-full bg-[#FEF7E0] px-3 py-1.5 text-xs font-semibold text-[#B06000] hover:bg-[#FEEFC3] transition-all hover:scale-105 active:scale-95"
            >
              Mentis
            </Link>
            <Link
              href="/events/wend-game/leaderboard"
              className="rounded-full bg-[#E6F4EA] px-3 py-1.5 text-xs font-semibold text-[#137333] hover:bg-[#CEEAD6] transition-all hover:scale-105 active:scale-95"
            >
              Wend
            </Link>
          </div>
        </section>

        {/* Admin Quick Access Footer (for easy navigation) */}
        {user?.role === 'ADMIN' && (
          <div className="mt-6 text-center">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] px-4 py-1.5 text-xs font-medium text-[#1967D2] hover:bg-[#D2E3FC] transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Open Admin Controller</span>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DADCE0] bg-white py-5">
        <div className="mx-auto flex max-w-lg flex-col items-center justify-between gap-2 px-4 text-center text-xs text-[#5F6368] sm:flex-row">
          <span>© 2026 Google Developer Groups</span>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="hover:text-[#202124] transition-colors">
              Admin Page
            </Link>
            <span>•</span>
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