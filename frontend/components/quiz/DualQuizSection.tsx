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
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(targetHref)}`)
        return
      }
      if (isAdmin) {
        router.push(adminPanelHref)
      } else if (isLive) {
        router.push(targetHref)
      } else {
        showToast('This challenge arena is currently locked. Check back soon!')
      }
    }

    const enterHref = user ? targetHref : `/login?redirect=${encodeURIComponent(targetHref)}`

    return (
      <div
        onClick={handleCardClick}
        className={`group relative flex flex-col justify-between overflow-hidden border transition-all duration-300 p-6 sm:p-7 cursor-pointer bg-white ${
          isLive
            ? 'border-[#34A853] shadow-xs hover:shadow-md hover:border-[#1A73E8]'
            : 'border-[#DADCE0] hover:border-[#1A73E8] hover:shadow-xs'
        } ${isAdmin ? 'hover:ring-1 hover:ring-[#1A73E8]' : ''}`}
        title={isAdmin ? 'Click to open Game in Admin Panel' : isLive ? 'Click to play' : 'Challenge Locked'}
      >
        {/* ======================================================== */}
        {/* AESTHETIC CSS BACKGROUND ANIMATION: AMBIENT AURORA & GRID */}
        {/* ======================================================== */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden -z-0">
          <div className={`absolute -top-16 -right-16 h-56 w-56 blur-3xl opacity-20 transition-colors duration-700 ${meshOrb1}`} />
          <div className={`absolute top-1/2 -left-16 h-52 w-52 blur-3xl opacity-20 transition-colors duration-700 ${meshOrb2}`} />
          <div className={`absolute -bottom-16 right-1/4 h-48 w-48 blur-3xl opacity-15 transition-colors duration-700 ${meshOrb3}`} />
          <div className="absolute inset-0 bg-tech-grid opacity-30" />
        </div>

        {/* Top Sharp Google Accent Line */}
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${trackRibbonGradient}`} />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header Row: Track Badge + Studio Button (Admin) + Live Status */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-xs font-bold tracking-wider ${accentBg}`}
            >
              {icon}
              <span>{trackLabel.toUpperCase()}</span>
            </span>

            <div className="flex items-center gap-1.5">
              {/* Dedicated Studio Button for Host/Admin */}
              {isAdmin && (
                <Link
                  href={adminPanelHref}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 border border-[#1A73E8] bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-[#1967D2] shadow-2xs hover:bg-[#1A73E8] hover:text-white transition-all cursor-pointer"
                  title="Open Full Game Studio in Admin Command Center"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>STUDIO</span>
                </Link>
              )}

              {/* Live Now / Locked Pill Indicator */}
              <span
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                  isLive
                    ? 'bg-[#E6F4EA] text-[#137333] border-[#34A853]'
                    : 'bg-[#F1F3F4] text-[#5F6368] border-[#DADCE0]'
                }`}
              >
                {isLive ? (
                  <>
                    <span className="h-2 w-2 bg-[#34A853] animate-pulse" />
                    <span>LIVE NOW</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 text-[#5F6368]" />
                    <span>LOCKED</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Centered Structured Geometric Status Block */}
          <div className="my-1 flex items-center justify-between border border-[#DADCE0] bg-[#F8F9FA] p-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center border font-mono ${
                isLive
                  ? 'border-[#34A853] bg-[#1E8E3E] text-white'
                  : 'border-[#EA4335] bg-[#D93025] text-white'
              }`}>
                {isLive ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5F6368]">
                  {isLive ? 'ARENA STATUS: LIVE & READY' : 'ARENA STATUS: LOCKED'}
                </p>
                <p className="text-xs font-bold text-[#202124]">
                  {isLive ? 'Tap button below to enter battle' : 'Locked by chapter hosts'}
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleEventLock(event, isLive, setEvent)
                }}
                className={`px-3 py-1 font-mono text-xs font-bold border transition-all cursor-pointer ${
                  isLive
                    ? 'border-[#EA4335] bg-white text-[#EA4335] hover:bg-[#EA4335] hover:text-white'
                    : 'border-[#34A853] bg-white text-[#34A853] hover:bg-[#34A853] hover:text-white'
                }`}
              >
                {isLive ? 'LOCK' : 'GO LIVE'}
              </button>
            )}
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-lg sm:text-xl font-extrabold text-[#202124] tracking-tight group-hover:text-[#1A73E8] transition-colors leading-snug">
                {event.title}
              </h3>
              {isAdmin && (
                <span className="font-mono text-[11px] font-bold text-[#1A73E8] flex items-center gap-1 shrink-0">
                  <span>EDIT</span>
                  <ExternalLink className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F6368] leading-relaxed line-clamp-2">
              {event.description}
            </p>
          </div>

          {/* Live Specs Structured Chip */}
          <div className="flex items-center justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1 font-mono text-[11px] font-bold text-[#3C4043]">
              <Sparkles className="h-3 w-3 text-[#FBBC04]" />
              <span>{specsBadge}</span>
            </span>
          </div>

          {/* Primary Action Button Deck (Enter Game + Leaderboard Podium Shortcut) */}
          <div onClick={(e) => e.stopPropagation()} className="pt-2 flex items-center gap-2">
            {isLive ? (
              <Link
                href={enterHref}
                onClick={() => {
                  void soundManager.unlock()
                }}
                className={`relative flex h-12 flex-1 items-center justify-center gap-2 font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white border transition-all active:translate-y-0.5 shadow-xs overflow-hidden ${
                  isWeb
                    ? 'border-[#1765CC] bg-[#1A73E8] hover:bg-[#1557B0]'
                    : isMentis
                    ? 'border-[#B06000] bg-[#EA4335] hover:bg-[#D93025]'
                    : 'border-[#137333] bg-[#1E8E3E] hover:bg-[#137333]'
                }`}
              >
                <span>{user ? buttonText : `SIGN IN TO PLAY • ${buttonText}`}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-12 flex-1 items-center justify-center gap-2 border border-[#DADCE0] bg-[#F1F3F4] font-mono text-xs font-bold uppercase tracking-wider text-[#80868B] cursor-not-allowed"
              >
                <Lock className="h-4 w-4" />
                <span>CHALLENGE LOCKED BY HOST</span>
              </button>
            )}

            {/* Golden Trophy Leaderboard Podium Shortcut */}
            <Link
              href={leaderboardHref}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center border border-[#FBBC04] bg-[#FEF7E0] text-[#B06000] hover:bg-[#FBBC04] hover:text-[#202124] transition-all shadow-xs"
              title="View live standings & victory podium"
            >
              <Trophy className="h-5 w-5 text-[#FBBC04] drop-shadow-sm" />
            </Link>
          </div>

          {/* Host Controls Strip (Admin Only) */}
          {isAdmin && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 pt-3 border-t border-[#DADCE0] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#3C4043] font-mono font-bold flex items-center gap-1.5 uppercase text-[11px]">
                  <Sliders className="h-3 w-3 text-[#1A73E8]" />
                  <span>Host Realtime Controls</span>
                </span>
                <Link
                  href={adminPanelHref}
                  className="font-mono text-[11px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>Studio</span>
                  <span>➔</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => toggleEventLock(event, isLive, setEvent)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer active:translate-y-0.5 shadow-2xs ${
                    isLive
                      ? 'border-[#B31412] bg-[#FCE8E6] text-[#C5221F] hover:bg-[#FAD2CF]'
                      : 'border-[#137333] bg-[#E6F4EA] text-[#137333] hover:bg-[#CEEAD6]'
                  }`}
                >
                  {isLive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{isLive ? 'Lock Track' : 'Unlock Track'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenBroadcastReview(event.slug, event.title)}
                  className="flex items-center justify-center gap-1.5 bg-[#FEF7E0] border border-[#FBBC04] py-2 px-3 font-mono text-xs font-bold text-[#B06000] uppercase tracking-wider hover:bg-[#FBBC04] hover:text-[#202124] active:translate-y-0.5 transition-all shadow-2xs cursor-pointer"
                  title="Review leaderboard and broadcast ceremony"
                >
                  <Trophy className="h-3.5 w-3.5 text-[#FBBC04]" />
                  <span>Broadcast</span>
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
          <div className="flex h-8 w-8 items-center justify-center bg-white shadow-2xs border border-[#DADCE0]">
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 bg-[#4285F4]" />
              <span className="h-1.5 w-1.5 bg-[#EA4335]" />
              <span className="h-1.5 w-1.5 bg-[#FBBC04]" />
              <span className="h-1.5 w-1.5 bg-[#34A853]" />
            </span>
          </div>
          <h2 className="text-[19px] font-extrabold tracking-tight text-[#202124] uppercase font-mono">
            LIVE CHALLENGE ARENAS
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-white border border-[#34A853] px-2.5 py-1 font-mono text-[11px] font-bold text-[#137333] shadow-2xs">
          <span className="h-2 w-2 bg-[#34A853] animate-pulse" />
          <span>REALTIME SYNC</span>
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
