'use client'

import { useState } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'

type Status = 'live' | 'upcoming' | 'completed'
type Kind = 'Quiz' | 'Workshop' | 'Hackathon'

interface GdgEvent {
  slug: string
  kind: Kind
  status: Status
  title: string
  description: string
  date: string
}

const EVENTS: GdgEvent[] = [
  {
    slug: 'gdg-web-dev-quiz-2026',
    kind: 'Quiz',
    status: 'live',
    title: 'GDG Web Development Quiz 2026',
    description:
      'Test your knowledge of React, Next.js, and modern TypeScript in a live competition.',
    date: 'Today, 7:00 PM IST',
  },
  {
    slug: 'google-cloud-firebase-workshop',
    kind: 'Workshop',
    status: 'upcoming',
    title: 'Google Cloud & Firebase Workshop',
    description:
      'Build a serverless web app with Google Cloud Platform and Firestore, hands-on.',
    date: 'Nov 15, 2026, 2:00 PM IST',
  },
  {
    slug: 'ai-ml-hackathon-2026',
    kind: 'Hackathon',
    status: 'completed',
    title: 'AI & Machine Learning Hackathon',
    description:
      'Teams built projects with the Gemini API and TensorFlow. See the final rankings.',
    date: 'Oct 20, 2026, 9:00 AM IST',
  },
]

const STATUS_STYLE: Record<Status, { label: string; chip: string; action: string }> = {
  live: {
    label: 'Live now',
    chip: 'bg-[#E6F4EA] text-[#137333]',
    action: 'Join now',
  },
  upcoming: {
    label: 'Upcoming',
    chip: 'bg-[#E8F0FE] text-[#1967D2]',
    action: 'View event',
  },
  completed: {
    label: 'Completed',
    chip: 'bg-[#F1F3F4] text-[#5F6368]',
    action: 'View results',
  },
}

const KIND_STYLE: Record<Kind, { tile: string; shape: string }> = {
  Quiz: { tile: 'bg-[#D2E3FC]', shape: 'bg-[#4285F4] rounded-full' },
  Workshop: { tile: 'bg-[#FEEFC3]', shape: 'bg-[#FBBC04] rounded-[28%]' },
  Hackathon: { tile: 'bg-[#FAD2CF]', shape: 'bg-[#EA4335] rounded-tl-full rounded-br-full' },
}

const FILTERS: { id: 'all' | Status; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'live', label: 'Live now' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

function GoogleG({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
    </svg>
  )
}

function LeaderboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true">
      <path d="M16 11V3H8v6H2v12h20V11h-6zm-6-6h4v14h-4V5zm-6 6h4v8H4v-8zm16 8h-4v-6h4v6z" />
    </svg>
  )
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A73E8] focus-visible:ring-offset-2'

export default function HomePage() {
  const [filter, setFilter] = useState<'all' | Status>('all')
  const visible = EVENTS.filter((e) => filter === 'all' || e.status === filter)

  return (
    <div
      className="min-h-screen bg-[#F8F9FA] text-[#202124]"
      style={{ fontFamily: '"Google Sans", "Google Sans Text", Roboto, system-ui, sans-serif' }}
    >
      {/* Top app bar */}
      <header className="sticky top-0 z-20 border-b border-[#DADCE0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className={`flex items-center gap-3 rounded-full ${focusRing}`}>
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EA4335]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FBBC04]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
            </span>
            <span className="text-[22px] font-normal tracking-tight text-[#5F6368]">
              Google Developer Groups
            </span>
          </Link>

          <a
            href={`${API_URL}/auth/google`}
            className={`hidden items-center gap-3 rounded-full border border-[#DADCE0] bg-white px-4 py-2 text-sm font-medium text-[#3C4043] transition-colors hover:bg-[#F8F9FA] sm:inline-flex ${focusRing}`}
          >
            <GoogleG />
            Sign in with Google
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.25fr_1fr] md:py-20">
          <div>
            <h1 className="text-[40px] font-normal leading-[1.15] tracking-tight text-[#202124] sm:text-[52px]">
              Learn, compete, and build together
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5F6368]">
              Join live quizzes, hands-on workshops, and hackathons run by your local Google Developer Group.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={`${API_URL}/auth/google`}
                className={`inline-flex h-12 items-center gap-3 rounded-full bg-[#1A73E8] px-6 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-[#1765CC] hover:shadow-md ${focusRing}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <GoogleG className="h-4 w-4" />
                </span>
                Sign in with Google
              </a>
              <a
                href="#events"
                className={`inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-[#1A73E8] transition-colors hover:bg-[#E8F0FE] ${focusRing}`}
              >
                Browse events
              </a>
            </div>
            <p className="mt-4 text-sm text-[#5F6368]">Sign in to join events and appear on leaderboards.</p>
          </div>

          {/* Shape composition */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-[380px] md:block" aria-hidden="true">
            <div className="absolute left-0 top-0 h-[52%] w-[52%] rounded-full bg-[#4285F4]" />
            <div className="absolute right-0 top-0 h-[48%] w-[44%] rounded-bl-full bg-[#EA4335]" />
            <div className="absolute bottom-0 left-0 h-[44%] w-[48%] rounded-tr-full bg-[#FBBC04]" />
            <div className="absolute bottom-0 right-0 h-[50%] w-[48%] rounded-[24%] bg-[#34A853]" />
            <div className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-[#F8F9FA] bg-white" />
          </div>
        </section>

        {/* Events */}
        <section id="events" className="scroll-mt-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[28px] font-normal tracking-tight">Explore events</h2>
              <p className="mt-1 text-[15px] text-[#5F6368]">
                Find live, upcoming, and past GDG competitions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter events by status">
              {FILTERS.map((f) => {
                const selected = filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(f.id)}
                    className={`h-8 rounded-lg border px-3 text-sm font-medium transition-colors ${focusRing} ${
                      selected
                        ? 'border-transparent bg-[#E8F0FE] text-[#1967D2]'
                        : 'border-[#DADCE0] bg-white text-[#3C4043] hover:bg-[#F1F3F4]'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((event) => {
              const status = STATUS_STYLE[event.status]
              const kind = KIND_STYLE[event.kind]
              const isLive = event.status === 'live'

              return (
                <article
                  key={event.slug}
                  className="flex flex-col overflow-hidden rounded-[28px] border border-[#DADCE0] bg-white"
                >
                  {/* Tonal header */}
                  <div className={`relative flex h-36 items-center justify-between px-6 ${kind.tile}`}>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-[#3C4043]">
                      {event.kind}
                    </span>
                    <div className={`h-16 w-16 ${kind.shape}`} aria-hidden="true" />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <span
                      className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.chip}`}
                    >
                      {isLive && (
                        <span className="h-2 w-2 rounded-full bg-[#34A853] motion-safe:animate-pulse" aria-hidden="true" />
                      )}
                      {status.label}
                    </span>

                    <h3 className="mt-4 text-[22px] font-normal leading-7 text-[#202124]">{event.title}</h3>
                    <p className="mt-2 text-[15px] leading-6 text-[#5F6368]">{event.description}</p>

                    <div className="mt-5 flex items-center gap-2 text-sm text-[#5F6368]">
                      <CalendarIcon />
                      <span>{event.date}</span>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-6">
                      <Link
                        href={`/events/${event.slug}`}
                        className={`inline-flex h-10 flex-1 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors ${focusRing} ${
                          event.status === 'completed'
                            ? 'bg-[#E8F0FE] text-[#1967D2] hover:bg-[#D2E3FC]'
                            : 'bg-[#1A73E8] text-white hover:bg-[#1765CC]'
                        }`}
                      >
                        {status.action}
                      </Link>
                      <Link
                        href={`/events/${event.slug}/leaderboard`}
                        aria-label={`View leaderboard for ${event.title}`}
                        title="Leaderboard"
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DADCE0] text-[#5F6368] transition-colors hover:bg-[#F1F3F4] ${focusRing}`}
                      >
                        <LeaderboardIcon />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#DADCE0] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-[#5F6368] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 Google Developer Groups event platform</span>
          <span>Times shown in IST</span>
        </div>
      </footer>
    </div>
  )
}