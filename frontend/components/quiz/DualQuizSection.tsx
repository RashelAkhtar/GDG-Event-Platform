'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  GdgEvent,
  api,
  DEFAULT_WEND_EVENT,
  QuestionData,
  WendTargetWord,
  WendBoardConfig,
} from '@/lib/api'
import { AnimatedLockToggle } from '@/components/ui/AnimatedLockToggle'
import { GameManipulatorModal } from './GameManipulatorModal'
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
  Sliders,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Clock,
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
  const [editTab, setEditTab] = useState<'game' | 'info'>('game')
  const [editTitle, setEditTitle] = useState<string>('')
  const [editDescription, setEditDescription] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Inline question / target word manipulation state
  const [inlineQuestions, setInlineQuestions] = useState<QuestionData[]>([])
  const [expandedQIndex, setExpandedQIndex] = useState<number | null>(0)
  const [inlineWendWords, setInlineWendWords] = useState<WendTargetWord[]>([])
  const [newWendWordInput, setNewWendWordInput] = useState('')
  const [newWendHintInput, setNewWendHintInput] = useState('')

  // Fullscreen Game Studio Modal
  const [modalEvent, setModalEvent] = useState<GdgEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleStartEdit = (event: GdgEvent) => {
    setEditingEventId(event._id)
    setEditTitle(event.title)
    setEditDescription(event.description || '')
    setEditTab('game') // Default to Game Manipulation tab!
    setExpandedQIndex(0)

    if (event.slug === 'wend-game') {
      const board = api.getWendBoard()
      setInlineWendWords(board.targetWords)
    } else {
      setInlineQuestions(api.getQuestionsForSlug(event.slug))
    }
  }

  const handleOpenStudioModal = (event: GdgEvent) => {
    setModalEvent(event)
    setIsModalOpen(true)
  }

  const handleSaveEdit = async (
    event: GdgEvent,
    setEvent: React.Dispatch<React.SetStateAction<GdgEvent>>
  ) => {
    setSavingEdit(true)
    try {
      const cleanTitle = editTitle.trim() || event.title
      const cleanDesc = editDescription.trim() || event.description

      await api.updateEventDetails(event._id, {
        title: cleanTitle,
        description: cleanDesc,
      })

      if (event.slug === 'wend-game') {
        const board = api.getWendBoard()
        const updatedBoard = { ...board, targetWords: inlineWendWords }
        api.saveWendBoard(updatedBoard)
      } else {
        api.saveQuestionsForSlug(event.slug, inlineQuestions)
      }

      setEvent((prev) => ({
        ...prev,
        title: cleanTitle,
        description: cleanDesc,
      }))
      setEditingEventId(null)
      showToast(`Saved "${cleanTitle}" game questions & card updates!`)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
  }

  // --- Inline Quiz Manipulation Handlers ---
  const handleUpdateInlineQuestion = (index: number, field: keyof QuestionData, val: unknown) => {
    const updated = [...inlineQuestions]
    updated[index] = { ...updated[index], [field]: val }
    setInlineQuestions(updated)
  }

  const handleUpdateInlineOption = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...inlineQuestions]
    const updatedOptions = [...updated[qIndex].options]
    updatedOptions[optIndex] = text
    updated[qIndex] = { ...updated[qIndex], options: updatedOptions }
    setInlineQuestions(updated)
  }

  const handleAddInlineQuestion = () => {
    const newQ: QuestionData = {
      _id: `q_${Date.now()}_${inlineQuestions.length + 1}`,
      questionText: 'New Question Prompt',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex: 0,
      points: 100,
      timeLimitSeconds: 30,
      order: inlineQuestions.length + 1,
    }
    const updated = [...inlineQuestions, newQ]
    setInlineQuestions(updated)
    setExpandedQIndex(updated.length - 1)
  }

  const handleDeleteInlineQuestion = (qIndex: number) => {
    if (inlineQuestions.length <= 1) {
      alert('Quiz must have at least 1 question.')
      return
    }
    const updated = inlineQuestions
      .filter((_, idx) => idx !== qIndex)
      .map((q, idx) => ({ ...q, order: idx + 1 }))
    setInlineQuestions(updated)
    setExpandedQIndex(Math.max(0, qIndex - 1))
  }

  // --- Inline Wend Word Handlers ---
  const handleAddInlineWendWord = (e: React.FormEvent) => {
    e.preventDefault()
    const wordUpper = newWendWordInput.trim().toUpperCase()
    if (!wordUpper) return
    if (inlineWendWords.some((tw) => tw.word === wordUpper)) {
      alert(`Word "${wordUpper}" is already in target words!`)
      return
    }
    const newTw: WendTargetWord = {
      id: `tw_${Date.now()}_${wordUpper.toLowerCase()}`,
      word: wordUpper,
      hint: newWendHintInput.trim() || undefined,
    }
    setInlineWendWords([...inlineWendWords, newTw])
    setNewWendWordInput('')
    setNewWendHintInput('')
  }

  const handleDeleteInlineWendWord = (id: string) => {
    if (inlineWendWords.length <= 1) {
      alert('Keep at least 1 target word for the game!')
      return
    }
    setInlineWendWords(inlineWendWords.filter((w) => w.id !== id))
  }

  // --- Modal Save Callback ---
  const handleModalSave = (
    updatedEvent: GdgEvent,
    updatedQuestions?: QuestionData[],
    updatedWendBoard?: WendBoardConfig
  ) => {
    if (updatedEvent.slug === 'web-dev-quiz') {
      setWebEvent(updatedEvent)
    } else if (updatedEvent.slug === 'mentis-quiz') {
      setMentisEvent(updatedEvent)
    } else if (updatedEvent.slug === 'wend-game') {
      setWendEvent(updatedEvent)
    }
    showToast(`Saved live game changes for "${updatedEvent.title}"!`)
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
      sendLockToggle(event.slug, isLocked, newStatus)
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
    const isEditing = editingEventId === event._id

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

    return (
      <div
        onClick={() => {
          if (isAdmin && !isEditing) {
            handleStartEdit(event)
          }
        }}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-[32px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.08)] backdrop-blur-xl ${
          isAdmin && !isEditing
            ? 'cursor-pointer hover:border-[#1A73E8]/50 ring-offset-2'
            : ''
        } ${
          isEditing
            ? 'border-[#1A73E8] bg-white ring-2 ring-[#1A73E8]/20 shadow-lg'
            : isLive
            ? 'border-white/90 bg-white/95 shadow-[0_10px_35px_rgba(0,0,0,0.05)] ring-1 ring-[#34A853]/25'
            : 'border-white/80 bg-white/85 shadow-2xs hover:border-[#DADCE0]'
        } p-5 sm:p-7`}
        title={isAdmin && !isEditing ? 'Click on div to edit & manipulate this game' : undefined}
      >
        {/* Top Google Signature Stripe per Track */}
        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${trackGradient}`} />

        {/* Top Header: Track Pill & Live/Lock Badge */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold ${accentBg} ${accentText} shadow-2xs border border-white/80`}>
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
        <div className="my-4 flex flex-col items-center justify-center">
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

          {/* DIV CONTENT & GAME MANIPULATOR: RENDERED WHEN ADMIN CLICKS ON DIV */}
          {isEditing ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 w-full rounded-2xl border border-[#1A73E8]/40 bg-[#F8F9FA] p-3.5 sm:p-4 shadow-sm text-left animate-in zoom-in-95"
            >
              {/* Header with Admin Studio Launchers */}
              <div className="flex items-center justify-between pb-2 border-b border-[#DADCE0]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Manipulate Game & Div</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenStudioModal(event)}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-[#1A73E8]/40 px-2.5 py-0.5 text-[10px] font-semibold text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors cursor-pointer"
                    title="Open spacious full-screen editor modal"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span>Studio Modal</span>
                  </button>
                  <a
                    href={type === 'wend' ? '/admin?tab=wend' : `/admin?tab=quiz&track=${event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-[#DADCE0] px-2.5 py-0.5 text-[10px] font-semibold text-[#5F6368] hover:text-[#202124] transition-colors"
                    title="Open in Admin Command Center"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Admin</span>
                  </a>
                </div>
              </div>

              {/* Tab Selector: Game Manipulation vs Title & Description */}
              <div className="flex items-center gap-1.5 my-2.5 border-b border-[#DADCE0] pb-2">
                <button
                  type="button"
                  onClick={() => setEditTab('game')}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    editTab === 'game'
                      ? 'bg-[#1A73E8] text-white shadow-2xs'
                      : 'bg-white text-[#5F6368] border border-[#DADCE0] hover:bg-[#F1F3F4]'
                  }`}
                >
                  <Sliders className="h-3 w-3" />
                  <span>
                    {type === 'wend'
                      ? `Target Words (${inlineWendWords.length})`
                      : `Questions & Answers (${inlineQuestions.length})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditTab('info')}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    editTab === 'info'
                      ? 'bg-[#1A73E8] text-white shadow-2xs'
                      : 'bg-white text-[#5F6368] border border-[#DADCE0] hover:bg-[#F1F3F4]'
                  }`}
                >
                  <span>Title & Text</span>
                </button>
              </div>

              {/* SUB-PANEL 1: GAME QUESTIONS MANIPULATION (WEB / MENTIS QUIZ) */}
              {editTab === 'game' && type !== 'wend' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                      Active Questions ({inlineQuestions.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddInlineQuestion}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8] px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-[#1765CC] active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Question</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {inlineQuestions.map((q, qIdx) => {
                      const isExpanded = expandedQIndex === qIdx
                      const correctChar = ['A', 'B', 'C', 'D'][q.correctOptionIndex ?? 0]

                      return (
                        <div
                          key={q._id || qIdx}
                          className="rounded-xl border border-[#DADCE0] bg-white p-2.5 shadow-2xs"
                        >
                          <div
                            onClick={() => setExpandedQIndex(isExpanded ? null : qIdx)}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#E8F0FE] text-[10px] font-bold text-[#1967D2]">
                                {qIdx + 1}
                              </span>
                              <span className="text-xs font-medium text-[#202124] truncate">
                                {q.questionText}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-bold text-[#137333]">
                                Ans: {correctChar}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteInlineQuestion(qIdx)
                                }}
                                className="p-1 rounded text-[#5F6368] hover:bg-[#FCE8E6] hover:text-[#C5221F] transition-colors"
                                title="Delete question"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5 text-[#5F6368]" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-[#5F6368]" />
                              )}
                            </div>
                          </div>

                          {/* Expanded inline question fields */}
                          {isExpanded && (
                            <div className="mt-2.5 pt-2 border-t border-[#F1F3F4] space-y-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#5F6368] mb-0.5">
                                  Question Prompt
                                </label>
                                <textarea
                                  rows={2}
                                  value={q.questionText}
                                  onChange={(e) =>
                                    handleUpdateInlineQuestion(qIdx, 'questionText', e.target.value)
                                  }
                                  className="w-full rounded-xl border border-[#DADCE0] bg-[#FAFAFA] p-2 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
                                  placeholder="Question prompt"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#5F6368] mb-1">
                                  4 Options (Click letter to mark Correct Answer)
                                </label>
                                <div className="space-y-1.5">
                                  {q.options.map((opt, optIdx) => {
                                    const isCorrect = (q.correctOptionIndex ?? 0) === optIdx
                                    const letter = ['A', 'B', 'C', 'D'][optIdx]
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 transition-all ${
                                          isCorrect
                                            ? 'border-[#34A853] bg-[#E6F4EA]/40'
                                            : 'border-[#DADCE0] bg-white'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateInlineQuestion(qIdx, 'correctOptionIndex', optIdx)
                                          }
                                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                            isCorrect
                                              ? 'bg-[#34A853] text-white'
                                              : 'border border-[#DADCE0] text-[#5F6368] hover:bg-[#E8F0FE]'
                                          }`}
                                          title={`Click to set Option ${letter} as Correct`}
                                        >
                                          {letter}
                                        </button>
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) =>
                                            handleUpdateInlineOption(qIdx, optIdx, e.target.value)
                                          }
                                          placeholder={`Option ${letter}`}
                                          className="w-full bg-transparent text-xs text-[#202124] focus:outline-none"
                                        />
                                        {isCorrect && (
                                          <span className="text-[10px] font-bold text-[#137333] shrink-0">
                                            ✓ Correct
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <label className="block text-[9px] font-semibold text-[#5F6368] mb-0.5">
                                    Points
                                  </label>
                                  <input
                                    type="number"
                                    value={q.points || 100}
                                    onChange={(e) =>
                                      handleUpdateInlineQuestion(qIdx, 'points', Number(e.target.value))
                                    }
                                    className="w-full rounded-lg border border-[#DADCE0] bg-white px-2 py-1 text-xs font-semibold text-[#202124]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-semibold text-[#5F6368] mb-0.5">
                                    Time Limit (s)
                                  </label>
                                  <input
                                    type="number"
                                    value={q.timeLimitSeconds || 30}
                                    onChange={(e) =>
                                      handleUpdateInlineQuestion(qIdx, 'timeLimitSeconds', Number(e.target.value))
                                    }
                                    className="w-full rounded-lg border border-[#DADCE0] bg-white px-2 py-1 text-xs font-semibold text-[#202124]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SUB-PANEL 1 (WEND): TARGET WORDS & HINTS */}
              {editTab === 'game' && type === 'wend' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#137333] uppercase tracking-wider">
                      Wend Target Words ({inlineWendWords.length})
                    </span>
                    <a
                      href="/admin?tab=wend"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A73E8] hover:underline"
                    >
                      <span>Snake Board Studio</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Add word form */}
                  <div className="rounded-xl border border-[#DADCE0] bg-white p-2.5 space-y-1.5">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newWendWordInput}
                        onChange={(e) => setNewWendWordInput(e.target.value.toUpperCase())}
                        placeholder="NEW WORD (e.g. FLUTTER)"
                        className="flex-1 rounded-lg border border-[#DADCE0] px-2 py-1 text-xs font-bold text-[#202124] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddInlineWendWord}
                        className="rounded-lg bg-[#34A853] px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#2E7D32] cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newWendHintInput}
                      onChange={(e) => setNewWendHintInput(e.target.value)}
                      placeholder="Optional clue / hint"
                      className="w-full rounded-lg border border-[#DADCE0] px-2 py-1 text-[11px] text-[#202124] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {inlineWendWords.map((tw) => (
                      <div
                        key={tw.id}
                        className="flex items-center justify-between rounded-xl border border-[#DADCE0] bg-white p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-[#202124] tracking-wide block">
                            {tw.word}
                          </span>
                          {tw.hint && (
                            <span className="text-[10px] text-[#5F6368] truncate block">
                              {tw.hint}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteInlineWendWord(tw.id)}
                          className="p-1 rounded text-[#5F6368] hover:bg-[#FCE8E6] hover:text-[#C5221F]"
                          title="Delete word"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-PANEL 2: TITLE & DESCRIPTION */}
              {editTab === 'info' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#5F6368] mb-0.5">
                      Track Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-[#DADCE0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                      placeholder="Event title"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#5F6368] mb-0.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded-xl border border-[#DADCE0] bg-white p-2 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                      placeholder="Event description"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: Cancel & Save Div + Game Changes */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#DADCE0]">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 rounded-full border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-medium text-[#5F6368] hover:bg-[#F1F3F4] cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleSaveEdit(event, setEvent)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{savingEdit ? 'Saving...' : 'Save Div & Game'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* NON-EDITING VIEW: CLICK ON DIV TO ENTER GAME MANIPULATION */
            <div
              onClick={(e) => {
                if (isAdmin) {
                  e.stopPropagation()
                  handleStartEdit(event)
                }
              }}
              className={`mt-3 flex flex-col items-center rounded-2xl p-2 transition-all ${
                isAdmin
                  ? 'cursor-pointer hover:bg-[#F8F9FA] hover:ring-1 hover:ring-[#1A73E8]/30 group/edit'
                  : ''
              }`}
              title={isAdmin ? 'Click div to edit title, questions & game rules' : undefined}
            >
              <div className="flex items-center gap-1.5">
                <h3 className="text-center text-[19px] sm:text-[20px] font-semibold tracking-tight text-[#202124]">
                  {event.title}
                </h3>
                {isAdmin && (
                  <span className="opacity-0 group-hover/edit:opacity-100 transition-opacity text-[#1A73E8]">
                    <Edit2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <p className="mt-1 text-center text-xs text-[#5F6368] max-w-[270px] leading-relaxed">
                {event.description}
              </p>

              {isAdmin && (
                <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/20 px-3 py-0.5 text-[11px] font-semibold text-[#1967D2] transition-all group-hover/edit:scale-105">
                  <Sliders className="h-3 w-3" />
                  <span>
                    Click div to manipulate game ({activeQuestionsCount} {type === 'wend' ? 'Words' : 'Questions'})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Actions: Enter Game & Leaderboard */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-2.5"
        >
          {isLive ? (
            <Link
              href={targetHref}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold shadow-xs transition-all hover:shadow-md active:scale-95 ${
                type === 'wend'
                  ? 'bg-gradient-to-r from-[#34A853] to-[#1E8E3E] text-white hover:from-[#2E7D32] hover:to-[#1B5E20]'
                  : type === 'mentis'
                  ? 'bg-gradient-to-r from-[#FBBC04] to-[#E37400] text-white hover:from-[#F9AB00] hover:to-[#D96B00]'
                  : 'bg-gradient-to-r from-[#1A73E8] to-[#1557B0] text-white hover:from-[#1765CC] hover:to-[#124BA0]'
              }`}
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
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#5F6368] shadow-2xs transition-all hover:bg-white hover:text-[#202124] hover:shadow-sm active:scale-95"
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
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all cursor-pointer ${
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
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#1A73E8] py-1.5 px-2 text-[11px] font-medium text-white hover:bg-[#1765CC] active:scale-95 transition-all cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Start 5s Countdown</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  triggerWinnerCeremony(event.slug, event.title)
                }}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/40 py-1.5 px-2 text-[11px] font-medium text-[#B06000] hover:bg-[#FFF8E1] active:scale-95 transition-all cursor-pointer"
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

      {/* Fullscreen Game Manipulator Modal */}
      {modalEvent && (
        <GameManipulatorModal
          event={modalEvent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setModalEvent(null)
          }}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}
