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
  Trophy,
  Maximize2,
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

    // Track-specific Google Aesthetic Palette & Mesh Colors
    const isWeb = type === 'web'
    const isMentis = type === 'mentis'

    const accentBg = isWeb
      ? 'bg-[#E8F0FE]/90 text-[#1967D2] border border-[#1A73E8]/20'
      : isMentis
      ? 'bg-[#FEF7E0]/90 text-[#B06000] border border-[#FBBC04]/30'
      : 'bg-[#E6F4EA]/90 text-[#137333] border border-[#34A853]/25'

    const icon = isWeb ? (
      <Globe className="h-4 w-4 text-[#1A73E8]" />
    ) : isMentis ? (
      <Brain className="h-4 w-4 text-[#EA4335]" />
    ) : (
      <Sparkles className="h-4 w-4 text-[#34A853]" />
    )

    const trackLabel = isWeb ? 'Web Track' : isMentis ? 'Mentis Track' : 'Wend Track'
    const targetHref = type === 'wend' ? '/events/wend-game' : `/events/${event.slug}`
    const leaderboardHref =
      type === 'wend'
        ? '/events/wend-game/leaderboard'
        : `/events/${event.slug}/leaderboard`

    const buttonText = isWeb
      ? 'Enter Web Dev Sprint'
      : isMentis
      ? 'Enter Mentis Challenge'
      : 'Enter Wend Game Arena'

    // Multi-color signature ribbon gradient
    const trackRibbonGradient = isWeb
      ? 'from-[#4285F4] via-[#00D2FF] to-[#1A73E8]'
      : isMentis
      ? 'from-[#FBBC04] via-[#EA4335] to-[#D93025]'
      : 'from-[#34A853] via-[#10B981] to-[#0F9D58]'

    // Living background mesh orbs (continuous organic CSS animations)
    const meshOrb1 = isWeb
      ? 'bg-[#4285F4]/20 animate-mesh-1'
      : isMentis
      ? 'bg-[#FBBC04]/22 animate-mesh-1'
      : 'bg-[#34A853]/20 animate-mesh-1'

    const meshOrb2 = isWeb
      ? 'bg-[#00D2FF]/15 animate-mesh-2'
      : isMentis
      ? 'bg-[#EA4335]/15 animate-mesh-2'
      : 'bg-[#10B981]/15 animate-mesh-2'

    const meshOrb3 = isWeb
      ? 'bg-[#818CF8]/15 animate-mesh-3'
      : isMentis
      ? 'bg-[#F97316]/15 animate-mesh-3'
      : 'bg-[#06B6D4]/15 animate-mesh-3'

    const cardHoverGlow = isWeb
      ? 'hover:shadow-[0_24px_55px_-12px_rgba(66,133,244,0.22)] hover:border-[#4285F4]/40'
      : isMentis
      ? 'hover:shadow-[0_24px_55px_-12px_rgba(251,188,4,0.25)] hover:border-[#FBBC04]/40'
      : 'hover:shadow-[0_24px_55px_-12px_rgba(52,168,83,0.22)] hover:border-[#34A853]/40'

    const btnGradient = isWeb
      ? 'from-[#1A73E8] via-[#1765CC] to-[#1557B0]'
      : isMentis
      ? 'from-[#EA4335] via-[#D93025] to-[#B06000]'
      : 'from-[#1E8E3E] via-[#34A853] to-[#137333]'

    const btnShadow = isWeb
      ? 'shadow-[#1A73E8]/25 hover:shadow-[#1A73E8]/40'
      : isMentis
      ? 'shadow-[#EA4335]/25 hover:shadow-[#EA4335]/40'
      : 'shadow-[#34A853]/25 hover:shadow-[#34A853]/40'

    // Live question / word count for specs chip
    const activeQuestionsCount =
      type === 'wend'
        ? api.getWendBoard().targetWords.length
        : api.getQuestionsForSlug(event.slug).length

    const wendLimit = api.getWendBoard().timeLimitSeconds || 120
    const specsBadge =
      type === 'wend'
        ? `${activeQuestionsCount} Target Words • ${wendLimit}s Round Timer`
        : isMentis
        ? `${activeQuestionsCount} Logic & AI Questions • 400 Pts`
        : `${activeQuestionsCount} Frontend Questions • 30s Each • 400 Pts`

    // Target Admin Panel URL with track deep-link
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
        className={`group relative flex flex-col justify-between overflow-hidden rounded-[34px] sm:rounded-[38px] border transition-all duration-500 backdrop-blur-2xl p-6 sm:p-7 cursor-pointer ${
          isLive
            ? 'border-white/90 bg-white/85 shadow-[0_16px_40px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-1.5 ' +
              cardHoverGlow
            : 'border-white/70 bg-white/75 shadow-xs hover:border-[#DADCE0] hover:shadow-md'
        } ${isAdmin ? 'hover:ring-2 hover:ring-[#1A73E8]/30' : ''}`}
        title={isAdmin ? 'Click to open Game in Admin Panel' : isLive ? 'Click to play' : 'Challenge Locked'}
      >
        {/* ======================================================== */}
        {/* BACKGROUND ANIMATIONS: LIVING MULTI-ORB AURORA & GRID   */}
        {/* ======================================================== */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[34px] sm:rounded-[38px] -z-0">
          {/* Animated floating color orbs */}
          <div className={`absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-35 transition-colors duration-700 ${meshOrb1}`} />
          <div className={`absolute top-1/2 -left-16 h-52 w-52 rounded-full blur-3xl opacity-30 transition-colors duration-700 ${meshOrb2}`} />
          <div className={`absolute -bottom-16 right-1/4 h-48 w-48 rounded-full blur-3xl opacity-25 transition-colors duration-700 ${meshOrb3}`} />

          {/* Subtle Google Developer Grid pattern */}
          <div className="absolute inset-0 bg-google-grid opacity-25" />

          {/* Diagonal Glass Sheen Sweep on hover */}
          <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/25 to-transparent -rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
        </div>

        {/* Top Google Signature Stripe per Track */}
        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${trackRibbonGradient}`} />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header Row: Track Badge + Full Studio Button (Admin) + Interactive Lock Status Switch */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-2xs backdrop-blur-md transition-all ${accentBg}`}
            >
              {icon}
              <span>{trackLabel}</span>
            </span>

            <div className="flex items-center gap-2">
              {/* Dedicated Full Studio Button for Host/Admin */}
              {isAdmin && (
                <Link
                  href={adminPanelHref}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#1A73E8]/40 bg-white/95 px-3 py-1 text-xs font-bold text-[#1967D2] shadow-xs hover:bg-[#E8F0FE] hover:border-[#1A73E8] hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
                  title="Open Full Game Studio in Admin Command Center"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-[#1967D2]" />
                  <span>Studio</span>
                </Link>
              )}

              {/* Live Now / Locked Pill Indicator */}
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-2xs backdrop-blur-md transition-all ${
                  isLive
                    ? 'bg-[#E6F4EA]/90 text-[#137333] border border-[#34A853]/40'
                    : 'bg-[#F1F3F4]/90 text-[#5F6368] border border-[#DADCE0]'
                }`}
              >
                {isLive ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34A853] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34A853]" />
                    </span>
                    <span>Live Now</span>
                    <span className="ml-0.5 inline-flex h-4 w-7 items-center rounded-full bg-[#34A853] px-0.5 transition-colors">
                      <span className="h-3 w-3 translate-x-3 rounded-full bg-white shadow-xs transition-transform" />
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 text-[#5F6368]" />
                    <span>Locked</span>
                    <span className="ml-0.5 inline-flex h-4 w-7 items-center rounded-full bg-[#BDC1C6] px-0.5 transition-colors">
                      <span className="h-3 w-3 translate-x-0 rounded-full bg-white shadow-xs transition-transform" />
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Centered Animated Lock Toggle with Glowing Halo & Concentric Waves */}
          <div className="relative my-2 flex items-center justify-center select-none">
            {/* Ambient dynamic radial halo behind lock */}
            <div
              className={`absolute h-36 w-36 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
                isLive
                  ? 'bg-gradient-to-tr from-[#34A853]/30 via-[#4285F4]/25 to-[#34A853]/30 animate-glow-pulse'
                  : 'bg-gradient-to-tr from-[#EA4335]/25 via-[#FBBC04]/20 to-[#EA4335]/25 animate-glow-pulse'
              }`}
            />

            {/* Concentric radar wave rings */}
            <div
              className={`absolute h-28 w-28 rounded-full border border-dashed pointer-events-none animate-ripple-1 ${
                isLive ? 'border-[#34A853]/30' : 'border-[#EA4335]/25'
              }`}
            />
            <div
              className={`absolute h-32 w-32 rounded-full border pointer-events-none animate-ripple-2 ${
                isLive ? 'border-[#4285F4]/20' : 'border-[#FBBC04]/20'
              }`}
            />

            {/* Frosted circular pedestal for the lock */}
            <div
              onClick={(e) => {
                if (isAdmin) {
                  e.stopPropagation()
                  toggleEventLock(event, isLive, setEvent)
                }
              }}
              className="relative flex items-center justify-center rounded-full p-2.5 bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-6 ring-white/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-1.5 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="text-xl sm:text-2xl font-black text-[#1F1F1F] tracking-tight group-hover:text-[#1A73E8] transition-colors leading-snug">
                {event.title}
              </h3>
              {isAdmin && (
                <span className="text-[11px] font-bold text-[#1A73E8] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center sm:justify-end gap-1 shrink-0">
                  <span>Edit in Panel</span>
                  <ExternalLink className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] text-[#5F6368] leading-relaxed line-clamp-2 max-w-sm">
              {event.description}
            </p>
          </div>

          {/* Live Specs Frosted Capsule */}
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3.5 py-1 text-[11px] font-bold text-[#3C4043] shadow-2xs backdrop-blur-md">
              <span className="flex items-center gap-1 mr-0.5" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
              </span>
              <span>{specsBadge}</span>
            </span>
          </div>

          {/* Primary Action Button Deck (Enter Game + Leaderboard Podium Shortcut) */}
          <div onClick={(e) => e.stopPropagation()} className="pt-2 flex items-center gap-2.5">
            {isLive ? (
              <Link
                href={targetHref}
                className={`relative flex h-13 sm:h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl sm:rounded-[22px] bg-gradient-to-r ${btnGradient} text-sm sm:text-base font-extrabold text-white shadow-lg ${btnShadow} hover:brightness-105 active:scale-[0.98] transition-all overflow-hidden group/btn`}
              >
                {/* Button top gloss highlight */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                <span>{buttonText}</span>
                <ArrowRight className="h-4 w-4 sm:h-4.5 sm:w-4.5 group-hover/btn:translate-x-1.5 transition-transform" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-13 sm:h-14 flex-1 items-center justify-center gap-2 rounded-2xl sm:rounded-[22px] border border-[#DADCE0] bg-[#F1F3F4]/90 text-xs sm:text-sm font-bold text-[#80868B] cursor-not-allowed shadow-2xs backdrop-blur-md"
              >
                <Lock className="h-4 w-4" />
                <span>Challenge Locked by Host</span>
              </button>
            )}

            {/* Golden Trophy Leaderboard Podium Shortcut */}
            <Link
              href={leaderboardHref}
              className="relative flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl sm:rounded-[22px] border border-[#FBBC04]/50 bg-gradient-to-b from-[#FFFDF5] to-[#FEF7E0] text-[#B06000] hover:bg-[#FEF0C7] hover:border-[#FBBC04] hover:scale-105 active:scale-95 transition-all shadow-xs group/trophy"
              title="View live standings & victory podium"
            >
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-[#FBBC04] drop-shadow-sm group-hover/trophy:scale-110 group-hover/trophy:rotate-6 transition-transform" />
            </Link>
          </div>

          {/* Host Controls Strip (Admin Only) */}
          {isAdmin && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 pt-3.5 border-t border-[#DADCE0]/60 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#3C4043] font-bold flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#1A73E8]" />
                  <span>Host Realtime Controls</span>
                </span>
                <Link
                  href={adminPanelHref}
                  className="text-[11px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1.5 group/link"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>Open Full Studio</span>
                  <span className="group-hover/link:translate-x-0.5 transition-transform">➔</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => toggleEventLock(event, isLive, setEvent)}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-2xs ${
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
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#FEF7E0] border border-[#FBBC04]/50 py-2.5 px-3 text-xs font-bold text-[#B06000] hover:bg-[#FEEFC3] active:scale-95 transition-all shadow-2xs cursor-pointer"
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
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto relative">
      {/* Background Living Ambient Glow Mesh for the Games Section */}
      <div className="pointer-events-none absolute -inset-6 -z-10 overflow-hidden rounded-[48px] opacity-70">
        <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-[#4285F4]/15 blur-3xl animate-mesh-1" />
        <div className="absolute top-1/3 -right-12 h-64 w-64 rounded-full bg-[#34A853]/15 blur-3xl animate-mesh-2" />
        <div className="absolute -bottom-12 left-1/4 h-64 w-64 rounded-full bg-[#FBBC04]/15 blur-3xl animate-mesh-3" />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#137333] text-white px-4 py-2 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-2xs border border-white/80">
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
            </span>
          </div>
          <h2 className="text-[20px] font-black tracking-tight text-[#202124]">
            Games & Live Arenas
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-white/90 px-3 py-1 text-[11px] font-bold text-[#1967D2] shadow-2xs backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-[#34A853] animate-ping" />
          <span>Ready to Play</span>
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
