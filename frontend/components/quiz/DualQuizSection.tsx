'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  GdgEvent,
  api,
  DEFAULT_WEND_EVENT,
} from '@/lib/api'
import { AnimatedLockToggle } from '@/components/ui/AnimatedLockToggle'
import {
  Globe,
  Brain,
  Lock,
  Unlock,
  ArrowRight,
  Award,
  Sparkles,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'

interface DualQuizSectionProps {
  webEvent: GdgEvent
  mentisEvent: GdgEvent
  onStatusChange?: (eventId: string, newStatus: 'LIVE' | 'UPCOMING') => void
}

export function DualQuizSection({
  webEvent: initialWeb,
  mentisEvent: initialMentis,
  onStatusChange,
}: DualQuizSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { gameLockStates, sendLockToggle, sendWinnerCeremonyStart, liveLeaderboards } = useWebSocket()
  const [webEvent, setWebEvent] = useState<GdgEvent>(initialWeb)
  const [mentisEvent, setMentisEvent] = useState<GdgEvent>(initialMentis)
  const [wendEvent, setWendEvent] = useState<GdgEvent>(DEFAULT_WEND_EVENT)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const isAdmin = user?.role === 'ADMIN'

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Real-time lock states
  const isWebLive = gameLockStates['web-dev-quiz']
    ? gameLockStates['web-dev-quiz'].status === 'LIVE'
    : webEvent.status === 'LIVE'

  const isMentisLive = gameLockStates['mentis-quiz']
    ? gameLockStates['mentis-quiz'].status === 'LIVE'
    : mentisEvent.status === 'LIVE'

  const isWendLive = gameLockStates['wend-game']
    ? gameLockStates['wend-game'].status === 'LIVE'
    : wendEvent.status === 'LIVE'

  const toggleEventLock = async (
    targetEvent: GdgEvent,
    isCurrentlyLive: boolean,
    setTarget: React.Dispatch<React.SetStateAction<GdgEvent>>
  ) => {
    if (!isAdmin) return
    const newStatus: 'LIVE' | 'UPCOMING' = isCurrentlyLive ? 'UPCOMING' : 'LIVE'
    const isLocked = newStatus !== 'LIVE'

    setUpdatingId(targetEvent._id)
    try {
      sendLockToggle(targetEvent.slug, isLocked, newStatus)
      await api.updateEventStatus(targetEvent._id, newStatus)
      setTarget((prev) => ({ ...prev, status: newStatus }))
      if (onStatusChange) {
        onStatusChange(targetEvent._id, newStatus)
      }
      showToast(`${targetEvent.title} is now ${isLocked ? 'LOCKED' : 'UNLOCKED'}!`)
    } catch {
      showToast('Updated local status')
    } finally {
      setUpdatingId(null)
    }
  }

  const triggerWinnerCeremony = (slug: string, title: string) => {
    const liveEntries = liveLeaderboards[slug] || []
    const rankedStandings = [...liveEntries].sort((a, b) => {
      const scoreDiff = (b.totalScore ?? 0) - (a.totalScore ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return (a.durationMs || 0) - (b.durationMs || 0)
    })

    const ceremonyWinners = rankedStandings.slice(0, 3).map((entry, idx) => ({
      rank: (idx + 1) as 1 | 2 | 3,
      name: entry.user?.name || 'Participant',
      avatar: entry.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${idx}`,
      score: entry.totalScore ?? 0,
      durationMs: entry.durationMs || 0,
    }))

    sendWinnerCeremonyStart({
      gameSlug: slug,
      gameTitle: title,
      winners: ceremonyWinners,
      fullLeaderboard: rankedStandings,
    })

    showToast(`Broadcasted winner ceremony for ${title}!`)
  }

  const renderQuizCard = (
    event: GdgEvent,
    isLive: boolean,
    setEvent: React.Dispatch<React.SetStateAction<GdgEvent>>,
    type: 'web' | 'mentis' | 'wend'
  ) => {
    const isUpdating = updatingId === event._id

    const accentBg =
      type === 'web' ? 'bg-[#E8F0FE]' : type === 'mentis' ? 'bg-[#FEF7E0]' : 'bg-[#E6F4EA]'
    const accentText =
      type === 'web' ? 'text-[#1967D2]' : type === 'mentis' ? 'text-[#B06000]' : 'text-[#137333]'
    const icon =
      type === 'web' ? (
        <Globe className="h-4 w-4" />
      ) : type === 'mentis' ? (
        <Brain className="h-4 w-4" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )
    const trackLabel =
      type === 'web' ? 'Web Track' : type === 'mentis' ? 'Mentis Track' : 'Wend Track'
    const targetHref = type === 'wend' ? '/events/wend-game' : `/events/${event.slug}`
    const buttonText = type === 'wend' ? 'Enter Wend Game' : 'Enter Quiz'

    const trackGradient =
      type === 'web'
        ? 'from-[#4285F4] to-[#1A73E8]'
        : type === 'mentis'
        ? 'from-[#FBBC04] via-[#EA4335] to-[#D93025]'
        : 'from-[#34A853] to-[#0F9D58]'

    // Get live question / word count for badge
    const activeQuestionsCount =
      type === 'wend'
        ? api.getWendBoard().targetWords.length
        : api.getQuestionsForSlug(event.slug).length

    const wendLimit = api.getWendBoard().timeLimitSeconds || 120
    const specsBadge =
      type === 'wend'
        ? `${activeQuestionsCount} Target Words • ${wendLimit}s Timer`
        : type === 'mentis'
        ? `${activeQuestionsCount} Questions • 400 Pts`
        : `${activeQuestionsCount} Questions • 30s Each • 400 Pts`

    // Target Admin Panel URL with track pre-selection
    const adminPanelHref =
      type === 'wend'
        ? '/admin-panel/panel?tab=wend'
        : `/admin-panel/panel?tab=quiz&track=${event.slug}`

    const handleCardClick = () => {
      if (isAdmin) {
        router.push(adminPanelHref)
      } else if (isLive) {
        router.push(targetHref)
      } else {
        showToast('This challenge arena is currently locked. Check back soon!')
      }
    }

    return (
      <div
        onClick={handleCardClick}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-[32px] border transition-all duration-300 backdrop-blur-xl p-5 sm:p-7 cursor-pointer ${
          isLive
            ? 'border-white/90 bg-white/95 shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.09)] ring-1 ring-[#34A853]/20'
            : 'border-white/80 bg-white/85 shadow-2xs hover:border-[#DADCE0] hover:shadow-sm'
        } ${isAdmin ? 'hover:border-[#1A73E8]/60 hover:ring-2 hover:ring-[#1A73E8]/20' : ''}`}
        title={isAdmin ? 'Click to open Game in Admin Panel' : isLive ? 'Click to play' : 'Challenge Locked'}
      >
        {/* Top Google Signature Stripe per Track */}
        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${trackGradient}`} />

        <div className="flex flex-col gap-4">
          {/* Header Row: Track Badge + Lock Status */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accentBg} ${accentText}`}
            >
              {icon}
              <span>{trackLabel}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isLive
                  ? 'bg-[#E6F4EA] text-[#137333] border border-[#34A853]/30'
                  : 'bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLive ? 'bg-[#34A853] animate-pulse' : 'bg-[#5F6368]'
                }`}
              />
              <span>{isLive ? 'Live Now' : 'Locked'}</span>
            </span>
          </div>

          {/* Centered Animated Lock Toggle */}
          <div
            onClick={(e) => {
              if (isAdmin) {
                e.stopPropagation()
                toggleEventLock(event, isLive, setEvent)
              }
            }}
            className="my-1 flex justify-center cursor-pointer"
            title={isAdmin ? 'Click lock to toggle live status' : undefined}
          >
            <AnimatedLockToggle
              id={`lock-toggle-${event.slug}`}
              checked={isLive}
              isAdmin={isAdmin}
              disabled={isUpdating}
              onChange={() => toggleEventLock(event, isLive, setEvent)}
              size="lg"
            />
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#202124] group-hover:text-[#1A73E8] transition-colors">
                {event.title}
              </h3>
              {isAdmin && (
                <span className="text-xs font-semibold text-[#1A73E8] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <span>Edit in Panel</span>
                  <ExternalLink className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F6368] leading-relaxed line-clamp-2">
              {event.description}
            </p>
          </div>

          {/* Live Specs Chip */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FA] border border-[#DADCE0] px-3 py-1 text-[11px] font-semibold text-[#5F6368]">
              <Sparkles className="h-3 w-3 text-[#FBBC04]" />
              <span>{specsBadge}</span>
            </span>
          </div>

          {/* Primary Action Button (Enter Challenge) */}
          <div onClick={(e) => e.stopPropagation()} className="pt-1">
            {isLive ? (
              <Link
                href={targetHref}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1E8E3E] to-[#137333] text-sm font-bold text-white shadow-md hover:from-[#187532] hover:to-[#0F5A26] active:scale-[0.98] transition-all"
              >
                <span>{buttonText}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#DADCE0] bg-[#F1F3F4] text-sm font-semibold text-[#80868B] cursor-not-allowed"
              >
                <Lock className="h-4 w-4" />
                <span>Challenge Locked by Host</span>
              </button>
            )}
          </div>

          {/* Host Controls Strip (Admin Only) */}
          {isAdmin && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 pt-3 border-t border-[#F1F3F4] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5F6368] font-bold flex items-center gap-1.5">
                  <Sliders className="h-3 w-3 text-[#1A73E8]" />
                  <span>Host Realtime Controls</span>
                </span>
                <Link
                  href={adminPanelHref}
                  className="text-[11px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
                >
                  <span>Edit in Admin Panel</span>
                  <span>➔</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => toggleEventLock(event, isLive, setEvent)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                    isLive
                      ? 'border-[#EA4335]/30 bg-[#FCE8E6] text-[#C5221F] hover:bg-[#FAD2CF]'
                      : 'border-[#34A853]/30 bg-[#E6F4EA] text-[#137333] hover:bg-[#CEEAD6]'
                  }`}
                >
                  {isLive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{isLive ? 'Lock Track' : 'Unlock Track'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerWinnerCeremony(event.slug, event.title)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#FEF7E0] border border-[#FBBC04]/50 py-2 px-3 text-xs font-bold text-[#B06000] hover:bg-[#FEEFC3] active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                  <span>Announce Ceremony</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#137333] text-white px-4 py-2 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[19px] font-bold tracking-tight text-[#202124]">
            Games & Live Arenas
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#1967D2] shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E8] animate-pulse" />
          Ready to Play
        </span>
      </div>

      {/* Top Div: Web Quiz Track */}
      {renderQuizCard(webEvent, isWebLive, setWebEvent, 'web')}

      {/* Middle Div: Wend Word Puzzle Track */}
      {renderQuizCard(wendEvent, isWendLive, setWendEvent, 'wend')}

      {/* Bottom Div: Mentis Quiz Track */}
      {renderQuizCard(mentisEvent, isMentisLive, setMentisEvent, 'mentis')}
    </div>
  )
}
