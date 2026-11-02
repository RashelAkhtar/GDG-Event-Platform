'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  api,
  DEFAULT_WEB_EVENT,
  DEFAULT_MENTIS_EVENT,
  DEFAULT_WEND_EVENT,
  GdgEvent,
  QuestionData,
  WendWord,
  WendBoardConfig,
  findWordPathInGrid,
  DEFAULT_WEND_BOARD,
  CeremonyWinner,
  RankedParticipant,
  LeaderboardEntry,
} from '@/lib/api'
import { useWebSocket } from '@/context/WebSocketContext'
import { useAuth } from '@/context/AuthContext'
import {
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Award,
  Play,
  Trophy,
  Type,
  ListOrdered,
  Sparkles,
  Trash2,
  Edit2,
  Edit3,
  Sliders,
  Send,
  UserCheck,
  RefreshCw,
  Crown,
  Medal,
  Rocket,
  Grid,
  Layers,
  RotateCcw,
  Check,
  X,
  Zap,
  Eye,
  EyeOff,
  CornerDownLeft,
} from 'lucide-react'
import { LockedIllustration, UnlockedIllustration } from '@/components/ui/LockIllustrations'
import { AnimatedLockToggle } from '@/components/ui/AnimatedLockToggle'
import { SecurityNotificationBell } from '@/components/security/SecurityNotificationBell'

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

export default function AdminPage() {
  const { user } = useAuth()
  const { gameLockStates, sendLockToggle, sendCountdownStart, sendWinnerCeremonyStart, sendLeaderboardReset, liveLeaderboards, subscribeToLeaderboardUpdate, connected } = useWebSocket()

  const [webEvent, setWebEvent] = useState<GdgEvent>(DEFAULT_WEB_EVENT)
  const [mentisEvent, setMentisEvent] = useState<GdgEvent>(DEFAULT_MENTIS_EVENT)
  const [wendEvent, setWendEvent] = useState<GdgEvent>(DEFAULT_WEND_EVENT)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Top Tabs: 'locks' | 'quiz' | 'wend' | 'winners'
  const [activeTab, setActiveTab] = useState<'locks' | 'quiz' | 'wend' | 'winners'>('locks')

  // Selected event for question manager
  const [selectedSlug, setSelectedSlug] = useState<string>('web-dev-quiz')
  const [questionsList, setQuestionsList] = useState<QuestionData[]>(() =>
    api.getQuestionsForSlug('web-dev-quiz')
  )

  // New question form state
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0)
  const [points, setPoints] = useState(100)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(30)

  // Wend game correct words & Snake Board Studio
  const [wendWords, setWendWords] = useState<WendWord[]>(() => api.getWendWords())
  const [newWendWord, setNewWendWord] = useState('')
  const [newWendClue, setNewWendClue] = useState('')
  const [newWendPoints, setNewWendPoints] = useState(150)

  // Wend Snake Board Studio state
  const [wendBoard, setWendBoard] = useState<WendBoardConfig>(() => api.getWendBoard())
  const [wendGridEditMode, setWendGridEditMode] = useState<'OBSTACLE' | 'LETTER'>('OBSTACLE')
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
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

  // Div Card Inline Editing (Panel 1: Div Locks)
  const [editingDivSlug, setEditingDivSlug] = useState<string | null>(null)
  const [editDivTitle, setEditDivTitle] = useState('')
  const [editDivDescription, setEditDivDescription] = useState('')
  const [savingDivEdit, setSavingDivEdit] = useState(false)

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

  const refreshStandings = async (slug = selectedSlug) => {
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
  }

  useEffect(() => {
    const unsub = subscribeToLeaderboardUpdate((updatedSlug) => {
      refreshStandings(updatedSlug)
    })
    return () => unsub()
  }, [subscribeToLeaderboardUpdate, selectedSlug])

  useEffect(() => {
    if (activeTab === 'winners') {
      const timer = setTimeout(() => {
        refreshStandings(selectedSlug)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [activeTab, selectedSlug])

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

  const handleStart5sCountdown = (slug: string, title: string) => {
    sendCountdownStart(slug)
    showToast(`Broadcasted 5-4-3-2-1 launch countdown for ${title}!`)
  }

  // --- 1.1 INLINE DIV EDITING HANDLERS (PANEL 1) ---
  const handleStartEditDiv = (slug: 'web-dev-quiz' | 'mentis-quiz' | 'wend-game') => {
    const target = slug === 'web-dev-quiz' ? webEvent : slug === 'mentis-quiz' ? mentisEvent : wendEvent
    setEditingDivSlug(slug)
    setEditDivTitle(target.title)
    setEditDivDescription(target.description)
  }

  const handleCancelEditDiv = () => {
    setEditingDivSlug(null)
    setEditDivTitle('')
    setEditDivDescription('')
  }

  const handleSaveDivEdit = async (slug: 'web-dev-quiz' | 'mentis-quiz' | 'wend-game') => {
    const target = slug === 'web-dev-quiz' ? webEvent : slug === 'mentis-quiz' ? mentisEvent : wendEvent
    const setEvent = slug === 'web-dev-quiz' ? setWebEvent : slug === 'mentis-quiz' ? setMentisEvent : setWendEvent
    setSavingDivEdit(true)
    try {
      const updatedTitle = editDivTitle.trim() || target.title
      const updatedDescription = editDivDescription.trim() || target.description
      await api.updateEventDetails(target._id, {
        title: updatedTitle,
        description: updatedDescription,
      })
      const updatedEvent: GdgEvent = { ...target, title: updatedTitle, description: updatedDescription }
      setEvent(updatedEvent)
      setEditingDivSlug(null)
      showToast(`Saved div updates for "${updatedTitle}"!`)
    } catch {
      showToast('Failed to save div updates', 'error')
    } finally {
      setSavingDivEdit(false)
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
    setEditingTargetWordId(null)
    showToast(`Target word updated to "${cleanWord}"!`)
  }

  // --- 2. QUIZ QUESTIONS & ANSWER KEYS MANAGER ---
  const handleSelectQuizTrack = (slug: string) => {
    setSelectedSlug(slug)
    setQuestionsList(api.getQuestionsForSlug(slug))
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
    showToast('Question removed from quiz pool')
  }

  // --- 3. WEND GAME CORRECT WORDS MANAGER ---
  const handleAddWendWord = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWendWord.trim() || !newWendClue.trim()) {
      showToast('Word and clue are required', 'error')
      return
    }

    const wordItem: WendWord = {
      id: `w_${wendWords.length + 1}_${newWendWord.trim().toLowerCase()}`,
      word: newWendWord.trim().toUpperCase(),
      clue: newWendClue.trim(),
      points: Number(newWendPoints),
      round: wendWords.length + 1,
    }

    const updated = [...wendWords, wordItem]
    setWendWords(updated)
    api.saveWendWords(updated)

    setNewWendWord('')
    setNewWendClue('')
    showToast(`Correct word "${wordItem.word}" added for Wend game!`)
  }

  const handleDeleteWendWord = (id: string) => {
    const updated = wendWords.filter((w) => w.id !== id)
    setWendWords(updated)
    api.saveWendWords(updated)
    showToast('Word removed from Wend game')
  }

  // --- WEND GAME SNAKE BOARD STUDIO HANDLERS ---
  const moveFocus = (dr: number, dc: number) => {
    setFocusedCell((prev) => {
      let nextR = prev.r + dr
      let nextC = prev.c + dc
      // Wrap-around columns across rows
      if (nextC >= wendBoard.cols) {
        if (nextR < wendBoard.rows - 1) {
          nextR += 1
          nextC = 0
        } else {
          nextC = wendBoard.cols - 1
        }
      } else if (nextC < 0) {
        if (nextR > 0) {
          nextR -= 1
          nextC = wendBoard.cols - 1
        } else {
          nextC = 0
        }
      }
      nextR = Math.max(0, Math.min(wendBoard.rows - 1, nextR))
      nextC = Math.max(0, Math.min(wendBoard.cols - 1, nextC))
      return { r: nextR, c: nextC }
    })
  }

  const handleToggleCellType = (r: number, c: number) => {
    const updatedGrid = wendBoard.grid.map((rowArr, rowIdx) =>
      rowArr.map((cell, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          const isObstacle = cell.type === 'OBSTACLE'
          return {
            ...cell,
            type: (isObstacle ? 'LETTER' : 'OBSTACLE') as 'LETTER' | 'OBSTACLE',
            letter: isObstacle ? cell.letter || '' : undefined,
          }
        }
        return cell
      })
    )
    const updatedBoard = { ...wendBoard, grid: updatedGrid }
    setWendBoard(updatedBoard)
    api.saveWendBoard(updatedBoard)
  }

  const handleSetCellLetter = (r: number, c: number, letter: string) => {
    const char = letter.slice(-1).toUpperCase()
    const updatedGrid = wendBoard.grid.map((rowArr, rowIdx) =>
      rowArr.map((cell, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          return {
            ...cell,
            type: 'LETTER' as const,
            letter: char,
          }
        }
        return cell
      })
    )
    const updatedBoard = { ...wendBoard, grid: updatedGrid }
    setWendBoard(updatedBoard)
    api.saveWendBoard(updatedBoard)
  }

  const handleClearCell = (r: number, c: number) => {
    handleSetCellLetter(r, c, '')
  }

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    const isTargetInput = targetTag === 'input' || targetTag === 'textarea'

    // If focused on an external form input, do not capture unless navigation arrows
    if (isTargetInput && !(e.target as HTMLElement)?.classList?.contains('grid-box-input')) {
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveFocus(-1, 0)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveFocus(1, 0)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      moveFocus(0, -1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      moveFocus(0, 1)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const { r, c } = focusedCell
      const currentCell = wendBoard.grid[r]?.[c]
      if (currentCell && currentCell.letter) {
        handleSetCellLetter(r, c, '')
      } else {
        moveFocus(0, -1)
        const prevC = c > 0 ? c - 1 : (r > 0 ? wendBoard.cols - 1 : 0)
        const prevR = c > 0 ? r : Math.max(0, r - 1)
        handleSetCellLetter(prevR, prevC, '')
      }
    } else if (e.key === 'Delete') {
      e.preventDefault()
      handleClearCell(focusedCell.r, focusedCell.c)
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      handleToggleCellType(focusedCell.r, focusedCell.c)
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      const char = e.key.toUpperCase()
      handleSetCellLetter(focusedCell.r, focusedCell.c, char)
      moveFocus(0, 1)
    }
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
    showToast('Target word removed from board')
  }

  const handleResetToReferenceBoard = () => {
    const defaultBoard = api.resetWendBoard()
    setWendBoard(defaultBoard)
    showToast('Reset Wend Board to Reference "H & I" Layout!', 'success')
  }

  const handleSetWendTimeLimit = (seconds: number) => {
    const updated = api.setWendTimeLimit(seconds)
    setWendBoard(updated)
    showToast(`Updated Wend round time limit to ${seconds}s (${formatDuration(seconds * 1000)})! Reflects live on user screens.`)
  }

  // --- 4. WINNER CEREMONY BROADCAST (AUTOMATED PODIUM 3rd, 2nd, 1st) ---
  const handleSelectWinnersTrack = (slug: 'web-dev-quiz' | 'mentis-quiz' | 'wend-game') => {
    setSelectedSlug(slug)
    refreshStandings(slug)
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

    return (
    <div className="relative min-h-screen flex flex-col bg-[#F8F9FA] text-[#202124] overflow-x-hidden selection:bg-[#4285F4]/20 selection:text-[#1A73E8]">
      {/* Ambient Animated Google Theme Aurora Background Mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Subtle Google Tech Dot Matrix Grid */}
        <div className="absolute inset-0 bg-google-grid opacity-60" />

        {/* Dynamic Glowing Aurora Orbs with CSS Keyframe Animation */}
        <div className="absolute -top-32 -left-32 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#4285F4]/20 via-[#4285F4]/10 to-transparent blur-3xl animate-mesh-1" />
        <div className="absolute top-1/4 -right-36 h-[580px] w-[580px] rounded-full bg-gradient-to-br from-[#EA4335]/16 via-[#EA4335]/08 to-transparent blur-3xl animate-mesh-2" />
        <div className="absolute bottom-1/3 left-1/4 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[#FBBC04]/18 via-[#FBBC04]/08 to-transparent blur-3xl animate-mesh-3" />
        <div className="absolute -bottom-28 right-1/4 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#34A853]/18 via-[#34A853]/08 to-transparent blur-3xl animate-mesh-4" />
      </div>

      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-[#DADCE0]/80 bg-white/80 backdrop-blur-xl shadow-xs">
        {/* Top Google 4-Color Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DADCE0] bg-white/90 text-[#5F6368] hover:bg-white hover:text-[#202124] hover:shadow-xs transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#4285F4] text-white shadow-sm shadow-[#1A73E8]/30">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-[#202124] leading-none">
                    GDG Admin Command Center
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/20 px-2 py-0.5 text-[10px] font-bold text-[#1967D2]">
                    <Sparkles className="h-2.5 w-2.5 text-[#1A73E8]" />
                    Host
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#5F6368]">
                  <span>Active Session:</span>
                  <strong className="font-semibold text-[#1A73E8]">aryan.crores@gmail.com</strong>
                </div>
              </div>
            </div>
          </div>

          {/* WebSocket Status Indicator & Security Alerts Bell */}
          <div className="flex items-center gap-2.5">
            <SecurityNotificationBell />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0]/80 bg-white/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-[#3C4043] shadow-2xs">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-[#34A853] shadow-[0_0_8px_#34A853]' : 'bg-[#FBBC04] animate-pulse'}`} />
              <span>{connected ? 'WebSocket Live' : 'Local Channel'}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-6 pb-20 sm:px-6">
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

        {/* 4 Dedicated Navigation Control Panels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <button
            onClick={() => setActiveTab('locks')}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-semibold border transition-all ${
              activeTab === 'locks'
                ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                : 'bg-white text-[#3C4043] border-[#DADCE0] hover:bg-[#F8F9FA]'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>1. Div Lock & Start</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-semibold border transition-all ${
              activeTab === 'quiz'
                ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                : 'bg-white text-[#3C4043] border-[#DADCE0] hover:bg-[#F8F9FA]'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            <span>2. Quiz & Answers</span>
          </button>

          <button
            onClick={() => setActiveTab('wend')}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-semibold border transition-all ${
              activeTab === 'wend'
                ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                : 'bg-white text-[#3C4043] border-[#DADCE0] hover:bg-[#F8F9FA]'
            }`}
          >
            <Type className="h-4 w-4" />
            <span>3. Wend Game Words</span>
          </button>

          <button
            onClick={() => setActiveTab('winners')}
            className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-semibold border transition-all ${
              activeTab === 'winners'
                ? 'bg-[#FBBC04] text-[#202124] border-[#FBBC04] shadow-xs font-bold'
                : 'bg-white text-[#3C4043] border-[#DADCE0] hover:bg-[#F8F9FA]'
            }`}
          >
            <Crown className="h-4 w-4 text-[#FBBC04]" />
            <span>4. Winner Ceremony</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* PANEL 1: DIV LOCK / UNLOCK & LIVE COUNTDOWN LAUNCHER    */}
        {/* ======================================================== */}
        {activeTab === 'locks' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-xl font-normal tracking-tight text-[#202124]">
                  Quiz & Game Div Locks (Real-Time Mobile Control)
                </h2>
                <p className="mt-0.5 text-xs text-[#5F6368]">
                  Click the lock/unlock switch or padlock to toggle immediately. Click directly on any div card to edit its title and description.
                </p>
              </div>
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] px-3 py-1 text-[11px] font-semibold text-[#1967D2]">
                <span className="h-2 w-2 rounded-full bg-[#34A853] animate-pulse" />
                Live WebSocket Synced
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Top Div: Web Quiz Track */}
              {(() => {
                const slug = 'web-dev-quiz' as const
                const event = webEvent
                const isLive = isWebLive
                const isEditing = editingDivSlug === slug
                const isUpdating = updatingId === event._id

                return (
                  <div
                    key={slug}
                    onClick={() => {
                      if (!isEditing) handleStartEditDiv(slug)
                    }}
                    className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-5 shadow-2xs ${
                      isEditing
                        ? 'border-[#1A73E8] bg-[#F8F9FA] ring-2 ring-[#1A73E8]/20'
                        : isLive
                        ? 'border-[#34A853]/40 bg-white ring-1 ring-[#34A853]/15 hover:shadow-md cursor-pointer hover:border-[#34A853]'
                        : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6] hover:shadow-sm cursor-pointer'
                    }`}
                    title={!isEditing ? 'Click on div to edit title & description' : undefined}
                  >
                    <div>
                      {/* Top Header: Track Tag & Lock/Unlock Switch */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#E8F0FE] px-2.5 py-1 text-[11px] font-semibold text-[#1967D2]">
                          Top Div • Web Track
                        </span>

                        {/* Interactive Lock/Unlock Switch Pill */}
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleDivLock(slug, isLive)
                          }}
                          title={isLive ? 'Click to switch to LOCKED' : 'Click to switch to UNLOCKED'}
                          className={`group/switch inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            isLive
                              ? 'bg-[#E6F4EA] border border-[#34A853]/40 text-[#137333] hover:bg-[#CEEAD6]'
                              : 'bg-[#F1F3F4] border border-[#DADCE0] text-[#5F6368] hover:bg-[#E8EAED]'
                          }`}
                        >
                          {isLive ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-[#34A853] animate-pulse" />
                              <span>UNLOCKED</span>
                              <span className="ml-1 inline-flex h-4 w-7 items-center rounded-full bg-[#34A853] px-0.5 transition-colors">
                                <span className="h-3 w-3 translate-x-3 rounded-full bg-white shadow-xs transition-transform" />
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>LOCKED</span>
                              <span className="ml-1 inline-flex h-4 w-7 items-center rounded-full bg-[#BDC1C6] px-0.5 transition-colors">
                                <span className="h-3 w-3 translate-x-0 rounded-full bg-white shadow-xs transition-transform" />
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Interactive Padlock Illustration (Click to Switch Lock/Unlock) */}
                      <div className="my-3 flex justify-center">
                        <AnimatedLockToggle
                          id={`admin-lock-${slug}`}
                          checked={isLive}
                          isAdmin={true}
                          disabled={isUpdating}
                          onChange={() => handleToggleDivLock(slug, isLive)}
                          size="md"
                          title={isLive ? 'Click lock to switch to LOCKED' : 'Click lock to switch to UNLOCKED'}
                        />
                      </div>

                      {/* Div Content: ONLY IF CLICKED -> Inline Editor */}
                      {isEditing ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 rounded-2xl border border-[#1A73E8]/30 bg-white p-3.5 shadow-sm text-left animate-in zoom-in-95"
                        >
                          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[#DADCE0]">
                            <span className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                              <Edit3 className="h-3 w-3" />
                              Edit Div Content
                            </span>
                            <span className="text-[10px] font-medium text-[#5F6368]">Live Edit</span>
                          </div>

                          <div className="space-y-2.5 text-left">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5F6368] mb-1">Track Title</label>
                              <input
                                type="text"
                                value={editDivTitle}
                                onChange={(e) => setEditDivTitle(e.target.value)}
                                className="w-full rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                                placeholder="Enter track title"
                                autoFocus
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-[#5F6368] mb-1">Description</label>
                              <textarea
                                rows={2}
                                value={editDivDescription}
                                onChange={(e) => setEditDivDescription(e.target.value)}
                                className="w-full rounded-xl border border-[#DADCE0] bg-white p-2 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                                placeholder="Enter track description"
                              />
                            </div>

                            <div className="pt-2 border-t border-[#DADCE0]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveTab('quiz')
                                  setSelectedSlug(slug)
                                }}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E8F0FE] border border-[#1A73E8]/30 py-1.5 px-3 text-xs font-semibold text-[#1967D2] hover:bg-[#D2E3FC] transition-colors"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                                <span>Manipulate Questions & Answers ({api.getQuestionsForSlug(slug).length}) ➔</span>
                              </button>
                            </div>

                            <div className="pt-2 border-t border-[#DADCE0]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveTab('quiz')
                                  setSelectedSlug(slug)
                                }}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FEF7E0] border border-[#FBBC04]/40 py-1.5 px-3 text-xs font-semibold text-[#B06000] hover:bg-[#FFF8E1] transition-colors"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                                <span>Manipulate Questions & Answers ({api.getQuestionsForSlug(slug).length}) ➔</span>
                              </button>
                            </div>

                            <div className="pt-2 border-t border-[#DADCE0]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveTab('wend')
                                }}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E6F4EA] border border-[#34A853]/40 py-1.5 px-3 text-xs font-semibold text-[#137333] hover:bg-[#CEEAD6] transition-colors"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                                <span>Manipulate Words & Snake Grid Studio ({wendBoard.targetWords.length}) ➔</span>
                              </button>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelEditDiv()
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-[11px] font-medium text-[#5F6368] hover:bg-[#F1F3F4]"
                              >
                                <X className="h-3 w-3" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                disabled={savingDivEdit}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSaveDivEdit(slug)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95"
                              >
                                <Check className="h-3 w-3" />
                                <span>{savingDivEdit ? 'Saving...' : 'Save Div'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-col items-start">
                          <div className="flex items-center gap-1.5 w-full">
                            <h3 className="text-base font-semibold text-[#202124] group-hover:text-[#1A73E8] transition-colors">
                              {event.title}
                            </h3>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1A73E8] ml-auto">
                              <Edit3 className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <p className="text-xs text-[#5F6368] mt-1 leading-relaxed line-clamp-2">
                            {event.description}
                          </p>
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-[#F1F3F4] px-2.5 py-0.5 text-[10px] font-medium text-[#5F6368] group-hover:bg-[#E8F0FE] group-hover:text-[#1A73E8] transition-colors">
                            <Edit2 className="h-2.5 w-2.5" />
                            <span>Click div to edit title & description</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="mt-5 flex flex-col gap-2 pt-3 border-t border-[#F1F3F4]">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleDivLock(slug, isLive)
                        }}
                        className={`flex h-10 items-center justify-center gap-2 rounded-full text-xs font-semibold transition-all active:scale-98 shadow-xs ${
                          isLive
                            ? 'bg-[#EA4335] text-white hover:bg-[#D93025]'
                            : 'bg-[#34A853] text-white hover:bg-[#1E8E3E]'
                        }`}
                      >
                        {isLive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        <span>{isLive ? 'Lock Web Div (Switch to Locked)' : 'Unlock Web Div (Switch to Live)'}</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStart5sCountdown(slug, 'Web Dev Sprint')
                          }}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#1A73E8] bg-white text-xs font-semibold text-[#1A73E8] hover:bg-[#E8F0FE] active:scale-98 transition-all"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>5s Countdown</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBroadcastWinnerCeremony(slug)
                          }}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/50 text-xs font-semibold text-[#B06000] hover:bg-[#FFF8E1] active:scale-98 transition-all"
                        >
                          <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                          <span>Replay Announcement</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Bottom Div: Mentis Quiz Track */}
              {(() => {
                const slug = 'mentis-quiz' as const
                const event = mentisEvent
                const isLive = isMentisLive
                const isEditing = editingDivSlug === slug
                const isUpdating = updatingId === event._id

                return (
                  <div
                    key={slug}
                    onClick={() => {
                      if (!isEditing) handleStartEditDiv(slug)
                    }}
                    className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-5 shadow-2xs ${
                      isEditing
                        ? 'border-[#1A73E8] bg-[#F8F9FA] ring-2 ring-[#1A73E8]/20'
                        : isLive
                        ? 'border-[#34A853]/40 bg-white ring-1 ring-[#34A853]/15 hover:shadow-md cursor-pointer hover:border-[#34A853]'
                        : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6] hover:shadow-sm cursor-pointer'
                    }`}
                    title={!isEditing ? 'Click on div to edit title & description' : undefined}
                  >
                    <div>
                      {/* Top Header: Track Tag & Lock/Unlock Switch */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#FEF7E0] px-2.5 py-1 text-[11px] font-semibold text-[#B06000]">
                          Bottom Div • Mentis Track
                        </span>

                        {/* Interactive Lock/Unlock Switch Pill */}
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleDivLock(slug, isLive)
                          }}
                          title={isLive ? 'Click to switch to LOCKED' : 'Click to switch to UNLOCKED'}
                          className={`group/switch inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            isLive
                              ? 'bg-[#E6F4EA] border border-[#34A853]/40 text-[#137333] hover:bg-[#CEEAD6]'
                              : 'bg-[#F1F3F4] border border-[#DADCE0] text-[#5F6368] hover:bg-[#E8EAED]'
                          }`}
                        >
                          {isLive ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-[#34A853] animate-pulse" />
                              <span>UNLOCKED</span>
                              <span className="ml-1 inline-flex h-4 w-7 items-center rounded-full bg-[#34A853] px-0.5 transition-colors">
                                <span className="h-3 w-3 translate-x-3 rounded-full bg-white shadow-xs transition-transform" />
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>LOCKED</span>
                              <span className="ml-1 inline-flex h-4 w-7 items-center rounded-full bg-[#BDC1C6] px-0.5 transition-colors">
                                <span className="h-3 w-3 translate-x-0 rounded-full bg-white shadow-xs transition-transform" />
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Interactive Padlock Illustration (Click to Switch Lock/Unlock) */}
                      <div className="my-3 flex justify-center">
                        <AnimatedLockToggle
                          id={`admin-lock-${slug}`}
                          checked={isLive}
                          isAdmin={true}
                          disabled={isUpdating}
                          onChange={() => handleToggleDivLock(slug, isLive)}
                          size="md"
                          title={isLive ? 'Click lock to switch to LOCKED' : 'Click lock to switch to UNLOCKED'}
                        />
                      </div>

                      {/* Div Content: ONLY IF CLICKED -> Inline Editor */}
                      {isEditing ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 rounded-2xl border border-[#1A73E8]/30 bg-white p-3.5 shadow-sm text-left animate-in zoom-in-95"
                        >
                          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[#DADCE0]">
                            <span className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                              <Edit3 className="h-3 w-3" />
                              Edit Div Content
                            </span>
                            <span className="text-[10px] font-medium text-[#5F6368]">Live Edit</span>
                          </div>

                          <div className="space-y-2.5 text-left">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5F6368] mb-1">Track Title</label>
                              <input
                                type="text"
                                value={editDivTitle}
                                onChange={(e) => setEditDivTitle(e.target.value)}
                                className="w-full rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                                placeholder="Enter track title"
                                autoFocus
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-[#5F6368] mb-1">Description</label>
                              <textarea
                                rows={2}
                                value={editDivDescription}
                                onChange={(e) => setEditDivDescription(e.target.value)}
                                className="w-full rounded-xl border border-[#DADCE0] bg-white p-2 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                                placeholder="Enter track description"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelEditDiv()
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-[11px] font-medium text-[#5F6368] hover:bg-[#F1F3F4]"
                              >
                                <X className="h-3 w-3" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                disabled={savingDivEdit}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSaveDivEdit(slug)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95"
                              >
                                <Check className="h-3 w-3" />
                                <span>{savingDivEdit ? 'Saving...' : 'Save Div'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-col items-start">
                          <div className="flex items-center gap-1.5 w-full">
                            <h3 className="text-base font-semibold text-[#202124] group-hover:text-[#1A73E8] transition-colors">
                              {event.title}
                            </h3>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1A73E8] ml-auto">
                              <Edit3 className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <p className="text-xs text-[#5F6368] mt-1 leading-relaxed line-clamp-2">
                            {event.description}
                          </p>
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-[#F1F3F4] px-2.5 py-0.5 text-[10px] font-medium text-[#5F6368] group-hover:bg-[#E8F0FE] group-hover:text-[#1A73E8] transition-colors">
                            <Edit2 className="h-2.5 w-2.5" />
                            <span>Click div to edit title & description</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="mt-5 flex flex-col gap-2 pt-3 border-t border-[#F1F3F4]">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleDivLock(slug, isLive)
                        }}
                        className={`flex h-10 items-center justify-center gap-2 rounded-full text-xs font-semibold transition-all active:scale-98 shadow-xs ${
                          isLive
                            ? 'bg-[#EA4335] text-white hover:bg-[#D93025]'
                            : 'bg-[#34A853] text-white hover:bg-[#1E8E3E]'
                        }`}
                      >
                        {isLive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        <span>{isLive ? 'Lock Mentis Div (Switch to Locked)' : 'Unlock Mentis Div (Switch to Live)'}</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStart5sCountdown(slug, 'Mentis Mind Challenge')
                          }}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#1A73E8] bg-white text-xs font-semibold text-[#1A73E8] hover:bg-[#E8F0FE] active:scale-98 transition-all"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>5s Countdown</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBroadcastWinnerCeremony(slug)
                          }}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/50 text-xs font-semibold text-[#B06000] hover:bg-[#FFF8E1] active:scale-98 transition-all"
                        >
                          <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                          <span>Replay Announcement</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Third Div: Wend Word Puzzle Track */}
              {(() => {
                const slug = 'wend-game' as const
                const event = wendEvent
                const isLive = isWendLive
                const isEditing = editingDivSlug === slug
                const isUpdating = updatingId === event._id

                return (
                  <div
                    key={slug}
                    onClick={() => {
                      if (!isEditing) handleStartEditDiv(slug)
                    }}
                    className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-5 shadow-2xs ${
                      isEditing
                        ? 'border-[#1A73E8] bg-[#F8F9FA] ring-2 ring-[#1A73E8]/20'
                        : isLive
                        ? 'border-[#34A853]/40 bg-white ring-1 ring-[#34A853]/15 hover:shadow-md cursor-pointer hover:border-[#34A853]'
                        : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6] hover:shadow-sm cursor-pointer'
                    }`}
                    title={!isEditing ? 'Click on div to edit title & description' : undefined}
                  >
                    <div>
                      {/* Top Header: Track Tag & Lock/Unlock Switch */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#E6F4EA] px-2.5 py-1 text-[11px] font-semibold text-[#137333]">
                          Wend Track • Word Puzzle
                        </span>

                        {/* Interactive Lock/Unlock Switch Pill */}
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleDivLock(slug, isLive)
                          }}
                          title={isLive ? 'Click to switch to LOCKED' : 'Click to switch to UNLOCKED'}
                          className={`group/switch inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            isLive
                              ? 'bg-[#E6F4EA] border border-[#34A853]/40 text-[#137333] hover:bg-[#CEEAD6]'
                              : 'bg-[#F1F3F4] border border-[#DADCE0] text-[#5F6368] hover:bg-[#E8EAED]'
                          }`}
                        >
                          {isLive ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-[#34A853] animate-pulse" />
                              <span>UNLOCKED</span>
                              <span className="ml-1 inline-flex h-4 w-7 items-center rounded-full bg-[#34A853] px-0.5 transition-colors">
                                <span className="h-3 w-3 translate-x-3 rounded-full bg-white shadow-xs transition-transform" />
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>LOCKED</span>
                              <span className="ml-1 inline-flex h-4 w-7 items-center rounded-full bg-[#BDC1C6] px-0.5 transition-colors">
                                <span className="h-3 w-3 translate-x-0 rounded-full bg-white shadow-xs transition-transform" />
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Interactive Padlock Illustration (Click to Switch Lock/Unlock) */}
                      <div className="my-3 flex justify-center">
                        <AnimatedLockToggle
                          id={`admin-lock-${slug}`}
                          checked={isLive}
                          isAdmin={true}
                          disabled={isUpdating}
                          onChange={() => handleToggleDivLock(slug, isLive)}
                          size="md"
                          title={isLive ? 'Click lock to switch to LOCKED' : 'Click lock to switch to UNLOCKED'}
                        />
                      </div>

                      {/* Div Content: ONLY IF CLICKED -> Inline Editor */}
                      {isEditing ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 rounded-2xl border border-[#1A73E8]/30 bg-white p-3.5 shadow-sm text-left animate-in zoom-in-95"
                        >
                          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[#DADCE0]">
                            <span className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                              <Edit3 className="h-3 w-3" />
                              Edit Div Content
                            </span>
                            <span className="text-[10px] font-medium text-[#5F6368]">Live Edit</span>
                          </div>

                          <div className="space-y-2.5 text-left">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5F6368] mb-1">Track Title</label>
                              <input
                                type="text"
                                value={editDivTitle}
                                onChange={(e) => setEditDivTitle(e.target.value)}
                                className="w-full rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                                placeholder="Enter track title"
                                autoFocus
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-[#5F6368] mb-1">Description</label>
                              <textarea
                                rows={2}
                                value={editDivDescription}
                                onChange={(e) => setEditDivDescription(e.target.value)}
                                className="w-full rounded-xl border border-[#DADCE0] bg-white p-2 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                                placeholder="Enter track description"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelEditDiv()
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-[11px] font-medium text-[#5F6368] hover:bg-[#F1F3F4]"
                              >
                                <X className="h-3 w-3" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                disabled={savingDivEdit}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSaveDivEdit(slug)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95"
                              >
                                <Check className="h-3 w-3" />
                                <span>{savingDivEdit ? 'Saving...' : 'Save Div'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-col items-start">
                          <div className="flex items-center gap-1.5 w-full">
                            <h3 className="text-base font-semibold text-[#202124] group-hover:text-[#1A73E8] transition-colors">
                              {event.title}
                            </h3>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1A73E8] ml-auto">
                              <Edit3 className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <p className="text-xs text-[#5F6368] mt-1 leading-relaxed line-clamp-2">
                            {event.description}
                          </p>
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-[#F1F3F4] px-2.5 py-0.5 text-[10px] font-medium text-[#5F6368] group-hover:bg-[#E8F0FE] group-hover:text-[#1A73E8] transition-colors">
                            <Edit2 className="h-2.5 w-2.5" />
                            <span>Click div to edit title & description</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="mt-5 flex flex-col gap-2 pt-3 border-t border-[#F1F3F4]">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleDivLock(slug, isLive)
                        }}
                        className={`flex h-10 items-center justify-center gap-2 rounded-full text-xs font-semibold transition-all active:scale-98 shadow-xs ${
                          isLive
                            ? 'bg-[#EA4335] text-white hover:bg-[#D93025]'
                            : 'bg-[#34A853] text-white hover:bg-[#1E8E3E]'
                        }`}
                      >
                        {isLive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        <span>{isLive ? 'Lock Wend Div (Switch to Locked)' : 'Unlock Wend Div (Switch to Live)'}</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStart5sCountdown(slug, 'Wend Word Arena')
                          }}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#1A73E8] bg-white text-xs font-semibold text-[#1A73E8] hover:bg-[#E8F0FE] active:scale-98 transition-all"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>5s Countdown</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBroadcastWinnerCeremony(slug)
                          }}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/50 text-xs font-semibold text-[#B06000] hover:bg-[#FFF8E1] active:scale-98 transition-all"
                        >
                          <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                          <span>Replay Announcement</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL 2: QUIZ QUESTIONS & CORRECT/WRONG ANSWER KEYS     */}
        {/* ======================================================== */}
        {activeTab === 'quiz' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Header & Quiz Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-normal tracking-tight text-[#202124]">
                  Quiz Questions & Answer Keys
                </h2>
                <p className="text-xs text-[#5F6368]">
                  Manage the number of questions, question text, and designate correct vs. wrong answers.
                </p>
              </div>

              {/* Event Switcher */}
              <div className="flex items-center gap-2 rounded-2xl border border-[#DADCE0] bg-white p-1">
                <button
                  onClick={() => handleSelectQuizTrack('web-dev-quiz')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedSlug === 'web-dev-quiz'
                      ? 'bg-[#E8F0FE] text-[#1967D2]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  Web Dev Sprint
                </button>
                <button
                  onClick={() => handleSelectQuizTrack('mentis-quiz')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedSlug === 'mentis-quiz'
                      ? 'bg-[#FEF7E0] text-[#B06000]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  Mentis Challenge
                </button>
              </div>
            </div>

            {/* Questions Metric Card */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[#DADCE0] bg-white p-4 text-center">
                <span className="text-2xl font-bold text-[#1A73E8]">{questionsList.length}</span>
                <span className="mt-0.5 block text-xs text-[#5F6368]">Total Questions</span>
              </div>
              <div className="rounded-2xl border border-[#DADCE0] bg-white p-4 text-center">
                <span className="text-2xl font-bold text-[#34A853]">
                  {questionsList.reduce((acc, q) => acc + (q.points || 100), 0)}
                </span>
                <span className="mt-0.5 block text-xs text-[#5F6368]">Total Points</span>
              </div>
              <div className="rounded-2xl border border-[#DADCE0] bg-white p-4 text-center">
                <span className="text-2xl font-bold text-[#B06000]">
                  {questionsList.reduce((acc, q) => acc + (q.timeLimitSeconds || 30), 0)}s
                </span>
                <span className="mt-0.5 block text-xs text-[#5F6368]">Total Duration</span>
              </div>
            </div>

            {/* Question Creator Form */}
            <div className="rounded-3xl border border-[#DADCE0] bg-white p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="h-5 w-5 text-[#1A73E8]" />
                <h3 className="text-base font-semibold text-[#202124]">
                  Add Question #{questionsList.length + 1}
                </h3>
              </div>

              <form onSubmit={handleAddQuestion} className="flex flex-col gap-4 text-xs">
                <div>
                  <label className="block font-medium text-[#3C4043] mb-1">Question Prompt</label>
                  <textarea
                    rows={2}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter question text..."
                    className="w-full rounded-2xl border border-[#DADCE0] p-3 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                    required
                  />
                </div>

                {/* 4 Options with explicit Correct / Wrong selector */}
                <div>
                  <label className="block font-medium text-[#3C4043] mb-1.5">
                    Options & Answer Key (select the green radio button for the CORRECT answer):
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {options.map((opt, idx) => {
                      const isCorrect = correctOptionIndex === idx
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2.5 rounded-2xl border p-2 transition-all ${
                            isCorrect ? 'border-[#34A853] bg-[#E6F4EA]/40 ring-1 ring-[#34A853]' : 'border-[#DADCE0] bg-white'
                          }`}
                        >
                          <label className="flex items-center gap-1.5 cursor-pointer pl-1">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={isCorrect}
                              onChange={() => setCorrectOptionIndex(idx)}
                              className="h-4 w-4 text-[#34A853] focus:ring-[#34A853]"
                            />
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isCorrect ? 'bg-[#34A853] text-white' : 'bg-[#FCE8E6] text-[#C5221F]'
                              }`}
                            >
                              {isCorrect ? 'CORRECT' : 'WRONG'}
                            </span>
                          </label>

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...options]
                              next[idx] = e.target.value
                              setOptions(next)
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                            className="flex-1 bg-transparent px-2 py-1 text-xs text-[#202124] focus:outline-none"
                            required
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#3C4043] mb-1">Points</label>
                    <div className="flex items-center gap-1.5 rounded-xl border border-[#DADCE0] px-3 py-1.5">
                      <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                      <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        className="w-full text-xs text-[#202124] focus:outline-none"
                        min={10}
                        step={10}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-[#3C4043] mb-1">Time Limit (Sec)</label>
                    <div className="flex items-center gap-1.5 rounded-xl border border-[#DADCE0] px-3 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#5F6368]" />
                      <input
                        type="number"
                        value={timeLimitSeconds}
                        onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                        className="w-full text-xs text-[#202124] focus:outline-none"
                        min={5}
                        max={300}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-[#1A73E8] text-xs font-medium text-white shadow-xs hover:bg-[#1765CC] active:scale-98 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Save Question #{questionsList.length + 1}</span>
                </button>
              </form>
            </div>

            {/* Existing Questions Pool */}
            <div>
              <h3 className="text-sm font-semibold text-[#202124] mb-3">
                Active Questions ({questionsList.length}) for {selectedSlug.toUpperCase()}
              </h3>

              <div className="flex flex-col gap-3">
                {questionsList.map((q, qIdx) => {
                  const isEditingThisQ = editingQuestionId === q._id

                  if (isEditingThisQ) {
                    return (
                      <div
                        key={q._id || qIdx}
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col rounded-2xl border-2 border-[#1A73E8] bg-[#F8F9FA] p-4 shadow-sm animate-in zoom-in-95"
                      >
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#DADCE0]">
                          <span className="text-xs font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="h-3.5 w-3.5" />
                            Editing Question #{qIdx + 1}
                          </span>
                          <span className="text-[10px] font-medium text-[#5F6368]">Click save to commit</span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#3C4043] mb-1">
                              Question Prompt
                            </label>
                            <textarea
                              rows={2}
                              value={editQText}
                              onChange={(e) => setEditQText(e.target.value)}
                              className="w-full rounded-xl border border-[#DADCE0] bg-white p-2.5 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                              placeholder="Enter question text..."
                              autoFocus
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#3C4043] mb-1.5">
                              Options & Correct Answer (select green radio for correct):
                            </label>
                            <div className="flex flex-col gap-2">
                              {editQOptions.map((opt, optIdx) => {
                                const isCorrect = editQCorrectIndex === optIdx
                                return (
                                  <div
                                    key={optIdx}
                                    className={`flex items-center gap-2.5 rounded-xl border p-2 transition-all ${
                                      isCorrect
                                        ? 'border-[#34A853] bg-[#E6F4EA]/40 ring-1 ring-[#34A853]'
                                        : 'border-[#DADCE0] bg-white'
                                    }`}
                                  >
                                    <label className="flex items-center gap-1.5 cursor-pointer pl-1">
                                      <input
                                        type="radio"
                                        name={`editCorrect_${q._id}`}
                                        checked={isCorrect}
                                        onChange={() => setEditQCorrectIndex(optIdx)}
                                        className="h-4 w-4 text-[#34A853] focus:ring-[#34A853]"
                                      />
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                          isCorrect
                                            ? 'bg-[#34A853] text-white'
                                            : 'bg-[#FCE8E6] text-[#C5221F]'
                                        }`}
                                      >
                                        {isCorrect ? 'CORRECT' : 'WRONG'}
                                      </span>
                                    </label>

                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const next = [...editQOptions]
                                        next[optIdx] = e.target.value
                                        setEditQOptions(next)
                                      }}
                                      placeholder={`Option ${String.fromCharCode(65 + optIdx)} text`}
                                      className="flex-1 bg-transparent px-2 py-1 text-xs text-[#202124] focus:outline-none"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#3C4043] mb-1">Points</label>
                              <div className="flex items-center gap-1.5 rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5">
                                <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                                <input
                                  type="number"
                                  value={editQPoints}
                                  onChange={(e) => setEditQPoints(Number(e.target.value))}
                                  className="w-full text-xs text-[#202124] focus:outline-none"
                                  min={10}
                                  step={10}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-[#3C4043] mb-1">Time Limit (Sec)</label>
                              <div className="flex items-center gap-1.5 rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5">
                                <Clock className="h-3.5 w-3.5 text-[#5F6368]" />
                                <input
                                  type="number"
                                  value={editQTimeLimit}
                                  onChange={(e) => setEditQTimeLimit(Number(e.target.value))}
                                  className="w-full text-xs text-[#202124] focus:outline-none"
                                  min={5}
                                  max={300}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DADCE0]">
                            <button
                              type="button"
                              onClick={handleCancelEditQuestion}
                              className="inline-flex items-center gap-1 rounded-full border border-[#DADCE0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#5F6368] hover:bg-[#F1F3F4]"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Cancel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditQuestion(q._id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Save Question</span>
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
                      className="group/q flex flex-col rounded-2xl border border-[#DADCE0] bg-white p-4 shadow-2xs hover:border-[#1A73E8]/50 hover:shadow-xs transition-all cursor-pointer"
                      title="Click on div to edit this question"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F0FE] text-xs font-bold text-[#1967D2]">
                            #{qIdx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-[#202124] leading-relaxed group-hover/q:text-[#1A73E8] transition-colors">
                              {q.questionText}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#1A73E8] opacity-0 group-hover/q:opacity-100 transition-opacity">
                              <Edit2 className="h-2.5 w-2.5" />
                              Click div to edit prompt & answers
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuestion(q._id)
                          }}
                          title="Delete question"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#EA4335] hover:bg-[#FCE8E6] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Options with correct/wrong highlighting */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs ${
                                isCorrect
                                  ? 'bg-[#E6F4EA] border border-[#34A853]/50 text-[#137333] font-semibold'
                                  : 'bg-[#F8F9FA] text-[#5F6368]'
                              }`}
                            >
                              <span className="text-[10px] font-bold">
                                {String.fromCharCode(65 + optIdx)}:
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-[#34A853]" />}
                            </div>
                          )
                        })}
                      </div>

                      <div className="mt-3 flex items-center justify-between pl-8 pt-2 border-t border-[#F1F3F4] text-[11px] text-[#5F6368]">
                        <span>Award: <strong>{q.points || 100} pts</strong></span>
                        <span>Timer: <strong>{q.timeLimitSeconds || 30}s</strong></span>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-normal tracking-tight text-[#202124]">
                  Wend Snake Board Studio
                </h2>
                <p className="text-xs text-[#5F6368]">
                  Design the 8×8 letter grid, draw obstacle cutout shapes (such as the letter H & I blocks), and manage target words.
                </p>
              </div>

              <button
                onClick={handleResetToReferenceBoard}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-4 py-2 text-xs font-semibold text-[#1A73E8] shadow-2xs hover:bg-[#E8F0FE] active:scale-95 transition-all self-start sm:self-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{'Reset to Reference "H & I" Board'}</span>
              </button>
            </div>

            {/* Wend Round Duration & Live Timer Controller */}
            <div className="rounded-3xl border border-[#DADCE0] bg-white p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F1F3F4]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E6F4EA] text-[#137333] shadow-2xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124]">
                      Wend Round Duration & Countdown Timer (Set by Host)
                    </h3>
                    <p className="text-xs text-[#5F6368]">
                      This timer dictates the active round length for participants playing Wend Word Arena, enforcing an active countdown instead of an open stopwatch.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] border border-[#1A73E8]/30 px-3 py-1 text-xs font-bold text-[#1967D2]">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Active Limit: {wendBoard.timeLimitSeconds || 120}s ({formatDuration((wendBoard.timeLimitSeconds || 120) * 1000)})</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#5F6368] mr-1">Quick Presets:</span>
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
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                        (wendBoard.timeLimitSeconds || 120) === preset.val
                          ? 'bg-[#137333] text-white shadow-xs'
                          : 'border border-[#DADCE0] bg-[#F8F9FA] text-[#3C4043] hover:bg-white hover:border-[#137333]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="md:col-span-5 flex items-center gap-2">
                  <label className="text-xs font-semibold text-[#5F6368] shrink-0">Custom Seconds:</label>
                  <input
                    type="number"
                    min={15}
                    max={1800}
                    step={15}
                    value={wendBoard.timeLimitSeconds || 120}
                    onChange={(e) => handleSetWendTimeLimit(Number(e.target.value))}
                    className="w-24 rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#34A853]"
                  />
                  <span className="text-xs text-[#5F6368]">sec</span>
                </div>
              </div>
            </div>

            {/* Visual 8x8 Grid Editor Card */}
            <div className="rounded-3xl border border-[#DADCE0] bg-white p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F1F3F4]">
                <div className="flex items-center gap-2">
                  <Grid className="h-5 w-5 text-[#1A73E8]" />
                  <div>
                    <span className="text-sm font-bold text-[#202124]">Interactive 8×8 Grid Layout</span>
                    <p className="text-[11px] text-[#5F6368]">
                      Click any box or use arrows to navigate. Type letters directly to fill and advance.
                    </p>
                  </div>
                </div>

                {/* Quick Shortcuts Pill */}
                <div className="flex items-center gap-2">
                  {previewWordId && (
                    <button
                      onClick={() => {
                        setPreviewWordId(null)
                        setPreviewWordPath(null)
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/50 px-3 py-1 text-xs font-semibold text-[#B06000] hover:bg-[#FEEFC3] transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Clear Path Preview</span>
                    </button>
                  )}
                  <button
                    onClick={handleResetToReferenceBoard}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-xs font-semibold text-[#5F6368] hover:text-[#1A73E8] hover:bg-[#F8F9FA] transition-all"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Board</span>
                  </button>
                </div>
              </div>

              {/* 8x8 Grid Canvas (Centered Clean Studio) */}
              <div className="flex flex-col items-center justify-center w-full py-2">
                <div
                  tabIndex={0}
                  onKeyDown={handleGridKeyDown}
                  className="relative aspect-square w-full max-w-[380px] sm:max-w-[420px] rounded-2xl border-2 border-[#3C4043] bg-white p-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/50"
                >
                    <div
                      className="grid h-full w-full gap-1 sm:gap-1.5"
                      style={{
                        gridTemplateColumns: `repeat(${wendBoard.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${wendBoard.rows}, minmax(0, 1fr))`,
                      }}
                    >
                      {wendBoard.grid.map((rowArr, r) =>
                        rowArr.map((cell, c) => {
                          const isFocused = focusedCell.r === r && focusedCell.c === c
                          const isObstacle = cell.type === 'OBSTACLE'
                          const letter = cell.letter || ''
                          const isEmpty = !isObstacle && !letter

                          // Preview path check
                          const previewIdx = previewWordPath
                            ? previewWordPath.findIndex((p) => p.row === r && p.col === c)
                            : -1
                          const isInPreview = previewIdx !== -1

                          return (
                            <div
                              key={`admin-cell-${r}-${c}`}
                              onClick={() => setFocusedCell({ r, c })}
                              onDoubleClick={() => handleToggleCellType(r, c)}
                              className={`relative flex items-center justify-center rounded-lg font-black text-sm sm:text-base transition-all select-none cursor-pointer ${
                                isObstacle
                                  ? 'bg-[#3C4043] text-[#70757A] border border-[#202124] shadow-inner'
                                  : isInPreview
                                  ? 'bg-[#E6F4EA] border-2 border-[#34A853] text-[#137333] shadow-xs'
                                  : isEmpty
                                  ? 'border-2 border-dashed border-[#DADCE0] bg-[#FAFAFA] text-[#BDC1C6] hover:bg-[#F1F3F4] hover:border-[#1A73E8]/50'
                                  : 'bg-white text-[#202124] border-2 border-[#DADCE0] shadow-2xs hover:border-[#1A73E8]/60'
                              } ${
                                isFocused
                                  ? 'ring-4 ring-[#1A73E8] border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8] z-20 scale-105 shadow-md'
                                  : ''
                              }`}
                            >
                              {/* Preview Step Indicator Badge */}
                              {isInPreview && (
                                <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#34A853] text-[8px] font-black text-white leading-none">
                                  {previewIdx + 1}
                                </span>
                              )}

                              {/* Obstacle Glyph or Letter */}
                              {isObstacle ? (
                                <span className="text-[10px] font-bold text-[#80868B] select-none">#</span>
                              ) : isEmpty ? (
                                isFocused ? (
                                  <span className="h-4 w-0.5 bg-[#1A73E8] animate-pulse rounded-full" />
                                ) : (
                                  <span className="text-xs text-[#BDC1C6]">·</span>
                                )
                              ) : (
                                <span className="relative z-20 pointer-events-none select-none font-black">
                                  {letter}
                                </span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

            {/* Target Words Manager & Solvability Checker */}
            <div className="rounded-3xl border border-[#DADCE0] bg-white p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-[#FBBC04]" />
                <h3 className="text-base font-semibold text-[#202124]">
                  Target Words to Discover ({wendBoard.targetWords.length})
                </h3>
              </div>

              {/* Add Target Word Form */}
              <form onSubmit={handleAddTargetWord} className="mb-6 flex flex-col gap-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#3C4043] mb-1">Target Word (All Caps)</label>
                    <input
                      type="text"
                      value={newTargetWord}
                      onChange={(e) => setNewTargetWord(e.target.value)}
                      placeholder="e.g. LIGHT, SHIRE, INHI"
                      className="w-full uppercase tracking-wider rounded-xl border border-[#DADCE0] px-3 py-2 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#3C4043] mb-1">Optional Hint / Clue</label>
                    <input
                      type="text"
                      value={newTargetHint}
                      onChange={(e) => setNewTargetHint(e.target.value)}
                      placeholder="e.g. Illuminating row across the bottom"
                      className="w-full rounded-xl border border-[#DADCE0] px-3 py-2 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#1A73E8] text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all self-start px-6"
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
                        className="flex flex-col rounded-2xl border-2 border-[#1A73E8] bg-white p-3.5 shadow-sm animate-in zoom-in-95"
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-[#DADCE0]">
                          <span className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="h-3 w-3" />
                            Editing Target Word #{idx + 1}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#3C4043] mb-1">Target Word (All Caps)</label>
                            <input
                              type="text"
                              value={editTargetWordStr}
                              onChange={(e) => setEditTargetWordStr(e.target.value)}
                              className="w-full uppercase tracking-wider rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                              placeholder="e.g. LIGHT"
                              autoFocus
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#3C4043] mb-1">Optional Hint / Clue</label>
                            <input
                              type="text"
                              value={editTargetWordHint}
                              onChange={(e) => setEditTargetWordHint(e.target.value)}
                              className="w-full rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1.5 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                              placeholder="e.g. Illuminating row across the bottom"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-[#F1F3F4]">
                          <button
                            type="button"
                            onClick={handleCancelEditTargetWord}
                            className="inline-flex items-center gap-1 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-[11px] font-medium text-[#5F6368] hover:bg-[#F1F3F4]"
                          >
                            <X className="h-3 w-3" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditTargetWord(tw.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95"
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
                          : 'border-[#DADCE0] bg-[#F8F9FA] hover:border-[#1A73E8]/50 hover:bg-white'
                      }`}
                      title="Click on div to edit word and hint"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-[#5F6368] border border-[#DADCE0]">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black tracking-wider text-[#202124] group-hover/word:text-[#1A73E8] transition-colors">
                              {tw.word}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#5F6368] border border-[#DADCE0]">
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
                            <span className="text-[10px] font-medium text-[#1A73E8] opacity-0 group-hover/word:opacity-100 transition-opacity">
                              • Click div to edit
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
                          className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-all ${
                            previewWordId === tw.id
                              ? 'bg-[#34A853] text-white shadow-2xs'
                              : 'bg-white border border-[#DADCE0] text-[#5F6368] hover:text-[#1A73E8] hover:border-[#1A73E8]'
                          }`}
                        >
                          {previewWordId === tw.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span className="hidden sm:inline">{previewWordId === tw.id ? 'Hide Path' : 'Show Path'}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTargetWord(tw.id)
                          }}
                          title="Delete target word"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#EA4335] hover:bg-[#FCE8E6] transition-colors"
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
        {/* ======================================================== */}
        {/* PANEL 4: AUTOMATED WINNER CEREMONY PRODUCER (3rd, 2nd, 1st) */}
        {/* ======================================================== */}
        {activeTab === 'winners' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Header & Track Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-normal tracking-tight text-[#202124]">
                  Automated Winner Announcement (3rd $\rightarrow$ 2nd $\rightarrow$ 1st)
                </h2>
                <p className="text-xs text-[#5F6368]">
                  Derived automatically: <strong>1st Priority</strong> = Correct Answers / Score, <strong>2nd Priority</strong> = Faster Completion Time (ms) on ties.
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-2xl border border-[#DADCE0] bg-white p-1 shadow-2xs">
                <button
                  onClick={() => handleSelectWinnersTrack('web-dev-quiz')}
                  className={`rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                    selectedSlug === 'web-dev-quiz'
                      ? 'bg-[#E8F0FE] text-[#1967D2]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  Web Sprint
                </button>
                <button
                  onClick={() => handleSelectWinnersTrack('mentis-quiz')}
                  className={`rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                    selectedSlug === 'mentis-quiz'
                      ? 'bg-[#FEF7E0] text-[#B06000]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  Mentis
                </button>
                <button
                  onClick={() => handleSelectWinnersTrack('wend-game')}
                  className={`rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                    selectedSlug === 'wend-game'
                      ? 'bg-[#E6F4EA] text-[#137333]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  Wend Game
                </button>
              </div>
            </div>

            {/* Big Prominent Broadcast Action Button */}
            <div className="rounded-3xl border-2 border-[#FBBC04] bg-gradient-to-r from-[#FFF8E1] to-[#FEF7E0] p-6 text-center shadow-md">
              <Crown className="mx-auto h-8 w-8 text-[#FBBC04] mb-2 animate-bounce" />
              <h3 className="text-lg font-bold text-[#202124]">Ready to Broadcast Official Winners Ceremony?</h3>
              <p className="text-xs text-[#5F6368] max-w-md mx-auto mt-1 mb-4">
                Clicking this will broadcast the dramatic 5-4-3-2-1 suspense sequence, reveal 3rd place, 2nd place, 1st place, and unfold the victory ranklist on ALL user screens!
              </p>

              {/* WebSocket Connection Health Badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold shadow-2xs border border-[#DADCE0]">
                {connected ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[#34A853] animate-pulse" />
                    <span className="text-[#137333]">WebSocket Connected & Live</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[#EA4335]" />
                    <span className="text-[#C5221F]">WebSocket Local / Reconnecting</span>
                  </>
                )}
              </div>

              <div>
                <button
                  onClick={() => handleBroadcastWinnerCeremony()}
                  disabled={automatedRanking.winners.length === 0}
                  className={`inline-flex h-13 items-center justify-center gap-2.5 rounded-full px-8 text-sm font-bold text-white shadow-md transition-all ring-4 ring-[#1A73E8]/20 ${
                    automatedRanking.winners.length === 0
                      ? 'bg-[#BDC1C6] cursor-not-allowed opacity-60'
                      : 'bg-[#1A73E8] hover:bg-[#1765CC] active:scale-95 cursor-pointer'
                  }`}
                >
                  <Rocket className="h-4 w-4" />
                  <span>Broadcast Winner Announcement ({automatedRanking.winners.length} Winners Ready)</span>
                </button>
              </div>

              {automatedRanking.winners.length === 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => handleSimulateTieTest(selectedSlug)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-[#1A73E8] border border-[#DADCE0] hover:bg-[#F8F9FA] shadow-xs active:scale-95 transition-all"
                  >
                    <Sparkles className="h-3 w-3 text-[#FBBC04]" />
                    <span>Load Test Participants to Try Broadcast</span>
                  </button>
                </div>
              )}
            </div>

            {/* Automated Victory Podium (1st, 2nd, 3rd) Derived Mathematically */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="text-sm font-semibold text-[#202124] flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[#FBBC04]" />
                    <span>Automated Contest Podium (Top 3)</span>
                  </h3>
                  <p className="text-[11px] text-[#5F6368]">
                    Calculated automatically from live participant attempts using the strict tie-breaker engine.
                  </p>
                </div>
              </div>

              {automatedRanking.winners.length === 0 ? (
                <div className="rounded-3xl border border-[#DADCE0] bg-white p-8 text-center shadow-2xs">
                  <Trophy className="h-10 w-10 text-[#DADCE0] mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-[#202124]">No Submissions Recorded Yet for this Track</h4>
                  <p className="text-xs text-[#5F6368] max-w-md mx-auto mt-1 mb-4">
                    When attendees submit their challenge responses, their scores and completion times will automatically populate the victory podium and tie-breaker standings.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => refreshStandings(selectedSlug)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#3C4043] hover:bg-[#F8F9FA]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={() => handleSimulateTieTest(selectedSlug)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1765CC] shadow-xs active:scale-95 transition-all"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Simulate Tie-Breaker Demo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1st Place Card (Grand Champion - Gold) */}
                  {automatedRanking.winners.find((w) => w.rank === 1) ? (
                    (() => {
                      const w1 = automatedRanking.winners.find((w) => w.rank === 1)!
                      return (
                        <div className="rounded-3xl border-2 border-[#FBBC04] bg-white p-5 shadow-2xs flex flex-col gap-3 ring-2 ring-[#FBBC04]/20 relative overflow-hidden order-1 md:order-2">
                          <div className="absolute top-0 right-0 bg-[#FEF7E0] border-b border-l border-[#FBBC04]/40 px-3 py-1 rounded-bl-xl text-[10px] font-extrabold text-[#B06000] uppercase tracking-wider">
                            Grand Champion
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FEF7E0] text-xs font-black text-[#B06000]">
                              1st
                            </span>
                            <span className="text-xs font-extrabold text-[#B06000] inline-flex items-center gap-1">
                              <Crown className="h-3.5 w-3.5 text-[#FBBC04]" />
                              <span>Gold Medalist</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 py-1">
                            <img
                              src={w1.avatar}
                              alt={w1.name}
                              className="h-14 w-14 rounded-full border-2 border-[#FBBC04] object-cover shadow-sm ring-4 ring-[#FBBC04]/20"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[#202124]">{w1.name}</span>
                              <span className="text-[11px] text-[#5F6368]">Rank #1 Standing</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-[#F1F3F4]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#5F6368] font-medium flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
                                <span>Priority 1 (Correct / Score):</span>
                              </span>
                              <span className="font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-full">
                                {w1.correctCount ?? Math.floor(w1.score / 100)} Correct • {w1.score} pts
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#5F6368] font-medium flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#137333]" />
                                <span>Priority 2 (Duration):</span>
                              </span>
                              <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                                {formatDuration(w1.durationMs)}
                              </span>
                            </div>

                            {w1.tieBrokenByTime && (
                              <div className="mt-1 flex items-center gap-1 rounded-xl bg-[#FEF7E0] border border-[#FBBC04]/40 p-2 text-[10px] font-semibold text-[#B06000]">
                                <Zap className="h-3 w-3 shrink-0 text-[#FBBC04]" />
                                <span>Tied on Score • Won 1st Place by Faster Speed!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#DADCE0] p-6 text-center text-xs text-[#5F6368] order-1 md:order-2 flex flex-col items-center justify-center min-h-[180px]">
                      <Crown className="h-6 w-6 text-[#DADCE0] mb-1" />
                      <span>Awaiting 1st Place Participant</span>
                    </div>
                  )}

                  {/* 2nd Place Card (Silver Medalist) */}
                  {automatedRanking.winners.find((w) => w.rank === 2) ? (
                    (() => {
                      const w2 = automatedRanking.winners.find((w) => w.rank === 2)!
                      return (
                        <div className="rounded-3xl border-2 border-[#9AA0A6]/40 bg-white p-5 shadow-2xs flex flex-col gap-3 relative overflow-hidden order-2 md:order-1">
                          <div className="absolute top-0 right-0 bg-[#F1F3F4] border-b border-l border-[#DADCE0] px-3 py-1 rounded-bl-xl text-[10px] font-bold text-[#5F6368] uppercase tracking-wider">
                            Runner-Up
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F3F4] text-xs font-black text-[#5F6368]">
                              2nd
                            </span>
                            <span className="text-xs font-bold text-[#5F6368] inline-flex items-center gap-1">
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
                              <span className="text-[11px] text-[#5F6368]">Rank #2 Standing</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-[#F1F3F4]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#5F6368] font-medium flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
                                <span>Priority 1 (Correct / Score):</span>
                              </span>
                              <span className="font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-full">
                                {w2.correctCount ?? Math.floor(w2.score / 100)} Correct • {w2.score} pts
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#5F6368] font-medium flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#137333]" />
                                <span>Priority 2 (Duration):</span>
                              </span>
                              <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                                {formatDuration(w2.durationMs)}
                              </span>
                            </div>

                            {w2.tieBrokenByTime && (
                              <div className="mt-1 flex items-center gap-1 rounded-xl bg-[#F8F9FA] border border-[#DADCE0] p-2 text-[10px] font-semibold text-[#5F6368]">
                                <Zap className="h-3 w-3 shrink-0 text-[#9AA0A6]" />
                                <span>Tied on Score • Rank decided by completion time</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#DADCE0] p-6 text-center text-xs text-[#5F6368] order-2 md:order-1 flex flex-col items-center justify-center min-h-[180px]">
                      <Medal className="h-6 w-6 text-[#DADCE0] mb-1" />
                      <span>Awaiting 2nd Place Participant</span>
                    </div>
                  )}

                  {/* 3rd Place Card (Bronze Medalist) */}
                  {automatedRanking.winners.find((w) => w.rank === 3) ? (
                    (() => {
                      const w3 = automatedRanking.winners.find((w) => w.rank === 3)!
                      return (
                        <div className="rounded-3xl border-2 border-[#E37400]/40 bg-white p-5 shadow-2xs flex flex-col gap-3 relative overflow-hidden order-3">
                          <div className="absolute top-0 right-0 bg-[#FBE9E7] border-b border-l border-[#E37400]/30 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-[#E37400] uppercase tracking-wider">
                            Bronze
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FBE9E7] text-xs font-black text-[#E37400]">
                              3rd
                            </span>
                            <span className="text-xs font-bold text-[#E37400] inline-flex items-center gap-1">
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
                              <span className="text-[11px] text-[#5F6368]">Rank #3 Standing</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-[#F1F3F4]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#5F6368] font-medium flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
                                <span>Priority 1 (Correct / Score):</span>
                              </span>
                              <span className="font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-full">
                                {w3.correctCount ?? Math.floor(w3.score / 100)} Correct • {w3.score} pts
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#5F6368] font-medium flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#137333]" />
                                <span>Priority 2 (Duration):</span>
                              </span>
                              <span className="font-bold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                                {formatDuration(w3.durationMs)}
                              </span>
                            </div>

                            {w3.tieBrokenByTime && (
                              <div className="mt-1 flex items-center gap-1 rounded-xl bg-[#F8F9FA] border border-[#DADCE0] p-2 text-[10px] font-semibold text-[#5F6368]">
                                <Zap className="h-3 w-3 shrink-0 text-[#E37400]" />
                                <span>Tied on Score • Rank decided by completion time</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#DADCE0] p-6 text-center text-xs text-[#5F6368] order-3 flex flex-col items-center justify-center min-h-[180px]">
                      <Award className="h-6 w-6 text-[#DADCE0] mb-1" />
                      <span>Awaiting 3rd Place Participant</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Official Ranked Standings & Audit Table */}
            <div className="rounded-3xl border border-[#DADCE0] bg-white p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-[#F1F3F4]">
                <div>
                  <h3 className="text-base font-semibold text-[#202124] flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#1A73E8]" />
                    <span>Official Standings & Tie-Breaker Audit ({automatedRanking.rankedParticipants.length})</span>
                  </h3>
                  <p className="text-xs text-[#5F6368] mt-0.5">
                    Strict Two-Tier Algorithm: 1st Priority = Highest Correct Answers/Score $\rightarrow$ 2nd Priority = Lowest Time Taken (ms).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => refreshStandings(selectedSlug)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-medium text-[#3C4043] hover:bg-[#F8F9FA] transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => handleSimulateTieTest(selectedSlug)}
                    title="Load sample attempts to demonstrate tie-breaking by time"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1A73E8]/40 bg-[#E8F0FE] px-3 py-1.5 text-xs font-semibold text-[#1A73E8] hover:bg-[#D2E3FC] active:scale-95 transition-all"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Simulate Tie-Breaker Demo</span>
                  </button>
                  <button
                    onClick={() => handleClearSessions(selectedSlug)}
                    title="Wipe current track session receipts"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#EA4335]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#C5221F] hover:bg-[#FCE8E6] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Track</span>
                  </button>
                </div>
              </div>

              {automatedRanking.rankedParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5F6368]">
                  <HelpCircle className="h-8 w-8 text-[#DADCE0] mx-auto mb-2" />
                  <p className="font-semibold text-[#202124]">No participant submissions recorded yet for this track</p>
                  <p className="mt-1">
                    When attendees submit their responses, their ranked standing will automatically calculate here in real-time.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => handleSimulateTieTest(selectedSlug)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC]"
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
                            : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6]'
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
                            className="h-10 w-10 rounded-full border border-[#DADCE0] object-cover"
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
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F3F4] border border-[#DADCE0] px-2 py-0.2 text-[10px] font-bold text-[#5F6368]">
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
                            className="inline-flex items-center gap-1 rounded-full bg-white border border-[#DADCE0] px-3 py-1 text-xs font-semibold text-[#137333]"
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
