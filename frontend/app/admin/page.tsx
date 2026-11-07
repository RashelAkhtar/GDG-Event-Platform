'use client'

import React, { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  api,
  DEFAULT_WEB_EVENT,
  DEFAULT_MENTIS_EVENT,
  DEFAULT_WEND_EVENT,
  GdgEvent,
  QuestionData,
  WendBoardConfig,
  findWordPathInGrid,
  CeremonyWinner,
  RankedParticipant,
  LeaderboardEntry,
} from '@/lib/api'
import { useWebSocket } from '@/context/WebSocketContext'
import { useAuth } from '@/context/AuthContext'
import { AdminLoginForm } from '@/components/auth/AdminLoginForm'
import {
  ShieldCheck,
  Globe,
  Brain,
  Gamepad2,
  SlidersHorizontal,
  Lock,
  Unlock,
  Plus,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Award,
  Trophy,
  ListOrdered,
  Sparkles,
  Trash2,
  Edit2,
  Edit3,
  UserCheck,
  RefreshCw,
  Crown,
  Medal,
  Rocket,
  Maximize2,
  Grid,
  RotateCcw,
  Check,
  X,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react'
import { SecurityNotificationBell } from '@/components/security/SecurityNotificationBell'
import { AnimatedLockToggle } from '@/components/ui/AnimatedLockToggle'
import { WendBoardAdminStudio } from '@/components/wend/WendBoardAdminStudio'

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

function AdminPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { gameLockStates, sendLockToggle, sendWinnerCeremonyStart, sendLeaderboardReset, sendDeleteLeaderboardEntry, sendQuestionsUpdate, sendWendConfigUpdate, liveLeaderboards, subscribeToLeaderboardUpdate, connected } = useWebSocket()

  // Deep linking params (?tab=locks|quiz|wend|winners&track=web-dev-quiz|mentis-quiz)
  const tabParam = searchParams.get('tab') as 'locks' | 'quiz' | 'wend' | 'winners' | null
  const trackParam = searchParams.get('track')

  const [webEvent, setWebEvent] = useState<GdgEvent>(DEFAULT_WEB_EVENT)
  const [mentisEvent, setMentisEvent] = useState<GdgEvent>(DEFAULT_MENTIS_EVENT)
  const [wendEvent, setWendEvent] = useState<GdgEvent>(DEFAULT_WEND_EVENT)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Top Tabs: 'locks' | 'quiz' | 'wend' | 'winners'
  const [activeTab, setActiveTab] = useState<'locks' | 'quiz' | 'wend' | 'winners'>(() => {
    if (tabParam && ['locks', 'quiz', 'wend', 'winners'].includes(tabParam)) return tabParam
    return 'locks'
  })

  // Selected event for question manager
  const [selectedSlug, setSelectedSlug] = useState<string>(() => trackParam || 'web-dev-quiz')
  const [questionsList, setQuestionsList] = useState<QuestionData[]>(() =>
    api.getQuestionsForSlug(trackParam || 'web-dev-quiz')
  )

  // New question form state
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0)
  const [points, setPoints] = useState(100)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(30)

  // Wend Snake Board Studio state
  const [wendBoard, setWendBoard] = useState<WendBoardConfig>(() => api.getWendBoard())
  const [previewWordPath, setPreviewWordPath] = useState<{ row: number; col: number }[] | null>(null)
  const [previewWordId, setPreviewWordId] = useState<string | null>(null)
  const [newTargetWord, setNewTargetWord] = useState('')
  const [newTargetHint, setNewTargetHint] = useState('')

  // Automated Ranked Winners and Standings (Priority 1: Correct Ans / Score, Priority 2: Timing Tie-Breaker)
  const [automatedRanking, setAutomatedRanking] = useState<{
    winners: CeremonyWinner[]
    rankedStandings: LeaderboardEntry[]
    rankedParticipants: RankedParticipant[]
  }>({ winners: [], rankedStandings: [], rankedParticipants: [] })

  // Track & Arena metadata editing state (for Panel 2 & Panel 3)
  const [trackEditTitle, setTrackEditTitle] = useState(() => (trackParam === 'mentis-quiz' ? mentisEvent.title : webEvent.title))
  const [trackEditDesc, setTrackEditDesc] = useState(() => (trackParam === 'mentis-quiz' ? mentisEvent.description : webEvent.description))
  const [wendArenaTitle, setWendArenaTitle] = useState(() => wendEvent.title)
  const [wendArenaDesc, setWendArenaDesc] = useState(() => wendEvent.description)
  const [savingTrackEdit, setSavingTrackEdit] = useState(false)

  // Question Inline Editing (Panel 2: Quiz & Answers)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editQText, setEditQText] = useState('')
  const [editQOptions, setEditQOptions] = useState(['', '', '', ''])
  const [editQCorrectIndex, setEditQCorrectIndex] = useState(0)
  const [editQPoints, setEditQPoints] = useState(100)
  const [editQTimeLimit, setEditQTimeLimit] = useState(30)

  // Target Word Inline Editing (Panel 3: Wend Snake Board Studio)
  const [editingTargetWordId, setEditingTargetWordId] = useState<string | null>(null)
  const [editTargetWordStr, setEditTargetWordStr] = useState('')
  const [editTargetWordHint, setEditTargetWordHint] = useState('')

  useEffect(() => {
    void api.fetchWendBoard().then((fresh) => {
      if (fresh) setWendBoard(fresh)
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    void api.fetchQuestions(selectedSlug).then((qs) => {
      if (isMounted && Array.isArray(qs)) {
        setQuestionsList(qs)
      }
    })
    return () => {
      isMounted = false
    }
  }, [selectedSlug])

  const refreshStandings = useCallback(
    async (slug = selectedSlug) => {
      const targetEvent =
        slug.includes('mentis') ? mentisEvent : slug.includes('wend') ? wendEvent : webEvent
      try {
        if (targetEvent?._id) {
          const backendEntries = await api.getLeaderboard(targetEvent._id, slug)
          if (Array.isArray(backendEntries) && backendEntries.length > 0) {
            for (const entry of backendEntries) {
              api.recordLocalAttempt(slug, entry)
            }
          }
        }
      } catch {}
      const extraLive = liveLeaderboards[slug] || []
      const rankings = api.getAutomatedRankings(slug, extraLive)
      setAutomatedRanking(rankings)
    },
    [selectedSlug, mentisEvent, wendEvent, webEvent, liveLeaderboards]
  )

  useEffect(() => {
    const unsub = subscribeToLeaderboardUpdate((updatedSlug) => {
      void refreshStandings(updatedSlug)
    })
    return () => unsub()
  }, [subscribeToLeaderboardUpdate, refreshStandings])

  useEffect(() => {
    if (activeTab === 'winners') {
      const timer = setTimeout(() => {
        void refreshStandings(selectedSlug)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [activeTab, selectedSlug, refreshStandings])

  const handleSimulateTieTest = (slug = selectedSlug) => {
    api.simulateTieTestSessions(slug)
    refreshStandings(slug)
    showToast('Loaded realistic participants demonstrating Priority 1 (Score) & Priority 2 (Tie-Breaker Time)!')
  }

  const handleClearSessions = async (slug = selectedSlug) => {
    const targetEvent =
      slug.includes('mentis') ? mentisEvent : slug.includes('wend') ? wendEvent : webEvent
    try {
      await api.resetLeaderboard(targetEvent._id, slug)
    } catch {}
    api.clearSessionsForSlug(slug)
    sendLeaderboardReset(slug)
    refreshStandings(slug)
    showToast('Reset leaderboard & cleared attempts! All participants can now replay.', 'success')
  }

  // Load initial events
  useEffect(() => {
    async function loadData() {
      try {
        const events = await api.getEvents()
        const web = events.find((e) => e.slug.includes('web')) || DEFAULT_WEB_EVENT
        const mentis = events.find((e) => e.slug.includes('mentis')) || DEFAULT_MENTIS_EVENT
        setWebEvent(web)
        setMentisEvent(mentis)
      } catch {}
    }
    loadData()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3500)
  }

  // --- 1. DIV LOCK & UNLOCK CONTROLLER ---
  const isWebLive = gameLockStates['web-dev-quiz']
    ? gameLockStates['web-dev-quiz'].status === 'LIVE'
    : webEvent.status === 'LIVE'

  const isMentisLive = gameLockStates['mentis-quiz']
    ? gameLockStates['mentis-quiz'].status === 'LIVE'
    : mentisEvent.status === 'LIVE'

  const isWendLive = gameLockStates['wend-game']
    ? gameLockStates['wend-game'].status === 'LIVE'
    : wendEvent.status === 'LIVE'

  const handleToggleDivLock = async (
    slug: 'web-dev-quiz' | 'mentis-quiz' | 'wend-game',
    isCurrentlyLive: boolean
  ) => {
    const targetStatus = isCurrentlyLive ? 'UPCOMING' : 'LIVE'
    const isLocked = targetStatus !== 'LIVE'
    const targetEvent =
      slug === 'web-dev-quiz' ? webEvent : slug === 'mentis-quiz' ? mentisEvent : wendEvent
    const setEvent =
      slug === 'web-dev-quiz' ? setWebEvent : slug === 'mentis-quiz' ? setMentisEvent : setWendEvent

    setUpdatingId(targetEvent._id)
    try {
      // Broadcast over WebSocket to all users immediately
      sendLockToggle(slug, isLocked, targetStatus)
      await api.updateEventStatus(targetEvent._id, targetStatus)
      setEvent({ ...targetEvent, status: targetStatus })
      showToast(`${targetEvent.title} div is now ${isLocked ? 'LOCKED' : 'UNLOCKED'}!`)
    } catch {
      showToast('Updated local status', 'success')
    } finally {
      setUpdatingId(null)
    }
  }

  // Navigation router helper: deep links tabs and tracks cleanly to /admin-panel/panel
  const navigateToPanel = (tab: 'locks' | 'quiz' | 'wend' | 'winners', track?: string) => {
    setActiveTab(tab)
    if (tab === 'quiz') {
      const targetSlug = track || selectedSlug || 'web-dev-quiz'
      setSelectedSlug(targetSlug)
      setQuestionsList(api.getQuestionsForSlug(targetSlug))
      const target = targetSlug === 'mentis-quiz' ? mentisEvent : webEvent
      setTrackEditTitle(target.title)
      setTrackEditDesc(target.description)
    }
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (track || (tab === 'quiz' && selectedSlug)) {
      params.set('track', track || selectedSlug)
    }
    router.push(`/admin-panel/panel?${params.toString()}`)
  }

  // --- 1.1 TRACK & ARENA METADATA HANDLERS (PANELS 2 & 3) ---
  const handleSaveTrackMetadata = async (slug: 'web-dev-quiz' | 'mentis-quiz' | 'wend-game') => {
    const target = slug === 'web-dev-quiz' ? webEvent : slug === 'mentis-quiz' ? mentisEvent : wendEvent
    const setEvent = slug === 'web-dev-quiz' ? setWebEvent : slug === 'mentis-quiz' ? setMentisEvent : setWendEvent
    const newTitle = slug === 'wend-game' ? wendArenaTitle.trim() : trackEditTitle.trim()
    const newDesc = slug === 'wend-game' ? wendArenaDesc.trim() : trackEditDesc.trim()
    setSavingTrackEdit(true)
    try {
      const finalTitle = newTitle || target.title
      const finalDesc = newDesc || target.description
      await api.updateEventDetails(target._id, {
        title: finalTitle,
        description: finalDesc,
      })
      const updatedEvent: GdgEvent = { ...target, title: finalTitle, description: finalDesc }
      setEvent(updatedEvent)
      if (slug === 'wend-game') {
        const updatedBoard: WendBoardConfig = {
          ...wendBoard,
          title: finalTitle,
          description: finalDesc,
        }
        setWendBoard(updatedBoard)
        api.saveWendBoard(updatedBoard)
        sendWendConfigUpdate(updatedBoard)
      }
      showToast(`Saved settings for "${finalTitle}"!`)
    } catch {
      showToast('Failed to save settings', 'error')
    } finally {
      setSavingTrackEdit(false)
    }
  }

  // --- 1.2 INLINE QUESTION EDITING HANDLERS (PANEL 2) ---
  const handleStartEditQuestion = (q: QuestionData) => {
    setEditingQuestionId(q._id || '')
    setEditQText(q.questionText)
    setEditQOptions([...q.options])
    setEditQCorrectIndex(q.correctOptionIndex ?? 0)
    setEditQPoints(q.points || 100)
    setEditQTimeLimit(q.timeLimitSeconds || 30)
  }

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null)
  }

  const handleSaveEditQuestion = (id?: string) => {
    if (!id) return
    if (!editQText.trim()) {
      showToast('Question prompt cannot be empty', 'error')
      return
    }
    const cleanOpts = editQOptions.map((o) => o.trim())
    if (cleanOpts.some((o) => !o)) {
      showToast('All 4 options must have text', 'error')
      return
    }

    const updated = questionsList.map((q) => {
      if (q._id === id) {
        return {
          ...q,
          questionText: editQText.trim(),
          options: cleanOpts,
          correctOptionIndex: editQCorrectIndex,
          points: Number(editQPoints),
          timeLimitSeconds: Number(editQTimeLimit),
        }
      }
      return q
    })

    setQuestionsList(updated)
    api.saveQuestionsForSlug(selectedSlug, updated)
    sendQuestionsUpdate(selectedSlug, updated)
    setEditingQuestionId(null)
    showToast('Question updated successfully!')
  }

  // --- 1.3 INLINE TARGET WORD EDITING HANDLERS (PANEL 3) ---
  const handleStartEditTargetWord = (tw: { id: string; word: string; hint?: string }) => {
    setEditingTargetWordId(tw.id)
    setEditTargetWordStr(tw.word)
    setEditTargetWordHint(tw.hint || '')
  }

  const handleCancelEditTargetWord = () => {
    setEditingTargetWordId(null)
  }

  const handleSaveEditTargetWord = (id: string) => {
    const cleanWord = editTargetWordStr.trim().toUpperCase()
    if (!cleanWord) {
      showToast('Target word cannot be empty', 'error')
      return
    }
    const updatedWords = wendBoard.targetWords.map((tw) => {
      if (tw.id === id) {
        return {
          ...tw,
          word: cleanWord,
          hint: editTargetWordHint.trim() || undefined,
        }
      }
      return tw
    })
    const updatedBoard: WendBoardConfig = {
      ...wendBoard,
      targetWords: updatedWords,
    }
    setWendBoard(updatedBoard)
    api.saveWendBoard(updatedBoard)
    sendWendConfigUpdate(updatedBoard)
    setEditingTargetWordId(null)
    showToast(`Target word updated to "${cleanWord}"!`)
  }

  // --- 2. QUIZ QUESTIONS & ANSWER KEYS MANAGER ---
  const handleSelectQuizTrack = (slug: string) => {
    setSelectedSlug(slug)
    setQuestionsList(api.getQuestionsForSlug(slug))
    const target = slug === 'mentis-quiz' ? mentisEvent : webEvent
    setTrackEditTitle(target.title)
    setTrackEditDesc(target.description)
    router.push(`/admin-panel/panel?tab=quiz&track=${slug}`)
  }

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionText.trim()) {
      showToast('Question text is required', 'error')
      return
    }
    const cleanOptions = options.map((o) => o.trim())
    if (cleanOptions.some((o) => !o)) {
      showToast('All 4 options (A, B, C, D) must have text', 'error')
      return
    }

    const newQ: QuestionData = {
      _id: `q_${questionsList.length + 1}_${cleanOptions[0].slice(0, 3)}`,
      questionText: questionText.trim(),
      options: cleanOptions,
      correctOptionIndex,
      points: Number(points),
      timeLimitSeconds: Number(timeLimitSeconds),
      order: questionsList.length + 1,
    }

    const updated = [...questionsList, newQ]
    setQuestionsList(updated)
    api.saveQuestionsForSlug(selectedSlug, updated)
    sendQuestionsUpdate(selectedSlug, updated)

    setQuestionText('')
    setOptions(['', '', '', ''])
    setCorrectOptionIndex(0)
    showToast(`Question #${updated.length} added! (${cleanOptions[correctOptionIndex]} set as correct answer)`)
  }

  const handleDeleteQuestion = (id?: string) => {
    if (!id) return
    const updated = questionsList.filter((q) => q._id !== id)
    setQuestionsList(updated)
    api.saveQuestionsForSlug(selectedSlug, updated)
    sendQuestionsUpdate(selectedSlug, updated)
    showToast('Question removed from quiz pool')
  }

  // --- WEND GAME SNAKE BOARD STUDIO HANDLERS ---
  const handleUpdateBoard = (updatedBoard: WendBoardConfig) => {
    setWendBoard(updatedBoard)
    api.saveWendBoard(updatedBoard)
    sendWendConfigUpdate(updatedBoard)
  }

  const handleTogglePreviewWordPath = (tw: { id: string; word: string }) => {
    if (previewWordId === tw.id) {
      setPreviewWordId(null)
      setPreviewWordPath(null)
    } else {
      const path = findWordPathInGrid(tw.word, wendBoard.grid)
      if (path && path.length > 0) {
        setPreviewWordId(tw.id)
        setPreviewWordPath(path)
        showToast(`Previewing path for "${tw.word}" on grid!`, 'info')
      } else {
        setPreviewWordId(tw.id)
        setPreviewWordPath(null)
        showToast(`"${tw.word}" is unreachable or blocked in current grid!`, 'error')
      }
    }
  }

  const handleAddTargetWord = (e: React.FormEvent) => {
    e.preventDefault()
    const wordUpper = newTargetWord.trim().toUpperCase()
    if (!wordUpper) {
      showToast('Target word is required', 'error')
      return
    }

    if (wendBoard.targetWords.some((tw) => tw.word.toUpperCase() === wordUpper)) {
      showToast(`Word "${wordUpper}" is already in target list`, 'error')
      return
    }

    const path = findWordPathInGrid(wordUpper, wendBoard.grid)
    const isSolvable = Boolean(path && path.length > 0)

    const newTw = {
      id: `tw_${wendBoard.targetWords.length + 1}_${wordUpper.toLowerCase()}`,
      word: wordUpper,
      hint: newTargetHint.trim() || undefined,
    }

    const updatedWords = [...wendBoard.targetWords, newTw]
    const updatedBoard = { ...wendBoard, targetWords: updatedWords }
    setWendBoard(updatedBoard)
    api.saveWendBoard(updatedBoard)
    sendWendConfigUpdate(updatedBoard)

    setNewTargetWord('')
    setNewTargetHint('')

    if (isSolvable) {
      showToast(`Added "${wordUpper}" • Solvable on current grid!`, 'success')
    } else {
      showToast(`Added "${wordUpper}", but it is blocked or unreachable in grid!`, 'error')
    }
  }

  const handleDeleteTargetWord = (id: string) => {
    const updatedWords = wendBoard.targetWords.filter((tw) => tw.id !== id)
    const updatedBoard = { ...wendBoard, targetWords: updatedWords }
    setWendBoard(updatedBoard)
    api.saveWendBoard(updatedBoard)
    sendWendConfigUpdate(updatedBoard)
    showToast('Target word removed from board')
  }

  const handleResetToReferenceBoard = async () => {
    const defaultBoard = await api.resetWendBoard()
    setWendBoard(defaultBoard)
    sendWendConfigUpdate(defaultBoard)
    showToast('Reset Wend Board: All cells blocked (#)!', 'success')
  }

  const handleSetWendTimeLimit = (seconds: number) => {
    const updated = api.setWendTimeLimit(seconds)
    setWendBoard(updated)
    sendWendConfigUpdate(updated)
    showToast(`Updated Wend round time limit to ${seconds}s (${formatDuration(seconds * 1000)})! Broadcast live to all participant screens.`)
  }

  // --- 4. WINNER CEREMONY BROADCAST (AUTOMATED PODIUM 3rd, 2nd, 1st) ---
  const handleSelectWinnersTrack = (slug: 'web-dev-quiz' | 'mentis-quiz' | 'wend-game') => {
    setSelectedSlug(slug)
    refreshStandings(slug)
  }

  const handleDeleteParticipantStanding = (id: string, name?: string) => {
    api.deleteParticipantFromLeaderboard(selectedSlug, id, name)
    sendDeleteLeaderboardEntry(selectedSlug, id, name)
    refreshStandings(selectedSlug)
    showToast(`Removed "${name || 'Participant'}" from leaderboard`)
  }

  const handleBroadcastWinnerCeremony = (overrideSlug?: string) => {
    const slugToUse = overrideSlug || selectedSlug
    const extraLive = liveLeaderboards[slugToUse] || []
    const currentRankings = api.getAutomatedRankings(slugToUse, extraLive)

    if (currentRankings.winners.length === 0) {
      showToast('No participants recorded yet for this challenge. Play a round or click "Simulate Test Submissions" to test!', 'error')
      return
    }

    const targetTitle = slugToUse.includes('mentis')
      ? 'Mentis Mind Challenge'
      : slugToUse.includes('wend')
      ? 'Wend Word Arena'
      : 'Web Dev Sprint'

    sendWinnerCeremonyStart({
      gameSlug: slugToUse,
      gameTitle: targetTitle,
      winners: currentRankings.winners,
      fullLeaderboard: currentRankings.rankedStandings,
    })

    showToast(`BROADCASTED VIA SOCKET: Winner Announcement ceremony with ${currentRankings.winners.length} podium winners is live!`)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] text-[#111827]">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_12px_40px_rgba(0,0,0,0.03)] max-w-sm text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111827] border-t-transparent" />
          <div>
            <h2 className="text-sm font-medium text-[#111827] tracking-tight">Verifying Host Authorization</h2>
            <p className="text-xs text-[#6B7280] mt-1">Connecting to command center session...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return <AdminLoginForm />
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#FAFAFA] text-[#111827] overflow-x-hidden selection:bg-[#111827] selection:text-white">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-xl">
        {/* Top Google 4-Color Accent Line */}
        <div className="google-hairline-strip" />
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#111827] hover:border-[#111827] transition-all active:scale-95 shadow-2xs"
              title="Return to Directory"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-white shadow-2xs">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-medium tracking-tight text-[#111827] leading-none">
                    Command Center
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-[#6B7280]">
                    Host Session
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-[#6B7280]">
                  <span>Active Session:</span>
                  <strong className="font-semibold text-[#111827]">aryan.crores@gmail.com</strong>
                </div>
              </div>
            </div>
          </div>

          {/* WebSocket Status Indicator & Security Alerts Bell */}
          <div className="flex items-center gap-2.5">
            <SecurityNotificationBell />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 font-mono text-xs text-[#111827] shadow-2xs">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-[#15803D] shadow-[0_0_8px_#15803D]' : 'bg-[#FBBC04] animate-pulse'}`} />
              <span className="text-[10.5px] font-semibold uppercase tracking-wider">{connected ? 'Socket Live' : 'Local Channel'}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard - Full Page & Mobile Fluid */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 sm:px-6 lg:px-8 pt-6 pb-20">
        {/* Toast Feedback */}
        {feedback && (
          <div
            className={`mb-5 flex items-center gap-2 rounded-2xl p-3.5 text-xs font-medium shadow-sm transition-all ${
              feedback.type === 'success'
                ? 'bg-[#E6F4EA] text-[#137333] border border-[#34A853]/40'
                : feedback.type === 'error'
                ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#EA4335]/40'
                : 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34A853]" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#EA4335]" />
            ) : (
              <HelpCircle className="h-4 w-4 shrink-0 text-[#1A73E8]" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Editorial Segmented Control Bar */}
        <div className="mb-6 rounded-2xl border border-[#E5E7EB] bg-white p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
          <div className="flex sm:grid sm:grid-cols-4 gap-1.5 min-w-[560px] sm:min-w-0">
            {[
              { id: 'locks' as const, num: '01', label: 'Div Locks & Arenas', icon: SlidersHorizontal },
              { id: 'quiz' as const, num: '02', label: 'Quiz & Questions', icon: ListOrdered },
              { id: 'wend' as const, num: '03', label: 'Wend 8×8 Studio', icon: Grid },
              { id: 'winners' as const, num: '04', label: 'Winner Ceremony', icon: Crown },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'quiz') navigateToPanel('quiz', selectedSlug)
                    else navigateToPanel(tab.id)
                  }}
                  className={`group flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#111827] text-white shadow-xs font-semibold'
                      : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] font-medium'
                  }`}
                >
                  <span
                    className={`flex h-4.5 w-4.5 items-center justify-center rounded-lg font-mono text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}
                  >
                    {tab.num}
                  </span>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* PANEL 1: DIV LOCK / UNLOCK & MASTER ARENA CONTROLS       */}
        {/* ======================================================== */}
        {activeTab === 'locks' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Panel Masthead */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-[#E5E7EB] shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#9CA3AF]">
                    ARENA CONTROLS // SYSTEM 01
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-[#111827] mt-0.5">
                  Track Access & Master Controls
                </h2>
                <p className="mt-1 text-xs sm:text-[13px] text-[#4B5563] leading-relaxed">
                  Real-time participant gatekeeping over WebSockets. Toggle access or enter studio suites.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] border border-[#DCFCE7] px-3.5 py-1.5 font-mono text-xs font-medium text-[#15803D] shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-[#15803D] animate-pulse" />
                  <span>WEBSOCKET LIVE</span>
                </span>
              </div>
            </div>

            {/* 3 Arena Track Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  slug: 'web-dev-quiz' as const,
                  event: webEvent,
                  isLive: isWebLive,
                  trackIndex: '01',
                  trackTag: 'WEB DEV SPRINT',
                  stripeColor: 'bg-[#1A73E8]',
                  accentDot: 'bg-[#1A73E8]',
                  icon: Globe,
                  meta: `${api.getQuestionsForSlug('web-dev-quiz').length} Questions • Blitz Pool`,
                  actionTitle: 'Web Dev Sprint',
                  jumpTab: 'quiz' as const,
                  jumpLabel: 'Open Questions Studio',
                },
                {
                  slug: 'mentis-quiz' as const,
                  event: mentisEvent,
                  isLive: isMentisLive,
                  trackIndex: '02',
                  trackTag: 'MENTIS CHALLENGE',
                  stripeColor: 'bg-[#FBBC04]',
                  accentDot: 'bg-[#FBBC04]',
                  icon: Brain,
                  meta: `${api.getQuestionsForSlug('mentis-quiz').length} Questions • Logic & Algorithms`,
                  actionTitle: 'Mentis Mind Challenge',
                  jumpTab: 'quiz' as const,
                  jumpLabel: 'Open Questions Studio',
                },
                {
                  slug: 'wend-game' as const,
                  event: wendEvent,
                  isLive: isWendLive,
                  trackIndex: '03',
                  trackTag: 'WEND WORD ARENA',
                  stripeColor: 'bg-[#34A853]',
                  accentDot: 'bg-[#34A853]',
                  icon: Gamepad2,
                  meta: `8×8 Grid • ${wendBoard.targetWords.length} Target Words`,
                  actionTitle: 'Wend Word Arena',
                  jumpTab: 'wend' as const,
                  jumpLabel: 'Open Matrix Studio',
                },
              ].map((track) => {
                const { slug, event, isLive, trackIndex, trackTag, stripeColor, accentDot, icon: Icon, meta, actionTitle, jumpTab, jumpLabel } = track
                const isUpdating = updatingId === event._id

                return (
                  <div
                    key={slug}
                    onClick={() => {
                      navigateToPanel(jumpTab, slug !== 'wend-game' ? slug : undefined)
                    }}
                    className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-6 sm:p-7 shadow-xs hover:border-[#111827] hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer overflow-hidden ${
                      isLive
                        ? 'border-[#15803D]/40 ring-1 ring-[#15803D]/20'
                        : 'border-[#E5E7EB]'
                    }`}
                    title={`Click to open ${actionTitle} studio`}
                  >
                    {/* Top Luminous Hairline Indicator */}
                    <div className={`absolute top-0 inset-x-0 h-[3px] ${stripeColor}`} />

                    <div>
                      {/* Top Header Row: Track Category & Live Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${accentDot}`} />
                          <span className="font-mono text-[10px] tracking-[0.24em] uppercase font-medium text-[#6B7280]">
                            {trackIndex} // {trackTag}
                          </span>
                        </div>

                        {/* Animated Lock State Toggle */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleDivLock(slug, isLive)
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <AnimatedLockToggle
                            id={`admin-lock-toggle-${slug}`}
                            checked={isLive}
                            isLive={isLive}
                            isAdmin={true}
                            disabled={isUpdating}
                            onChange={() => handleToggleDivLock(slug, isLive)}
                            size="xs"
                            showBadge={true}
                            badgeLiveText="Live"
                            badgeLockedText="Locked"
                          />
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="mt-4 flex flex-col text-left">
                        <h3 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-[#111827] group-hover:text-black transition-colors leading-snug">
                          {event.title}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-[#4B5563] mt-1.5 leading-relaxed line-clamp-2">
                          {event.description}
                        </p>
                      </div>

                      {/* Specs Ribbon */}
                      <div className="pt-3 mt-4 border-t border-[#F3F4F6] flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-wider uppercase text-[#9CA3AF] flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-[#9CA3AF]" />
                          <span>{meta}</span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#111827] group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                          <span>Studio</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>

                    {/* Action Controls Deck */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-6 flex flex-col gap-2 pt-4 border-t border-[#F3F4F6]"
                    >
                      {/* Primary Button: Open Dedicated Studio */}
                      <button
                        type="button"
                        onClick={() => {
                          navigateToPanel(jumpTab, slug !== 'wend-game' ? slug : undefined)
                        }}
                        className="w-full flex h-10 items-center justify-center gap-2 rounded-full bg-[#111827] hover:bg-black font-mono text-xs font-medium uppercase tracking-wider text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>{jumpLabel}</span>
                      </button>

                      {/* Secondary Row: Gate Lock Toggle + Podium Broadcast */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleDivLock(slug, isLive)}
                          className={`flex h-9 items-center justify-center gap-1.5 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                            isLive
                              ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
                              : 'border-[#E5E7EB] bg-[#FAFAFA] text-[#111827] hover:border-[#111827] hover:bg-white'
                          }`}
                        >
                          {isLive ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                          <span>{isLive ? 'Lock Gate' : 'Open Live'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigateToPanel('winners', slug !== 'wend-game' ? slug : undefined)
                          }}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white text-[#111827] hover:border-[#FBBC04] hover:bg-[#FEF7E0] hover:text-[#B06000] font-mono text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                        >
                          <Trophy className="h-3 w-3 text-[#FBBC04]" />
                          <span>Podium</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL 2: QUIZ QUESTIONS & CORRECT/WRONG ANSWER KEYS     */}
        {/* ======================================================== */}
        {activeTab === 'quiz' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Header & Quiz Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E6F4EA] text-[#137333] border border-[#34A853]/30">
                    <ListOrdered className="h-4 w-4" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#202124] uppercase font-mono">
                    Quiz Questions & Answer Keys
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#5F6368]">
                  Manage questions, multiple-choice options, designated answer keys, points, and timers.
                </p>
              </div>

              {/* Event Switcher Segmented Control */}
              <div className="flex items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-1 shadow-2xs self-start sm:self-auto font-mono text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleSelectQuizTrack('web-dev-quiz')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSlug === 'web-dev-quiz'
                      ? 'bg-white text-[#1967D2] shadow-xs border border-[#1A73E8]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Web Dev Sprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuizTrack('mentis-quiz')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSlug === 'mentis-quiz'
                      ? 'bg-white text-[#B06000] shadow-xs border border-[#FBBC04]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>Mentis Challenge</span>
                </button>
              </div>
            </div>

            {/* Questions KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative overflow-hidden rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1A73E8]" />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-2xl sm:text-3xl font-black text-[#1A73E8] tracking-tight">
                      {questionsList.length}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#5F6368]">Total Questions</span>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F0FE] text-[#1967D2]">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#34A853]" />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-2xl sm:text-3xl font-black text-[#34A853] tracking-tight">
                      {questionsList.reduce((acc, q) => acc + (q.points || 100), 0)}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#5F6368]">Total Track Points</span>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6F4EA] text-[#137333]">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#FBBC04]" />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-2xl sm:text-3xl font-black text-[#B06000] tracking-tight">
                      {questionsList.reduce((acc, q) => acc + (q.timeLimitSeconds || 30), 0)}s
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#5F6368]">
                      Total Duration ({Math.ceil(questionsList.reduce((acc, q) => acc + (q.timeLimitSeconds || 30), 0) / 60)}m)
                    </span>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF7E0] text-[#B06000]">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Track Settings & Title/Description Editor */}
            <div className="rounded-3xl border border-[#E5E7EB]/90 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-[#F1F3F4]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0FE] text-[#1967D2]">
                    <Edit3 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124]">
                      Track Details & Information ({selectedSlug === 'web-dev-quiz' ? 'Web Dev Sprint' : 'Mentis Challenge'})
                    </h3>
                    <p className="text-[11px] text-[#5F6368]">
                      Rename this track and edit its participant challenge overview
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={savingTrackEdit}
                  onClick={() => handleSaveTrackMetadata(selectedSlug as 'web-dev-quiz' | 'mentis-quiz')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#1557B0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-[#1765CC] hover:to-[#104D96] active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{savingTrackEdit ? 'Saving...' : 'Save Track Details'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1.5">
                    Track Title
                  </label>
                  <input
                    type="text"
                    value={trackEditTitle}
                    onChange={(e) => setTrackEditTitle(e.target.value)}
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white"
                    placeholder="Enter track title"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={trackEditDesc}
                    onChange={(e) => setTrackEditDesc(e.target.value)}
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white"
                    placeholder="Enter track description"
                  />
                </div>
              </div>
            </div>

            {/* Question Creator Form */}
            <div className="rounded-3xl border border-[#E5E7EB]/90 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F3F4]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0FE] text-[#1967D2]">
                    <Plus className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124]">
                      Add Question #{questionsList.length + 1}
                    </h3>
                    <p className="text-[11px] text-[#5F6368]">
                      For {selectedSlug === 'web-dev-quiz' ? 'Web Dev Sprint' : 'Mentis Challenge'} track
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/20 px-3 py-1 text-xs font-bold text-[#1967D2]">
                  <Sparkles className="h-3 w-3 text-[#FBBC04]" />
                  <span>Pool Builder</span>
                </span>
              </div>

              <form onSubmit={handleAddQuestion} className="flex flex-col gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1.5">
                    Question Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter the question prompt here (e.g. Which CSS property triggers GPU hardware acceleration?)..."
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-3 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white leading-relaxed"
                    required
                  />
                </div>

                {/* 4 Options with explicit Correct / Wrong selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043]">
                      Answer Options (Select the green radio button for the CORRECT answer)
                    </label>
                    <span className="text-[10px] font-semibold text-[#137333]">
                      Option {String.fromCharCode(65 + correctOptionIndex)} is marked correct
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {options.map((opt, idx) => {
                      const isCorrect = correctOptionIndex === idx
                      const letter = String.fromCharCode(65 + idx)
                      return (
                        <div
                          key={idx}
                          onClick={() => setCorrectOptionIndex(idx)}
                          className={`flex items-center gap-2.5 rounded-2xl border p-2.5 transition-all cursor-pointer ${
                            isCorrect
                              ? 'border-[#34A853] bg-[#E6F4EA]/50 ring-2 ring-[#34A853]/25 shadow-xs'
                              : 'border-[#E5E7EB] bg-white hover:border-[#BDC1C6]'
                          }`}
                        >
                          <div className="flex items-center gap-2 pl-1">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={isCorrect}
                              onChange={() => setCorrectOptionIndex(idx)}
                              className="h-4 w-4 text-[#34A853] focus:ring-[#34A853] cursor-pointer"
                            />
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                                isCorrect ? 'bg-[#34A853] text-white shadow-xs' : 'bg-[#F1F3F4] text-[#5F6368]'
                              }`}
                            >
                              {letter}
                            </span>
                          </div>

                          <input
                            type="text"
                            value={opt}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const next = [...options]
                              next[idx] = e.target.value
                              setOptions(next)
                            }}
                            placeholder={`Option ${letter} answer text...`}
                            className="flex-1 bg-transparent px-2 py-1 text-xs text-[#202124] focus:outline-none font-medium"
                            required
                          />

                          {isCorrect && (
                            <span className="rounded-full bg-[#34A853] px-2 py-0.5 text-[9px] font-bold text-white shrink-0">
                              CORRECT
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1">
                      Points Awarded
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2">
                      <Award className="h-4 w-4 text-[#FBBC04] shrink-0" />
                      <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        className="w-full text-xs font-bold text-[#202124] bg-transparent focus:outline-none"
                        min={10}
                        step={10}
                      />
                      <span className="text-[11px] font-semibold text-[#5F6368]">pts</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1">
                      Question Timer Limit
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2">
                      <Clock className="h-4 w-4 text-[#5F6368] shrink-0" />
                      <input
                        type="number"
                        value={timeLimitSeconds}
                        onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                        className="w-full text-xs font-bold text-[#202124] bg-transparent focus:outline-none"
                        min={5}
                        max={300}
                      />
                      <span className="text-[11px] font-semibold text-[#5F6368]">seconds</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1A73E8] to-[#1557B0] text-xs font-bold text-white shadow-md hover:from-[#1765CC] hover:to-[#104D96] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Save Question #{questionsList.length + 1} to Question Bank</span>
                </button>
              </form>
            </div>

            {/* Active Questions Pool */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                  <span>Active Questions Pool ({questionsList.length})</span>
                  <span className="rounded-full bg-[#E8F0FE] text-[#1967D2] px-2.5 py-0.5 text-[10px] font-bold">
                    {selectedSlug === 'web-dev-quiz' ? 'Web Dev Sprint' : 'Mentis Challenge'}
                  </span>
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {questionsList.map((q, qIdx) => {
                  const isEditingThisQ = editingQuestionId === q._id

                  if (isEditingThisQ) {
                    return (
                      <div
                        key={q._id || qIdx}
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col rounded-3xl border-2 border-[#1A73E8] bg-white p-5 shadow-md animate-in zoom-in-95"
                      >
                        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E5E7EB]">
                          <span className="text-xs font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="h-4 w-4" />
                            Editing Question #{qIdx + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-[#5F6368] bg-[#F1F3F4] px-2.5 py-0.5 rounded-full">
                            Click save to commit
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#3C4043] uppercase tracking-wider mb-1">
                              Question Prompt
                            </label>
                            <textarea
                              rows={2}
                              value={editQText}
                              onChange={(e) => setEditQText(e.target.value)}
                              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-2.5 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white"
                              placeholder="Enter question prompt..."
                              autoFocus
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#3C4043] uppercase tracking-wider mb-1.5">
                              Options & Correct Key (select green radio for correct):
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {editQOptions.map((opt, optIdx) => {
                                const isCorrect = editQCorrectIndex === optIdx
                                const letter = String.fromCharCode(65 + optIdx)
                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => setEditQCorrectIndex(optIdx)}
                                    className={`flex items-center gap-2 rounded-xl border p-2 transition-all cursor-pointer ${
                                      isCorrect
                                        ? 'border-[#34A853] bg-[#E6F4EA]/50 ring-2 ring-[#34A853]/20 shadow-xs'
                                        : 'border-[#E5E7EB] bg-white'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`editCorrect_${q._id}`}
                                      checked={isCorrect}
                                      onChange={() => setEditQCorrectIndex(optIdx)}
                                      className="h-4 w-4 text-[#34A853] focus:ring-[#34A853]"
                                    />
                                    <span
                                      className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${
                                        isCorrect ? 'bg-[#34A853] text-white' : 'bg-[#F1F3F4] text-[#5F6368]'
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const next = [...editQOptions]
                                        next[optIdx] = e.target.value
                                        setEditQOptions(next)
                                      }}
                                      placeholder={`Option ${letter} text`}
                                      className="flex-1 bg-transparent px-1 py-0.5 text-xs text-[#202124] focus:outline-none font-medium"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-[#3C4043] uppercase tracking-wider mb-1">
                                Points
                              </label>
                              <div className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-1.5">
                                <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                                <input
                                  type="number"
                                  value={editQPoints}
                                  onChange={(e) => setEditQPoints(Number(e.target.value))}
                                  className="w-full text-xs font-bold text-[#202124] bg-transparent focus:outline-none"
                                  min={10}
                                  step={10}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#3C4043] uppercase tracking-wider mb-1">
                                Time Limit (Sec)
                              </label>
                              <div className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-1.5">
                                <Clock className="h-3.5 w-3.5 text-[#5F6368]" />
                                <input
                                  type="number"
                                  value={editQTimeLimit}
                                  onChange={(e) => setEditQTimeLimit(Number(e.target.value))}
                                  className="w-full text-xs font-bold text-[#202124] bg-transparent focus:outline-none"
                                  min={5}
                                  max={300}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                            <button
                              type="button"
                              onClick={handleCancelEditQuestion}
                              className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#5F6368] hover:bg-[#F1F3F4]"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Cancel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditQuestion(q._id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#1557B0] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:from-[#1765CC] hover:to-[#104D96] active:scale-95"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Commit Question</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={q._id || qIdx}
                      onClick={() => handleStartEditQuestion(q)}
                      className="group/q flex flex-col rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-xs hover:border-[#1A73E8]/60 hover:shadow-md transition-all cursor-pointer"
                      title="Click question card to edit prompt & answers"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FE] text-xs font-black text-[#1967D2]">
                            #{qIdx + 1}
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-[#202124] leading-relaxed group-hover/q:text-[#1A73E8] transition-colors">
                              {q.questionText}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#1A73E8] opacity-0 group-hover/q:opacity-100 transition-opacity">
                              <Edit2 className="h-2.5 w-2.5" />
                              Click card to edit question & options
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuestion(q._id)
                          }}
                          title="Delete question"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#EA4335] hover:bg-[#FCE8E6] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Options with correct/wrong highlighting */}
                      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-0 sm:pl-10">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx
                          const letter = String.fromCharCode(65 + optIdx)
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all ${
                                isCorrect
                                  ? 'bg-[#E6F4EA] border border-[#34A853]/50 text-[#137333] font-bold shadow-2xs'
                                  : 'bg-[#F8F9FA] text-[#5F6368] font-medium border border-transparent'
                              }`}
                            >
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black ${
                                isCorrect ? 'bg-[#34A853] text-white' : 'bg-[#E8EAED] text-[#3C4043]'
                              }`}>
                                {letter}
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && <CheckCircle2 className="h-4 w-4 ml-auto text-[#34A853] shrink-0" />}
                            </div>
                          )
                        })}
                      </div>

                      <div className="mt-3.5 flex items-center justify-between pl-0 sm:pl-10 pt-2.5 border-t border-[#F1F3F4] text-[11px] text-[#5F6368]">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Award className="h-3 w-3 text-[#FBBC04]" />
                          <span>Award: <strong>{q.points || 100} pts</strong></span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3 text-[#5F6368]" />
                          <span>Timer Limit: <strong>{q.timeLimitSeconds || 30}s</strong></span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL 3: WEND SNAKE BOARD STUDIO                         */}
        {/* ======================================================== */}
        {activeTab === 'wend' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Header & Reset Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 border border-[#E5E7EB] shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center bg-[#FCE8E6] text-[#C5221F] border border-[#EA4335]/30">
                    <Grid className="h-4 w-4" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#202124] uppercase font-mono">
                    Wend Snake Board Studio
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#5F6368]">
                  Design the 8×8 letter grid, draw obstacle cutout shapes (such as the letter H & I blocks), and manage target words.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetToReferenceBoard}
                className="inline-flex items-center gap-1.5 border border-[#E5E7EB] bg-white px-4 py-2 font-mono text-xs font-bold text-[#1A73E8] shadow-2xs hover:bg-[#E8F0FE] transition-all self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{'Reset Reference "H & I" Board'}</span>
              </button>
            </div>

            {/* Wend Word Arena Settings & Information */}
            <div className="border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center border border-[#34A853] bg-[#E6F4EA] text-[#137333]">
                    <Edit3 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#202124] uppercase font-mono">
                      Wend Word Arena Information
                    </h3>
                    <p className="text-[11px] text-[#5F6368]">
                      Rename the Wend Arena and update participant challenge instructions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={savingTrackEdit}
                  onClick={() => handleSaveTrackMetadata('wend-game')}
                  className="inline-flex items-center gap-1.5 border border-[#137333] bg-[#1E8E3E] px-4 py-2 font-mono text-xs font-extrabold text-white uppercase tracking-wider hover:bg-[#137333] transition-all self-start sm:self-auto cursor-pointer shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{savingTrackEdit ? 'Saving...' : 'Save Arena Details'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1.5">
                    Arena Title
                  </label>
                  <input
                    type="text"
                    value={wendArenaTitle}
                    onChange={(e) => setWendArenaTitle(e.target.value)}
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:bg-white"
                    placeholder="Enter Wend Arena title"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1.5">
                    Description & Instructions
                  </label>
                  <input
                    type="text"
                    value={wendArenaDesc}
                    onChange={(e) => setWendArenaDesc(e.target.value)}
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:bg-white"
                    placeholder="Enter Wend Arena description"
                  />
                </div>
              </div>
            </div>

            {/* Wend Round Duration & Live Timer Controller */}
            <div className="rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F1F3F4]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E6F4EA] text-[#137333] shadow-2xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124]">
                      Wend Round Duration & Countdown Timer (Host Control)
                    </h3>
                    <p className="text-xs text-[#5F6368]">
                      Dictates the round length for participants playing Wend Word Arena, enforcing an active countdown instead of an open stopwatch.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/30 px-3.5 py-1.5 text-xs font-bold text-[#1967D2] shadow-2xs">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Active Limit: {wendBoard.timeLimitSeconds || 120}s ({formatDuration((wendBoard.timeLimitSeconds || 120) * 1000)})</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#5F6368] mr-1">Quick Presets:</span>
                  {[
                    { label: '60s (1m)', val: 60 },
                    { label: '90s (1.5m)', val: 90 },
                    { label: '120s (2m • Standard)', val: 120 },
                    { label: '180s (3m)', val: 180 },
                    { label: '300s (5m)', val: 300 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleSetWendTimeLimit(preset.val)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        (wendBoard.timeLimitSeconds || 120) === preset.val
                          ? 'bg-[#137333] text-white shadow-xs'
                          : 'border border-[#E5E7EB] bg-[#F8F9FA] text-[#3C4043] hover:bg-white hover:border-[#137333]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="md:col-span-5 flex items-center gap-2">
                  <label className="text-xs font-bold text-[#5F6368] shrink-0">Custom Seconds:</label>
                  <input
                    type="number"
                    min={15}
                    max={1800}
                    step={15}
                    value={wendBoard.timeLimitSeconds || 120}
                    onChange={(e) => handleSetWendTimeLimit(Number(e.target.value))}
                    className="w-24 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-1.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:bg-white"
                  />
                  <span className="text-xs font-semibold text-[#5F6368]">seconds</span>
                </div>
              </div>
            </div>

            {/* Visual 8x8 Grid Editor Card */}
            <div className="rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F1F3F4]">
                <Grid className="h-5 w-5 text-[#1A73E8]" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#202124]">Interactive 8×8 Matrix Studio</h3>
                  <p className="text-[11px] text-[#5F6368]">
                    All cells are blocked (#) by default. Click any cell to type a letter and carve words. Use arrow keys to navigate. Double-click to block.
                  </p>
                </div>
              </div>

              <WendBoardAdminStudio
                board={wendBoard}
                onChange={handleUpdateBoard}
                previewWordPath={previewWordPath}
                onClearPreview={() => {
                  setPreviewWordId(null)
                  setPreviewWordPath(null)
                }}
                onResetBoard={handleResetToReferenceBoard}
              />
            </div>

            {/* Target Words Manager & Solvability Checker */}
            <div className="rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-[#FBBC04]" />
                <h3 className="text-base font-bold text-[#202124]">
                  Target Words to Discover ({wendBoard.targetWords.length})
                </h3>
              </div>

              {/* Add Target Word Form */}
              <form onSubmit={handleAddTargetWord} className="mb-6 flex flex-col gap-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1">
                      Target Word (All Caps)
                    </label>
                    <input
                      type="text"
                      value={newTargetWord}
                      onChange={(e) => setNewTargetWord(e.target.value)}
                      placeholder="e.g. LIGHT, SHIRE, INHI"
                      className="w-full uppercase tracking-wider rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4043] mb-1">
                      Optional Hint / Clue
                    </label>
                    <input
                      type="text"
                      value={newTargetHint}
                      onChange={(e) => setNewTargetHint(e.target.value)}
                      placeholder="e.g. Illuminating row across the bottom"
                      className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#1557B0] text-xs font-bold text-white shadow-xs hover:from-[#1765CC] hover:to-[#104D96] active:scale-95 transition-all self-start px-6 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Target Word</span>
                </button>
              </form>

              {/* Target Words List with Real-time Solvability Status */}
              <div className="flex flex-col gap-2.5">
                {wendBoard.targetWords.map((tw, idx) => {
                  const isEditingThisWord = editingTargetWordId === tw.id
                  const path = findWordPathInGrid(tw.word, wendBoard.grid)
                  const isSolvable = Boolean(path && path.length > 0)

                  if (isEditingThisWord) {
                    return (
                      <div
                        key={tw.id}
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col rounded-2xl border-2 border-[#1A73E8] bg-white p-4 shadow-sm animate-in zoom-in-95"
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-[#E5E7EB]">
                          <span className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="h-3 w-3" />
                            Editing Target Word #{idx + 1}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-[#3C4043] uppercase tracking-wider mb-1">
                              Target Word (All Caps)
                            </label>
                            <input
                              type="text"
                              value={editTargetWordStr}
                              onChange={(e) => setEditTargetWordStr(e.target.value)}
                              className="w-full uppercase tracking-wider rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-1.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white"
                              placeholder="e.g. LIGHT"
                              autoFocus
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#3C4043] uppercase tracking-wider mb-1">
                              Optional Hint / Clue
                            </label>
                            <input
                              type="text"
                              value={editTargetWordHint}
                              onChange={(e) => setEditTargetWordHint(e.target.value)}
                              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-1.5 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:bg-white"
                              placeholder="e.g. Illuminating row across the bottom"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-[#F1F3F4]">
                          <button
                            type="button"
                            onClick={handleCancelEditTargetWord}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[11px] font-semibold text-[#5F6368] hover:bg-[#F1F3F4]"
                          >
                            <X className="h-3 w-3" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditTargetWord(tw.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#1557B0] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs hover:from-[#1765CC] hover:to-[#104D96] active:scale-95"
                          >
                            <Check className="h-3 w-3" />
                            <span>Save Word</span>
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={tw.id}
                      onClick={() => handleStartEditTargetWord(tw)}
                      className={`group/word flex items-center justify-between rounded-2xl border p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                        previewWordId === tw.id
                          ? 'border-[#34A853] bg-[#E6F4EA]/40'
                          : 'border-[#E5E7EB] bg-[#F8F9FA] hover:border-[#1A73E8]/50 hover:bg-white'
                      }`}
                      title="Click card to edit word and hint"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-[#5F6368] border border-[#E5E7EB]">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black tracking-wider text-[#202124] group-hover/word:text-[#1A73E8] transition-colors">
                              {tw.word}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#5F6368] border border-[#E5E7EB]">
                              {tw.word.length} letters
                            </span>
                            {/* Live Solvability Badge */}
                            {isSolvable ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] border border-[#34A853]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#137333]">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Solvable in Grid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE8E6] border border-[#EA4335]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#C5221F]">
                                <AlertCircle className="h-3 w-3" />
                                <span>Obstructed by Blocks</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {tw.hint ? (
                              <span className="text-xs text-[#5F6368]">{tw.hint}</span>
                            ) : (
                              <span className="text-[11px] text-[#9AA0A6] italic">No hint provided</span>
                            )}
                            <span className="text-[10px] font-semibold text-[#1A73E8] opacity-0 group-hover/word:opacity-100 transition-opacity">
                              • Click to edit
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Preview on Grid Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTogglePreviewWordPath(tw)
                          }}
                          title={previewWordId === tw.id ? 'Hide preview path' : 'Preview snake path on grid'}
                          className={`flex h-8 items-center gap-1 rounded-full px-3 text-xs font-bold transition-all cursor-pointer ${
                            previewWordId === tw.id
                              ? 'bg-[#34A853] text-white shadow-2xs'
                              : 'bg-white border border-[#E5E7EB] text-[#5F6368] hover:text-[#1A73E8] hover:border-[#1A73E8]'
                          }`}
                        >
                          {previewWordId === tw.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span className="hidden sm:inline">{previewWordId === tw.id ? 'Hide Path' : 'Show Path'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTargetWord(tw.id)
                          }}
                          title="Delete target word"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#EA4335] hover:bg-[#FCE8E6] transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL 4: AUTOMATED WINNER CEREMONY PRODUCER (3rd, 2nd, 1st) */}
        {/* ======================================================== */}
        {activeTab === 'winners' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Header & Track Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 border border-[#E5E7EB] shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center bg-[#FEF7E0] text-[#B06000] border border-[#FBBC04]/50">
                    <Crown className="h-4 w-4 text-[#FBBC04]" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#202124] uppercase font-mono">
                    Automated Winner Announcement (3rd → 2nd → 1st)
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#5F6368]">
                  Derived automatically: <strong>1st Priority</strong> = Correct Answers / Score, <strong>2nd Priority</strong> = Faster Completion Time (ms) on ties.
                </p>
              </div>

              {/* Track Selector */}
              <div className="flex items-center gap-1 border border-[#E5E7EB] bg-[#F8F9FA] p-1 shadow-2xs self-start sm:self-auto font-mono text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleSelectWinnersTrack('web-dev-quiz')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedSlug === 'web-dev-quiz'
                      ? 'bg-white text-[#1967D2] shadow-xs border border-[#1A73E8]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  <span>Web Sprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectWinnersTrack('mentis-quiz')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedSlug === 'mentis-quiz'
                      ? 'bg-white text-[#B06000] shadow-xs border border-[#FBBC04]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  <Brain className="h-3 w-3" />
                  <span>Mentis</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectWinnersTrack('wend-game')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedSlug === 'wend-game'
                      ? 'bg-white text-[#137333] shadow-xs border border-[#34A853]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  <Gamepad2 className="h-3 w-3" />
                  <span>Wend Game</span>
                </button>
              </div>
            </div>

            {/* Broadcast Stage Action Banner */}
            <div className="relative overflow-hidden border-2 border-[#FBBC04] bg-[#FFF9E6] p-6 sm:p-8 text-center shadow-xs">
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center border border-[#FBBC04] bg-[#FBBC04] text-[#202124] shadow-xs mb-3">
                  <Crown className="h-6 w-6 fill-current" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#202124] tracking-tight uppercase font-mono">
                  Ready to Broadcast Official Winners Ceremony?
                </h3>
                <p className="text-xs sm:text-sm text-[#5F6368] max-w-xl mx-auto mt-2 mb-4 leading-relaxed font-medium">
                  Broadcasting triggers the suspense countdown sequence, reveals 3rd place, 2nd place, 1st place champion with golden fanfare, and opens the victory leaderboard live on ALL connected screens!
                </p>

                {/* Timeline Step Sequence Indicator */}
                <div className="mb-5 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[11px] font-bold text-[#5F6368] bg-white px-4 py-2 border border-[#E5E7EB] shadow-2xs">
                  <span className="text-[#1A73E8]">1. 5s Countdown</span>
                  <span>➔</span>
                  <span className="text-[#E37400]">2. 3rd Place</span>
                  <span>➔</span>
                  <span className="text-[#5F6368]">3. 2nd Place</span>
                  <span>➔</span>
                  <span className="text-[#B06000]">4. 1st Place Champion</span>
                  <span>➔</span>
                  <span className="text-[#137333]">5. Full Victory Standings</span>
                </div>

                {/* WebSocket Health Badge */}
                <div className="mb-4 inline-flex items-center gap-2 bg-white px-4 py-1.5 font-mono text-xs font-bold shadow-2xs border border-[#E5E7EB]">
                  {connected ? (
                    <>
                      <span className="h-2 w-2 bg-[#34A853] animate-pulse" />
                      <span className="text-[#137333]">WEBSOCKET CONNECTED & LIVE</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 bg-[#EA4335]" />
                      <span className="text-[#C5221F]">WEBSOCKET LOCAL / STANDBY</span>
                    </>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleBroadcastWinnerCeremony()}
                    disabled={automatedRanking.winners.length === 0}
                    className={`inline-flex h-13 items-center justify-center gap-2.5 rounded-full px-8 text-sm font-black text-white shadow-lg transition-all active:scale-95 cursor-pointer ${
                      automatedRanking.winners.length === 0
                        ? 'bg-[#BDC1C6] cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-[#1A73E8] via-[#1557B0] to-[#0D47A1] hover:shadow-[#1A73E8]/30 ring-4 ring-[#1A73E8]/20 hover:scale-[1.02]'
                    }`}
                  >
                    <Rocket className="h-4.5 w-4.5" />
                    <span>Start Broadcast ({automatedRanking.winners.length} Winners Ready)</span>
                  </button>
                </div>

                {automatedRanking.winners.length === 0 && (
                  <div className="mt-3.5">
                    <button
                      type="button"
                      onClick={() => handleSimulateTieTest(selectedSlug)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#1A73E8] border border-[#E5E7EB] hover:bg-[#F8F9FA] shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#FBBC04]" />
                      <span>Load Test Participants to Try Broadcast</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Automated Victory Podium (1st, 2nd, 3rd) Derived Mathematically */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="text-base font-bold text-[#202124] flex items-center gap-2">
                    <Trophy className="h-4.5 w-4.5 text-[#FBBC04]" />
                    <span>Automated Contest Podium (Top 3)</span>
                  </h3>
                  <p className="text-[11px] text-[#5F6368]">
                    Calculated automatically from live participant attempts using the strict tie-breaker engine.
                  </p>
                </div>
              </div>

              {automatedRanking.winners.length === 0 ? (
                <div className="rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-8 text-center shadow-xs">
                  <Trophy className="h-10 w-10 text-[#E5E7EB] mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-[#202124]">No Submissions Recorded Yet for this Track</h4>
                  <p className="text-xs text-[#5F6368] max-w-md mx-auto mt-1 mb-4 leading-relaxed font-medium">
                    When attendees submit their challenge responses, their scores and completion times will automatically populate the victory podium and tie-breaker standings.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => refreshStandings(selectedSlug)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-[#3C4043] hover:bg-[#F8F9FA] cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateTieTest(selectedSlug)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#1557B0] px-4 py-2 text-xs font-bold text-white hover:shadow-md shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Simulate Tie-Breaker Demo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* 2nd Place Card (Silver Medalist) */}
                  {automatedRanking.winners.find((w) => w.rank === 2) ? (
                    (() => {
                      const w2 = automatedRanking.winners.find((w) => w.rank === 2)!
                      return (
                        <div className="rounded-3xl border-2 border-[#9AA0A6]/50 bg-white p-5 shadow-xs flex flex-col gap-3 relative overflow-hidden order-2 md:order-1">
                          <div className="absolute top-0 right-0 bg-[#F1F3F4] border-b border-l border-[#E5E7EB] px-3 py-1 rounded-bl-xl text-[10px] font-black text-[#5F6368] uppercase tracking-wider">
                            Runner-Up
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F3F4] text-xs font-black text-[#5F6368]">
                              2nd
                            </span>
                            <span className="text-xs font-black text-[#5F6368] inline-flex items-center gap-1">
                              <Medal className="h-3.5 w-3.5 text-[#9AA0A6]" />
                              <span>Silver Medalist</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 py-1">
                            <img
                              src={w2.avatar}
                              alt={w2.name}
                              className="h-14 w-14 rounded-full border-2 border-[#9AA0A6] object-cover shadow-sm ring-4 ring-[#9AA0A6]/20"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[#202124]">{w2.name}</span>
                              <span className="text-[11px] text-[#5F6368] font-medium">Rank #2 Standing</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-[#F1F3F4]">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-[#5F6368] flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
                                <span>Correct / Score:</span>
                              </span>
                              <span className="font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-full">
                                {w2.correctCount ?? Math.floor(w2.score / 100)} Correct • {w2.score} pts
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-[#5F6368] flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#137333]" />
                                <span>Duration:</span>
                              </span>
                              <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                                {formatDuration(w2.durationMs)}
                              </span>
                            </div>

                            {w2.tieBrokenByTime && (
                              <div className="mt-1 flex items-center gap-1 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] p-2 text-[10px] font-bold text-[#5F6368]">
                                <Zap className="h-3 w-3 shrink-0 text-[#9AA0A6]" />
                                <span>Tied on Score • Rank decided by completion time</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#E5E7EB] p-6 text-center text-xs text-[#5F6368] order-2 md:order-1 flex flex-col items-center justify-center min-h-[180px]">
                      <Medal className="h-6 w-6 text-[#E5E7EB] mb-1" />
                      <span>Awaiting 2nd Place Participant</span>
                    </div>
                  )}

                  {/* 1st Place Card (Grand Champion - Gold) */}
                  {automatedRanking.winners.find((w) => w.rank === 1) ? (
                    (() => {
                      const w1 = automatedRanking.winners.find((w) => w.rank === 1)!
                      return (
                        <div className="rounded-3xl border-2 border-[#FBBC04] bg-white p-6 shadow-md flex flex-col gap-3 ring-4 ring-[#FBBC04]/20 relative overflow-hidden order-1 md:order-2 scale-[1.02] -translate-y-2">
                          <div className="absolute top-0 right-0 bg-[#FEF7E0] border-b border-l border-[#FBBC04]/50 px-3.5 py-1 rounded-bl-xl text-[10px] font-black text-[#B06000] uppercase tracking-wider">
                            Grand Champion
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF7E0] text-sm font-black text-[#B06000] shadow-xs">
                              1st
                            </span>
                            <span className="text-xs font-black text-[#B06000] inline-flex items-center gap-1">
                              <Crown className="h-4 w-4 text-[#FBBC04]" />
                              <span>Gold Medalist</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 py-1">
                            <img
                              src={w1.avatar}
                              alt={w1.name}
                              className="h-16 w-16 rounded-full border-2 border-[#FBBC04] object-cover shadow-md ring-4 ring-[#FBBC04]/30"
                            />
                            <div className="flex flex-col">
                              <span className="text-base font-black text-[#202124]">{w1.name}</span>
                              <span className="text-xs text-[#B06000] font-bold">Tournament Champion</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-[#F1F3F4]">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-[#5F6368] flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
                                <span>Correct / Score:</span>
                              </span>
                              <span className="font-bold text-[#1A73E8] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full">
                                {w1.correctCount ?? Math.floor(w1.score / 100)} Correct • {w1.score} pts
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-[#5F6368] flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#137333]" />
                                <span>Duration:</span>
                              </span>
                              <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                                {formatDuration(w1.durationMs)}
                              </span>
                            </div>

                            {w1.tieBrokenByTime && (
                              <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-[#FEF7E0] border border-[#FBBC04]/50 p-2 text-[10px] font-black text-[#B06000]">
                                <Zap className="h-3.5 w-3.5 shrink-0 text-[#FBBC04]" />
                                <span>Tied on Score • Won 1st Place by Faster Speed!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#E5E7EB] p-6 text-center text-xs text-[#5F6368] order-1 md:order-2 flex flex-col items-center justify-center min-h-[180px]">
                      <Crown className="h-6 w-6 text-[#E5E7EB] mb-1" />
                      <span>Awaiting 1st Place Champion</span>
                    </div>
                  )}

                  {/* 3rd Place Card (Bronze Medalist) */}
                  {automatedRanking.winners.find((w) => w.rank === 3) ? (
                    (() => {
                      const w3 = automatedRanking.winners.find((w) => w.rank === 3)!
                      return (
                        <div className="rounded-3xl border-2 border-[#E37400]/40 bg-white p-5 shadow-xs flex flex-col gap-3 relative overflow-hidden order-3">
                          <div className="absolute top-0 right-0 bg-[#FBE9E7] border-b border-l border-[#E37400]/30 px-3 py-1 rounded-bl-xl text-[10px] font-black text-[#E37400] uppercase tracking-wider">
                            Bronze
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FBE9E7] text-xs font-black text-[#E37400]">
                              3rd
                            </span>
                            <span className="text-xs font-black text-[#E37400] inline-flex items-center gap-1">
                              <Award className="h-3.5 w-3.5 text-[#E37400]" />
                              <span>Bronze Medalist</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 py-1">
                            <img
                              src={w3.avatar}
                              alt={w3.name}
                              className="h-14 w-14 rounded-full border-2 border-[#E37400] object-cover shadow-sm ring-4 ring-[#E37400]/20"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[#202124]">{w3.name}</span>
                              <span className="text-[11px] text-[#5F6368] font-medium">Rank #3 Standing</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-[#F1F3F4]">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-[#5F6368] flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
                                <span>Correct / Score:</span>
                              </span>
                              <span className="font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-full">
                                {w3.correctCount ?? Math.floor(w3.score / 100)} Correct • {w3.score} pts
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-[#5F6368] flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#137333]" />
                                <span>Duration:</span>
                              </span>
                              <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                                {formatDuration(w3.durationMs)}
                              </span>
                            </div>

                            {w3.tieBrokenByTime && (
                              <div className="mt-1 flex items-center gap-1 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] p-2 text-[10px] font-bold text-[#5F6368]">
                                <Zap className="h-3 w-3 shrink-0 text-[#E37400]" />
                                <span>Tied on Score • Rank decided by completion time</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#E5E7EB] p-6 text-center text-xs text-[#5F6368] order-3 flex flex-col items-center justify-center min-h-[180px]">
                      <Award className="h-6 w-6 text-[#E5E7EB] mb-1" />
                      <span>Awaiting 3rd Place Participant</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Official Ranked Standings & Audit Table */}
            <div className="rounded-3xl border border-[#E5E7EB]/80 bg-white/90 backdrop-blur-md p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-[#F1F3F4]">
                <div>
                  <h3 className="text-base font-bold text-[#202124] flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#1A73E8]" />
                    <span>Official Standings & Tie-Breaker Audit ({automatedRanking.rankedParticipants.length})</span>
                  </h3>
                  <p className="text-xs text-[#5F6368] mt-0.5 font-medium">
                    Strict Two-Tier Algorithm: 1st Priority = Highest Correct Answers/Score → 2nd Priority = Lowest Time Taken (ms).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refreshStandings(selectedSlug)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-bold text-[#3C4043] hover:bg-[#F8F9FA] transition-colors shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateTieTest(selectedSlug)}
                    title="Load sample attempts to demonstrate tie-breaking by time"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1A73E8]/40 bg-[#E8F0FE] px-3.5 py-1.5 text-xs font-bold text-[#1A73E8] hover:bg-[#D2E3FC] active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Simulate Tie-Breaker Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearSessions(selectedSlug)}
                    title="Wipe current track session receipts"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#EA4335]/30 bg-white px-3.5 py-1.5 text-xs font-bold text-[#C5221F] hover:bg-[#FCE8E6] transition-colors shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Track</span>
                  </button>
                </div>
              </div>

              {automatedRanking.rankedParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5F6368]">
                  <HelpCircle className="h-8 w-8 text-[#E5E7EB] mx-auto mb-2" />
                  <p className="font-bold text-[#202124]">No participant submissions recorded yet for this track</p>
                  <p className="mt-1 font-medium">
                    When attendees submit their responses, their ranked standing will automatically calculate here in real-time.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleSimulateTieTest(selectedSlug)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#1557B0] px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-[#1765CC] hover:to-[#104D96] cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Simulate Tie-Breaker Demo (4 Participants)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                  {automatedRanking.rankedParticipants.map((p) => {
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 text-xs transition-all ${
                          p.rank === 1
                            ? 'border-[#FBBC04] bg-[#FFF8E1]/40 shadow-xs'
                            : p.rank === 2
                            ? 'border-[#9AA0A6] bg-[#F8F9FA]'
                            : p.rank === 3
                            ? 'border-[#E37400]/40 bg-[#FBE9E7]/30'
                            : 'border-[#E5E7EB] bg-white hover:border-[#BDC1C6]'
                        }`}
                      >
                        {/* Left: Rank & Participant */}
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                              p.rank === 1
                                ? 'bg-[#FBBC04] text-[#202124] shadow-xs'
                                : p.rank === 2
                                ? 'bg-[#9AA0A6] text-white shadow-xs'
                                : p.rank === 3
                                ? 'bg-[#E37400] text-white shadow-xs'
                                : 'bg-[#F1F3F4] text-[#5F6368]'
                            }`}
                          >
                            #{p.rank}
                          </span>

                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="h-10 w-10 rounded-full border border-[#E5E7EB] object-cover"
                          />

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#202124] text-sm">{p.name}</span>
                              {p.rank === 1 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/40 px-2 py-0.2 text-[10px] font-bold text-[#B06000]">
                                  <Crown className="h-3 w-3" />
                                  1st Place
                                </span>
                              )}
                              {p.rank === 2 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F3F4] border border-[#E5E7EB] px-2 py-0.2 text-[10px] font-bold text-[#5F6368]">
                                  <Medal className="h-3 w-3" />
                                  2nd Place
                                </span>
                              )}
                              {p.rank === 3 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FBE9E7] border border-[#E37400]/40 px-2 py-0.2 text-[10px] font-bold text-[#E37400]">
                                  <Award className="h-3 w-3" />
                                  3rd Place
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#5F6368]">
                              Submitted: {new Date(p.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Right: Priority Badges & Tie-Break Notes */}
                        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                          {/* Priority 1 Badge */}
                          <span
                            title="Priority 1: Correct answers and points"
                            className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/30 px-3 py-1 text-xs font-bold text-[#1967D2]"
                          >
                            <Award className="h-3.5 w-3.5 text-[#1967D2]" />
                            <span>{p.correctCount} / {p.totalItems} Correct ({p.score} pts)</span>
                          </span>

                          {/* Priority 2 Badge */}
                          <span
                            title="Priority 2: Duration taken"
                            className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E5E7EB] px-3 py-1 text-xs font-bold text-[#137333]"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDuration(p.durationMs)}</span>
                          </span>

                          {/* Tie-Breaker Explanation Badge */}
                          {p.tieBrokenByTime ? (
                            <span
                              title="Tied with another participant on correct answers. Resolved by completion time."
                              className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/50 px-2.5 py-1 text-[11px] font-bold text-[#B06000]"
                            >
                              <Zap className="h-3 w-3 text-[#FBBC04]" />
                              <span>
                                {p.rank === 1
                                  ? 'Won 1st by Speed'
                                  : p.timeDiffVsTiedMs
                                  ? `Tie-Break (${(p.timeDiffVsTiedMs / 1000).toFixed(1)}s diff)`
                                  : 'Tie Resolved by Speed'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9AA0A6] italic hidden lg:inline">
                              Score Rank
                            </span>
                          )}

                          {/* Admin Delete User from Standings */}
                          <button
                            type="button"
                            onClick={() => handleDeleteParticipantStanding(p.id, p.name)}
                            title={`Delete ${p.name} from standings`}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-[#EA4335] hover:bg-[#FCE8E6] transition-colors cursor-pointer shrink-0 border border-[#EA4335]/30 bg-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A73E8] border-t-transparent" />
          <p className="mt-3 text-xs text-[#5F6368]">Loading Command Center...</p>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  )
}
