'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  GdgEvent,
  api,
  DEFAULT_WEND_EVENT,
  CeremonyWinner,
  LeaderboardEntry,
  RankedParticipant,
} from '@/lib/api'
import { AnimatedLockToggle } from '@/components/ui/AnimatedLockToggle'
import { soundManager } from '@/lib/sound'
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
  Trash2,
  Crown,
  Medal,
  Rocket,
  X,
  UserCheck,
  Zap,
  HelpCircle,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

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
  const { gameLockStates, sendLockToggle, sendWinnerCeremonyStart, sendDeleteLeaderboardEntry, liveLeaderboards } = useWebSocket()
  const [webEvent, setWebEvent] = useState<GdgEvent>(initialWeb)
  const [mentisEvent, setMentisEvent] = useState<GdgEvent>(initialMentis)
  const [wendEvent, setWendEvent] = useState<GdgEvent>(DEFAULT_WEND_EVENT)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Broadcast Winner Review Modal State
  const [selectedBroadcastTrack, setSelectedBroadcastTrack] = useState<{ slug: string; title: string } | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewRankings, setReviewRankings] = useState<{
    winners: CeremonyWinner[]
    rankedStandings: LeaderboardEntry[]
    rankedParticipants: RankedParticipant[]
  }>({ winners: [], rankedStandings: [], rankedParticipants: [] })

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

  const handleOpenBroadcastReview = (slug: string, title: string) => {
    setSelectedBroadcastTrack({ slug, title })
    const extraLive = liveLeaderboards[slug] || []
    const rankings = api.getAutomatedRankings(slug, extraLive)
    setReviewRankings(rankings)
    setIsReviewModalOpen(true)
  }

  const handleDeleteUserFromLeaderboard = (participantId: string, participantName?: string) => {
    if (!selectedBroadcastTrack) return
    api.deleteParticipantFromLeaderboard(selectedBroadcastTrack.slug, participantId, participantName)
    sendDeleteLeaderboardEntry(selectedBroadcastTrack.slug, participantId, participantName)

    const extraLive = (liveLeaderboards[selectedBroadcastTrack.slug] || []).filter((e) => {
      const matchId = (e.user?._id && e.user._id === participantId) || e._id === participantId
      const matchName = participantName && e.user?.name?.toLowerCase() === participantName.toLowerCase()
      return !matchId && !matchName
    })
    const updated = api.getAutomatedRankings(selectedBroadcastTrack.slug, extraLive)
    setReviewRankings(updated)
    showToast(`Removed "${participantName || 'Participant'}" from leaderboard`)
  }

  const handleSimulateTestParticipants = () => {
    if (!selectedBroadcastTrack) return
    api.simulateTieTestSessions(selectedBroadcastTrack.slug)
    const extraLive = liveLeaderboards[selectedBroadcastTrack.slug] || []
    const updated = api.getAutomatedRankings(selectedBroadcastTrack.slug, extraLive)
    setReviewRankings(updated)
    showToast('Loaded demo participants for testing!')
  }

  const handleStartBroadcast = () => {
    if (!selectedBroadcastTrack || reviewRankings.winners.length === 0) return
    sendWinnerCeremonyStart({
      gameSlug: selectedBroadcastTrack.slug,
      gameTitle: selectedBroadcastTrack.title,
      winners: reviewRankings.winners,
      fullLeaderboard: reviewRankings.rankedStandings,
    })
    setIsReviewModalOpen(false)
    showToast(`Broadcast winner ceremony for ${selectedBroadcastTrack.title}!`)
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
                onClick={() => {
                  void soundManager.unlock()
                }}
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
                  onClick={() => handleOpenBroadcastReview(event.slug, event.title)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#FEF7E0] border border-[#FBBC04]/50 py-2.5 px-3 text-xs font-bold text-[#B06000] hover:bg-[#FEEFC3] active:scale-95 transition-all shadow-2xs cursor-pointer"
                  title="Review leaderboard, delete invalid participants, and broadcast winners ceremony"
                >
                  <Trophy className="h-3.5 w-3.5 text-[#FBBC04]" />
                  <span>Broadcast Winner</span>
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

      {/* ======================================================== */}
      {/* BROADCAST WINNER LEADERBOARD AUDIT & CONTROL MODAL       */}
      {/* ======================================================== */}
      {isReviewModalOpen && selectedBroadcastTrack && (
        <div
          onClick={() => setIsReviewModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-[32px] sm:rounded-[36px] border border-white/80 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Top Google 4-Color Stripe */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />

            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3.5 border-b border-[#F1F3F4]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF7E0] border border-[#FBBC04]/40 text-[#B06000] shadow-xs">
                  <Trophy className="h-6 w-6 text-[#FBBC04]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#202124] tracking-tight">
                      Broadcast Winners
                    </h3>
                    <span className="rounded-full bg-[#E8F0FE] text-[#1967D2] px-2.5 py-0.5 text-[10px] font-bold">
                      {selectedBroadcastTrack.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#5F6368] mt-0.5 font-medium">
                    Review standings, delete invalid users, then start the live ceremony broadcast.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#5F6368] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Standings & Controls */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Top 3 Podium Cards */}
              {reviewRankings.winners.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((pos) => {
                    const winner = reviewRankings.winners.find((w) => w.rank === pos)
                    const is1st = pos === 1
                    const is2nd = pos === 2
                    const bgClass = is1st
                      ? 'bg-gradient-to-b from-[#FFFDF5] to-[#FEF7E0] border-[#FBBC04]'
                      : is2nd
                      ? 'bg-gradient-to-b from-white to-[#F8F9FA] border-[#BDC1C6]'
                      : 'bg-gradient-to-b from-white to-[#FFF5EB] border-[#FDBA74]'

                    const badgeClass = is1st
                      ? 'bg-[#FBBC04] text-[#202124]'
                      : is2nd
                      ? 'bg-[#9AA0A6] text-white'
                      : 'bg-[#E37400] text-white'

                    return (
                      <div
                        key={pos}
                        className={`rounded-2xl border-2 p-2.5 text-center flex flex-col items-center justify-between shadow-2xs ${bgClass}`}
                      >
                        <div className="flex flex-col items-center w-full">
                          <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-black shadow-xs mb-1 ${badgeClass}`}>
                            #{pos}
                          </span>
                          {winner ? (
                            <>
                              <img
                                src={winner.avatar}
                                alt={winner.name}
                                className="h-8 w-8 rounded-full object-cover border border-white shadow-2xs mb-1"
                              />
                              <span className="font-bold text-[#202124] text-xs truncate max-w-full">
                                {winner.name}
                              </span>
                              <span className="text-[10px] font-extrabold text-[#1967D2] mt-0.5">
                                {winner.score} pts
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-[#80868B] italic my-2">
                              Awaiting
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Standings Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[#1A73E8]" />
                  <span>Ranked Standings ({reviewRankings.rankedParticipants.length})</span>
                </span>
                {reviewRankings.rankedParticipants.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSimulateTestParticipants}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FE] px-3 py-1 text-[11px] font-bold text-[#1967D2] hover:bg-[#D2E3FC] cursor-pointer"
                  >
                    <Zap className="h-3 w-3" />
                    <span>Load Demo Participants</span>
                  </button>
                )}
              </div>

              {/* Standings List with Admin Delete */}
              {reviewRankings.rankedParticipants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DADCE0] p-6 text-center text-xs text-[#5F6368]">
                  <HelpCircle className="h-7 w-7 text-[#BDC1C6] mx-auto mb-1.5" />
                  <p className="font-bold text-[#202124]">No submissions recorded yet for this challenge.</p>
                  <p className="text-[11px] text-[#5F6368] mt-1 font-medium">
                    Play a round or click &quot;Load Demo Participants&quot; to test.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {reviewRankings.rankedParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-[#DADCE0] bg-white hover:border-[#BDC1C6] transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F3F4] text-[10px] font-black text-[#5F6368]">
                          #{p.rank}
                        </span>
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#DADCE0]"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[#202124] truncate text-xs">{p.name}</p>
                          <p className="text-[10px] text-[#5F6368] flex items-center gap-1.5">
                            <span className="text-[#1967D2] font-semibold">{p.score} pts</span>
                            <span>•</span>
                            <span className="text-[#137333] font-semibold">{formatDuration(p.durationMs)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Admin Delete Action */}
                      <button
                        type="button"
                        onClick={() => handleDeleteUserFromLeaderboard(p.id, p.name)}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#EA4335] hover:bg-[#FCE8E6] transition-colors cursor-pointer shrink-0"
                        title={`Remove ${p.name} from standings`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions Deck: Start Broadcast Button */}
            <div className="p-4 border-t border-[#F1F3F4] bg-[#F8F9FA]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href={`/admin-panel/panel?tab=winners&track=${selectedBroadcastTrack.slug}`}
                onClick={() => setIsReviewModalOpen(false)}
                className="text-[11px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1 order-2 sm:order-1"
              >
                <span>Full Studio in Admin Panel</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              <button
                type="button"
                disabled={reviewRankings.winners.length === 0}
                onClick={handleStartBroadcast}
                className={`flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-6 text-xs sm:text-sm font-extrabold text-white shadow-md transition-all active:scale-95 cursor-pointer order-1 sm:order-2 ${
                  reviewRankings.winners.length === 0
                    ? 'bg-[#BDC1C6] cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-[#1A73E8] via-[#1557B0] to-[#0D47A1] hover:brightness-105 shadow-[#1A73E8]/30 ring-4 ring-[#1A73E8]/20'
                }`}
              >
                <Rocket className="h-4 w-4" />
                <span>Start Broadcast ({reviewRankings.winners.length} Winners Ready)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
