'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { GdgEvent, api, DEFAULT_WEND_EVENT } from '@/lib/api'
import { LockedIllustration, UnlockedIllustration } from '@/components/ui/LockIllustrations'
import { AnimatedLockToggle } from '@/components/ui/AnimatedLockToggle'
import {
  Trophy,
  Globe,
  Brain,
  Lock,
  Unlock,
  ArrowRight,
  Play,
  Award,
  Sparkles,
  Edit2,
  Check,
  X,
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
  const { gameLockStates, sendLockToggle, sendCountdownStart, sendWinnerCeremonyStart } = useWebSocket()
  const [webEvent, setWebEvent] = useState<GdgEvent>(initialWeb)
  const [mentisEvent, setMentisEvent] = useState<GdgEvent>(initialMentis)
  const [wendEvent, setWendEvent] = useState<GdgEvent>(DEFAULT_WEND_EVENT)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Click-on-div editing state for admin
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editDescription, setEditDescription] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState<boolean>(false)

  const isAdmin = user?.role === 'ADMIN'

  const handleStartEdit = (event: GdgEvent) => {
    setEditingEventId(event._id)
    setEditTitle(event.title)
    setEditDescription(event.description || '')
  }

  const handleSaveEdit = async (
    event: GdgEvent,
    setEvent: React.Dispatch<React.SetStateAction<GdgEvent>>
  ) => {
    if (!editTitle.trim()) return
    setSavingEdit(true)
    try {
      await api.updateEventDetails(event._id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      })
      setEvent((prev) => ({
        ...prev,
        title: editTitle.trim(),
        description: editDescription.trim(),
      }))
      setEditingEventId(null)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
  }

  // Derive real-time lock status from WebSocket or event model
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
    event: GdgEvent,
    isCurrentlyLive: boolean,
    setEvent: React.Dispatch<React.SetStateAction<GdgEvent>>
  ) => {
    const newStatus = isCurrentlyLive ? 'UPCOMING' : 'LIVE'
    const isLocked = newStatus !== 'LIVE'
    setUpdatingId(event._id)
    try {
      // 1. WebSocket real-time broadcast
      sendLockToggle(event.slug, isLocked, newStatus)
      // 2. Persist to API
      await api.updateEventStatus(event._id, newStatus)
      setEvent({ ...event, status: newStatus })
      if (onStatusChange) onStatusChange(event._id, newStatus)
    } finally {
      setUpdatingId(null)
    }
  }

  const triggerWinnerCeremony = (slug: string, title: string) => {
    const { winners, rankedStandings } = api.getAutomatedRankings(slug)
    if (!winners || winners.length === 0) {
      alert(`No participant attempts recorded yet for "${title}". Play a challenge or check the Admin portal to simulate test submissions!`)
      return
    }

    sendWinnerCeremonyStart({
      gameSlug: slug,
      gameTitle: title,
      winners,
      fullLeaderboard: rankedStandings,
    })
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
        <Globe className="h-5 w-5" />
      ) : type === 'mentis' ? (
        <Brain className="h-5 w-5" />
      ) : (
        <Sparkles className="h-5 w-5" />
      )
    const trackLabel =
      type === 'web' ? 'Web Track' : type === 'mentis' ? 'Mentis Track' : 'Wend Track'
    const targetHref = type === 'wend' ? '/events/wend-game' : `/events/${event.slug}`
    const buttonText = type === 'wend' ? 'Enter Wend Game' : 'Enter Quiz'

    return (
      <div
        onClick={() => {
          if (isAdmin && editingEventId !== event._id) {
            handleStartEdit(event)
          }
        }}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-[30px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
          isAdmin && editingEventId !== event._id
            ? 'cursor-pointer hover:border-[#1A73E8]/50 ring-offset-2'
            : ''
        } ${
          isLive
            ? 'border-[#34A853]/40 bg-white shadow-sm ring-1 ring-[#34A853]/20'
            : 'border-[#DADCE0] bg-white shadow-2xs hover:border-[#BDC1C6]'
        } p-6`}
        title={isAdmin && editingEventId !== event._id ? 'Click on div to edit title & description' : undefined}
      >
        {/* Top Header: Track Pill & Live/Lock Badge */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold ${accentBg} ${accentText} shadow-2xs`}>
            {icon}
            <span>{trackLabel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation()
                if (isAdmin) toggleEventLock(event, isLive, setEvent)
              }}
              title={isAdmin ? (isLive ? 'Click to switch to LOCKED' : 'Click to switch to UNLOCKED') : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold shadow-2xs transition-all ${
                isAdmin ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
              } ${
                isLive
                  ? 'bg-[#E6F4EA] border border-[#34A853]/30 text-[#137333] animate-badge-glow'
                  : 'bg-[#F1F3F4] text-[#5F6368]'
              }`}
            >
              {isLive ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#34A853] animate-ping" />
                  <span>Live Now</span>
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  <span>Locked</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Center Illustration: Clickable Lock/Unlock Toggle for Admin */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div
            onClick={(e) => {
              if (isAdmin) {
                e.stopPropagation()
                toggleEventLock(event, isLive, setEvent)
              }
            }}
            className={`${isLive ? 'animate-float' : ''} ${
              isAdmin ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
            }`}
            title={isAdmin ? (isLive ? 'Click padlock to switch to LOCKED' : 'Click padlock to switch to UNLOCKED') : undefined}
          >
            <AnimatedLockToggle
              id={`lock-toggle-${event.slug}`}
              checked={isLive}
              isAdmin={isAdmin}
              disabled={isUpdating}
              onChange={() => toggleEventLock(event, isLive, setEvent)}
              size="md"
              title={isAdmin ? (isLive ? 'Click lock to switch to LOCKED' : 'Click lock to switch to UNLOCKED') : (isLive ? 'Track is Live' : 'Track is Locked')}
            />
          </div>

          {/* Div Content: Click to Edit if Admin */}
          {editingEventId === event._id ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 w-full rounded-2xl border border-[#1A73E8]/40 bg-[#F8F9FA] p-3.5 shadow-sm text-left animate-in zoom-in-95"
            >
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#DADCE0]">
                <span className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1">
                  <Edit2 className="h-3 w-3" />
                  Edit Div Content
                </span>
                <span className="text-[10px] font-semibold text-[#5F6368]">Admin Mode</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#5F6368] mb-0.5">Track Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#DADCE0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                    placeholder="Event title"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#5F6368] mb-0.5">Description</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#DADCE0] bg-white p-2 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                    placeholder="Event description"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelEdit()
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-[11px] font-medium text-[#5F6368] hover:bg-[#F1F3F4]"
                  >
                    <X className="h-3 w-3" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveEdit(event, setEvent)
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#1765CC]"
                  >
                    <Check className="h-3 w-3" />
                    <span>Save Div</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={(e) => {
                if (isAdmin) {
                  e.stopPropagation()
                  handleStartEdit(event)
                }
              }}
              className={`mt-4 flex flex-col items-center rounded-2xl p-2 transition-all ${
                isAdmin
                  ? 'cursor-pointer hover:bg-[#F8F9FA] hover:ring-1 hover:ring-[#1A73E8]/30 group/edit'
                  : ''
              }`}
              title={isAdmin ? 'Click on div to edit title & description' : undefined}
            >
              <div className="flex items-center gap-1.5">
                <h3 className="text-center text-[20px] font-semibold tracking-tight text-[#202124]">
                  {event.title}
                </h3>
                {isAdmin && (
                  <span className="opacity-0 group-hover/edit:opacity-100 transition-opacity text-[#1A73E8]">
                    <Edit2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <p className="mt-1 text-center text-xs text-[#5F6368] max-w-[260px] leading-relaxed">
                {event.description}
              </p>
              {isAdmin && (
                <span className="mt-1 text-[10px] font-medium text-[#1A73E8] opacity-0 group-hover/edit:opacity-100 transition-opacity">
                  Click div to edit details
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card Actions: Mobile touch-first */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-2.5"
        >
          {isLive ? (
            <Link
              href={targetHref}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#1A73E8] px-5 text-sm font-medium text-white shadow-xs transition-all hover:bg-[#1765CC] hover:shadow-md active:scale-95"
            >
              <span>{buttonText}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              disabled
              className="flex h-12 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#F1F3F4] px-5 text-sm font-medium text-[#80868B]"
            >
              <Lock className="h-4 w-4 text-[#80868B]" />
              <span>Locked by Admin</span>
            </button>
          )}

          {/* Leaderboard Button */}
          <Link
            href={`/events/${event.slug}/leaderboard`}
            title="View Leaderboard"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-[#5F6368] transition-colors hover:bg-[#F8F9FA] hover:text-[#202124] active:scale-95"
          >
            <Trophy className="h-5 w-5 text-[#FBBC04]" />
          </Link>
        </div>

        {/* Admin Real-Time Action Bar */}
        {isAdmin && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-4 pt-3 border-t border-[#F1F3F4] flex flex-col gap-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[#5F6368] font-medium">Admin Realtime Controls</span>
              <button
                disabled={isUpdating}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleEventLock(event, isLive, setEvent)
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all ${
                  isLive
                    ? 'border border-[#EA4335]/30 text-[#C5221F] hover:bg-[#FCE8E6]'
                    : 'border border-[#34A853]/30 text-[#137333] hover:bg-[#E6F4EA]'
                }`}
              >
                {isLive ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span>{isLive ? 'Lock Track' : 'Unlock Track'}</span>
              </button>
            </div>

            {/* Live Launch 5s Countdown & Winner Ceremony buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  sendCountdownStart(event.slug)
                }}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#1A73E8] py-1.5 px-2 text-[11px] font-medium text-white hover:bg-[#1765CC] active:scale-95 transition-all"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Start 5s Countdown</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  triggerWinnerCeremony(event.slug, event.title)
                }}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/40 py-1.5 px-2 text-[11px] font-medium text-[#B06000] hover:bg-[#FFF8E1] active:scale-95 transition-all"
              >
                <Award className="h-3 w-3 text-[#FBBC04]" />
                <span>Winner Ceremony</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[19px] font-semibold tracking-tight text-[#202124]">
            Games & Live Arenas
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#1967D2] shadow-2xs">
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
