'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
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
import { soundManager } from '@/lib/sound'
import {
  Lock,
  Unlock,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Trophy,
  Maximize2,
  Trash2,
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
  wendEvent?: GdgEvent
  onStatusChange?: (eventId: string, newStatus: 'LIVE' | 'UPCOMING') => void
}

export function DualQuizSection({
  webEvent: initialWeb,
  mentisEvent: initialMentis,
  wendEvent: initialWend,
  onStatusChange,
}: DualQuizSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { gameLockStates, sendLockToggle, sendWinnerCeremonyStart, sendDeleteLeaderboardEntry, liveLeaderboards } = useWebSocket()
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'LIVE' | 'UPCOMING'>>({})

  const webEvent = {
    ...initialWeb,
    ...(statusOverrides[initialWeb._id] ? { status: statusOverrides[initialWeb._id] } : {}),
  }
  const mentisEvent = {
    ...initialMentis,
    ...(statusOverrides[initialMentis._id] ? { status: statusOverrides[initialMentis._id] } : {}),
  }
  const defaultWendId = initialWend?._id || DEFAULT_WEND_EVENT._id
  const wendEvent = {
    ...(initialWend || DEFAULT_WEND_EVENT),
    ...(statusOverrides[defaultWendId] ? { status: statusOverrides[defaultWendId] } : {}),
  }
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

  const mounted = useMounted()
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let active = true
    void Promise.all([
      api.fetchQuestions(webEvent.slug),
      api.fetchQuestions(mentisEvent.slug),
      api.fetchWendBoard(),
    ]).then(([webQ, mentisQ, wendB]) => {
      if (active) {
        setQuestionCounts({
          [webEvent.slug]: webQ?.length || 0,
          [mentisEvent.slug]: mentisQ?.length || 0,
          'wend-game': wendB?.targetWords?.length || 0,
        })
      }
    })
    return () => {
      active = false
    }
  }, [webEvent.slug, mentisEvent.slug])

  const isAuthed = mounted && Boolean(user)
  const isAdmin = mounted && user?.role === 'ADMIN'

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
    isCurrentlyLive: boolean
  ) => {
    if (!isAdmin) return
    const newStatus: 'LIVE' | 'UPCOMING' = isCurrentlyLive ? 'UPCOMING' : 'LIVE'
    const isLocked = newStatus !== 'LIVE'

    setUpdatingId(targetEvent._id)
    try {
      sendLockToggle(targetEvent.slug, isLocked, newStatus)
      await api.updateEventStatus(targetEvent._id, newStatus)
      setStatusOverrides((prev) => ({ ...prev, [targetEvent._id]: newStatus }))
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
    type: 'web' | 'mentis' | 'wend'
  ) => {
    const isUpdating = updatingId === event._id

    // Track-specific metadata
    const isWeb = type === 'web'
    const isMentis = type === 'mentis'

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

    // Live question / word count strictly based on user-created content
    const activeQuestionsCount =
      type === 'wend'
        ? (questionCounts['wend-game'] ?? (mounted ? api.getWendBoard().targetWords.length : 0))
        : (questionCounts[event.slug] ?? (mounted ? api.getQuestionsForSlug(event.slug).length : 0))

    const wendLimit = api.getWendBoard().timeLimitSeconds || 120
    const specsBadge =
      type === 'wend'
        ? (activeQuestionsCount > 0 ? `${activeQuestionsCount} Target Words • ${wendLimit}s Timer` : 'Setup in Admin')
        : activeQuestionsCount > 0
        ? `${activeQuestionsCount} Questions • 30s Each • ${activeQuestionsCount * 100} Pts`
        : 'No Questions Published Yet'

    // Target Admin Panel URL with track deep-link
    const adminPanelHref =
      type === 'wend'
        ? '/admin-panel/panel?tab=wend'
        : `/admin-panel/panel?tab=quiz&track=${event.slug}`

    const handleCardClick = () => {
      if (!isAuthed) {
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

    const enterHref = isAuthed ? targetHref : `/login?redirect=${encodeURIComponent(targetHref)}`
    const trackIndex = isWeb ? '01' : isMentis ? '02' : '03'
    const accentDot = isWeb ? 'bg-[#1A73E8]' : isMentis ? 'bg-[#FBBC04]' : 'bg-[#34A853]'

    return (
      <div
        onClick={handleCardClick}
        className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 p-6 sm:p-7 cursor-pointer bg-white ${
          isLive
            ? 'border-[#E5E7EB] hover:border-[#111827] hover:shadow-[0_16px_40px_rgba(0,0,0,0.04)]'
            : 'border-[#E5E7EB] hover:border-[#9CA3AF]'
        } ${isAdmin ? 'hover:ring-1 hover:ring-[#111827]' : ''}`}
        title={isAdmin ? 'Click to open Game in Admin Panel' : isLive ? 'Click to play' : 'Challenge Locked'}
      >
        <div className="relative z-10 flex flex-col gap-3">
          {/* Header Row: Editorial Track Marker + Lock Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${accentDot}`} />
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#6B7280] font-medium">
                {`${trackIndex} // ${trackLabel}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Studio Button for Host */}
              {isAdmin && (
                <Link
                  href={adminPanelHref}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#111827] hover:border-[#111827] transition-all"
                  title="Open Game Studio"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                  <span>Studio</span>
                </Link>
              )}

              {/* Minimalist Status Indicator */}
              <div
                onClick={(e) => {
                  if (isAdmin) {
                    e.stopPropagation()
                    toggleEventLock(event, isLive)
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-all ${
                  isAdmin ? 'cursor-pointer hover:border-[#111827]' : ''
                } ${
                  isLive
                    ? 'border-[#34A853]/40 bg-[#F0FDF4] text-[#15803D]'
                    : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'
                }`}
                title={isAdmin ? (isLive ? 'Click to switch to LOCKED' : 'Click to GO LIVE') : isLive ? 'Live Arena' : 'Locked Arena'}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#34A853] animate-pulse' : 'bg-[#9CA3AF]'}`} />
                <span>{isLive ? 'Live' : 'Locked'}</span>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-1 text-left mt-1">
            <h3 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-[#111827] group-hover:text-black transition-colors leading-snug">
              {event.title}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#4B5563] leading-relaxed line-clamp-2 mt-0.5">
              {event.description}
            </p>
          </div>

          {/* Live Specs */}
          <div className="pt-2.5 mt-1 border-t border-[#F3F4F6] flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[#9CA3AF] flex items-center gap-1.5" suppressHydrationWarning>
              <Clock className="h-3 w-3 text-[#9CA3AF]" />
              <span suppressHydrationWarning>{specsBadge}</span>
            </span>
          </div>
        </div>

        {/* Action Controls Deck */}
        <div onClick={(e) => e.stopPropagation()} className="relative z-10 pt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {isLive ? (
              <Link
                href={enterHref}
                onClick={() => {
                  void soundManager.unlock()
                }}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-medium tracking-wide text-white bg-[#111827] hover:bg-black transition-all active:scale-[0.99] shadow-xs cursor-pointer"
              >
                <span suppressHydrationWarning>{isAuthed ? buttonText : `Sign in • ${buttonText}`}</span>
                <ArrowRight className="h-3.5 w-3.5 text-white/80" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF] cursor-not-allowed"
              >
                <Lock className="h-3 w-3" />
                <span>Arena Restricted</span>
              </button>
            )}

            {/* Minimalist Leaderboard Shortcut */}
            <Link
              href={leaderboardHref}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:border-[#111827] transition-all"
              title="View standings"
            >
              <Trophy className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Host Controls Strip (Admin Only) */}
          {isAdmin && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-1 pt-2.5 border-t border-[#F3F4F6] flex items-center gap-2"
            >
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => toggleEventLock(event, isLive)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-all cursor-pointer active:scale-[0.98] ${
                  isLive
                    ? 'border-[#EA4335]/30 bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
                    : 'border-[#34A853]/30 bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]'
                }`}
              >
                {isLive ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span>{isLive ? 'Lock Track' : 'Go Live'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenBroadcastReview(event.slug, event.title)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#FFFBEB] border border-[#FDE68A] py-1.5 px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider text-[#B45309] hover:bg-[#FEF3C7] transition-all cursor-pointer"
                title="Broadcast ceremony"
              >
                <Trophy className="h-3 w-3 text-[#B45309]" />
                <span>Broadcast</span>
              </button>
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#137333] text-white px-4 py-2 text-xs font-semibold shadow-xl border border-white/20 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-extrabold tracking-tight text-[#202124] uppercase font-mono">
            LIVE CHALLENGE ARENAS
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-white border border-[#34A853] px-2.5 py-1 font-mono text-[11px] font-bold text-[#137333] shadow-2xs">
          <span className="h-2 w-2 bg-[#34A853] animate-pulse" />
          <span>REALTIME SYNC</span>
        </span>
      </div>

      {/* Top Div: Web Quiz Track */}
      {renderQuizCard(webEvent, isWebLive, 'web')}

      {/* Middle Div: Wend Word Puzzle Track */}
      {renderQuizCard(wendEvent, isWendLive, 'wend')}

      {/* Bottom Div: Mentis Quiz Track */}
      {renderQuizCard(mentisEvent, isMentisLive, 'mentis')}

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
