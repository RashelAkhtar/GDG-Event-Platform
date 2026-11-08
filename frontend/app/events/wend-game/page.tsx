'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { ScreenshotWarningModal } from '@/components/security/ScreenshotWarningModal'
import { LocalGameCountdown } from '@/components/realtime/LocalGameCountdown'
import {
  api,
  WendBoardConfig,
  findWordPathInGrid,
  ParticipantSession,
  DiscoveredWordRecord,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { soundManager } from '@/lib/sound'
import { SoundToggle } from '@/components/sound/SoundToggle'
import { LockedIllustration } from '@/components/ui/LockIllustrations'
import { WendSnakeGrid } from '@/components/wend/WendSnakeGrid'
import { WendWordBank } from '@/components/wend/WendWordBank'
import { WendControls } from '@/components/wend/WendControls'
import confetti from 'canvas-confetti'
import {
  ArrowLeft,
  Clock,
  Home,
  RotateCcw,
  Sliders,
} from 'lucide-react'

const GOOGLE_COLORS = ['#4285F4', '#34A853', '#FBBC04', '#EA4335']

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function formatTimer(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function WendGamePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { gameLockStates, subscribeToLeaderboardReset, sendSubmitAttempt, sendScreenshotViolation, currentSessionId, sendGameEnter, sendGameLeave } = useWebSocket()
  const isLocked = gameLockStates['wend-game']?.isLocked ?? false

  // Guest Player Guard: Guest users must not play — redirect immediately to /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent('/events/wend-game')}`)
    }
  }, [authLoading, user, router])

  // Real-time active presence tracking for Wend Game
  useEffect(() => {
    sendGameEnter('wend-game')
    return () => {
      sendGameLeave('wend-game')
    }
  }, [sendGameEnter, sendGameLeave])

  const startTimeRef = useRef<number | null>(null)
  const [board, setBoard] = useState<WendBoardConfig>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gdg_wend_board_config')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          const hasDummy =
            parsed.targetWords?.some((tw: any) =>
              ['INHI', 'LIGHT', 'CHING', 'SAHIRE', 'INHIBIT'].includes(tw.word?.toUpperCase())
            ) || parsed.title === 'H & I Maze Corridor'
          if (hasDummy) {
            localStorage.removeItem('gdg_wend_board_config')
          } else {
            return parsed
          }
        } catch {}
      }
    }
    return api.getWendBoard()
  })

  useEffect(() => {
    void api.fetchWendBoard().then((fresh) => {
      if (fresh) {
        setBoard(fresh)
      }
    })
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail
      if (detail && typeof detail === 'object') {
        setBoard(detail)
      }
    }
    window.addEventListener('gdg_wend_board_sync', handleSync)
    return () => {
      window.removeEventListener('gdg_wend_board_sync', handleSync)
    }
  }, [])

  const allocatedTimeSeconds = board.timeLimitSeconds || 120
  const [timeLeft, setTimeLeft] = useState<number>(() => allocatedTimeSeconds)
  const [isCountingDown, setIsCountingDown] = useState<boolean>(true)

  const handleCountdownComplete = useCallback(() => {
    setIsCountingDown(false)
    startTimeRef.current = Date.now()
  }, [])

  const [foundWordIds, setFoundWordIds] = useState<Set<string>>(new Set())
  const [discoveredWords, setDiscoveredWords] = useState<DiscoveredWordRecord[]>([])
  const [currentWord, setCurrentWord] = useState<string>('')
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null)
  const [hintClue, setHintClue] = useState<string | null>(null)
  const [shakeInvalid, setShakeInvalid] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [screenshotWarningCount, setScreenshotWarningCount] = useState<number>(0)
  const [showScreenshotWarning, setShowScreenshotWarning] = useState<boolean>(false)
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false)
  const [copyWarningToast, setCopyWarningToast] = useState<boolean>(false)

  const showCopyProhibitedAlert = useCallback(() => {
    setCopyWarningToast(true)
    try { soundManager.playError() } catch {}
    setTimeout(() => setCopyWarningToast(false), 2800)
  }, [])

  const [completedSession, setCompletedSession] = useState<ParticipantSession | null>(null)
  // User result isolation guard: strictly ensure session belongs to the current user
  const isMySession = Boolean(
    completedSession &&
    user &&
    (completedSession.userId === user._id || completedSession.userEmail === user.email)
  )

  // Active play session guard: participants entering arena always start a fresh live attempt
  useEffect(() => {
    setCompletedSession(null)
  }, [user])

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 2500)
  }, [])

  useEffect(() => {
    startTimeRef.current = Date.now()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gdg_user_session_wend-game')
      localStorage.removeItem('gdg_wend_session')
      localStorage.removeItem('gdg_user_session_wend-game')
    }
  }, [])

  const foundWordIdsRef = useRef(foundWordIds)
  useEffect(() => {
    foundWordIdsRef.current = foundWordIds
  }, [foundWordIds])

  // Auto-submit when time set by admin expires
  const handleTimeUpSubmit = useCallback(() => {
    if (completedSession || !board?.targetWords?.length) return
    const currentFoundWords = foundWordIdsRef.current
    const durationMs = allocatedTimeSeconds * 1000
    const totalPoints = currentFoundWords.size * 200

    const attemptEntry = {
      _id: `wend_${Date.now()}_${user?._id || 'anon'}`,
      totalScore: totalPoints,
      durationMs,
      submittedAt: new Date().toISOString(),
      user: {
        _id: user?._id,
        name: user?.name || 'Community Participant',
        avatar: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'WendPlayer'}`,
      },
    }
    api.recordLocalAttempt('wend-game', attemptEntry)
    sendSubmitAttempt('wend-game', attemptEntry)

    const userKey = user?._id || user?.email || (currentSessionId ? `guest_${currentSessionId}` : 'guest')
    const sessionData: ParticipantSession = {
      sessionId: `sess_wend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventSlug: 'wend-game',
      eventTitle: board.title || 'Wend Word Puzzle Arena',
      userId: user?._id,
      userEmail: user?.email,
      userName: user?.name || 'Community Participant',
      userAvatar: user?.avatar,
      totalItems: currentFoundWords.size,
      durationMs,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
      internalScore: totalPoints,
    }

    api.saveParticipantSession('wend-game', sessionData, userKey)
    setCompletedSession(sessionData)
    showToast(`Time's up! You discovered ${currentFoundWords.size} / ${board.targetWords.length} words.`, 'info')
  }, [allocatedTimeSeconds, board, completedSession, currentSessionId, sendSubmitAttempt, showToast, user])

  // Countdown timer honoring time set by admin
  useEffect(() => {
    if (completedSession || isLocked || isCountingDown || !board?.targetWords?.length) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(() => {
            handleTimeUpSubmit()
          }, 0)
          return 0
        }
        if (prev <= 10) {
          try { soundManager.playCountdownTick(prev - 1) } catch {}
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [completedSession, isLocked, isCountingDown, handleTimeUpSubmit, board?.targetWords?.length])

  // Real-time synchronization if admin updates board time limit or layout
  useEffect(() => {
    const applyFreshBoard = (fresh: WendBoardConfig) => {
      setBoard(fresh)
      if (!completedSession) {
        const freshTime = fresh.timeLimitSeconds || 120
        setTimeLeft(freshTime)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gdg_wend_board_config') {
        applyFreshBoard(api.getWendBoard())
      }
    }

    const handleCustomSync = (e: Event) => {
      const detail = (e as CustomEvent<WendBoardConfig>).detail
      if (detail) {
        applyFreshBoard(detail)
      } else {
        applyFreshBoard(api.getWendBoard())
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('gdg_wend_board_sync', handleCustomSync)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('gdg_wend_board_sync', handleCustomSync)
    }
  }, [completedSession])

  // Listen for admin leaderboard reset
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboardReset((resetSlug) => {
      if (resetSlug === 'wend-game') {
        setCompletedSession(null)
        setFoundWordIds(new Set())
        setDiscoveredWords([])
        const freshBoard = api.getWendBoard()
        setBoard(freshBoard)
        setTimeLeft(freshBoard.timeLimitSeconds || 120)
        setIsCountingDown(true)
        startTimeRef.current = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem('gdg_user_session_wend-game')
        }
      }
    })
    return () => unsubscribe()
  }, [subscribeToLeaderboardReset])

  const handleStartNewAttempt = useCallback(() => {
    if (user) {
      api.clearParticipantSession('wend-game', user._id)
      api.clearParticipantSession('wend-game', user.email)
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gdg_user_session_wend-game')
      localStorage.removeItem('gdg_wend_session')
    }
    setCompletedSession(null)
    setIsDisqualified(false)
    setScreenshotWarningCount(0)
    setShowScreenshotWarning(false)
    setFoundWordIds(new Set())
    setDiscoveredWords([])
    setCurrentWord('')
    setTimeLeft(allocatedTimeSeconds)
    setIsCountingDown(true)
    startTimeRef.current = Date.now()
  }, [allocatedTimeSeconds, user])


  const handleSecurityDisqualification = useCallback(async () => {
    setIsDisqualified(true)
    const userKey = user?._id || user?.email || (currentSessionId ? `guest_${currentSessionId}` : 'guest')
    const durationMs = Math.max(1500, Date.now() - (startTimeRef.current ?? Date.now()))

    const sessionData: ParticipantSession = {
      sessionId: `sess_disq_${Date.now()}_${user?._id || 'guest'}`,
      eventSlug: 'wend-game',
      eventTitle: board.title || 'Wend Word Puzzle Arena',
      userId: user?._id,
      userEmail: user?.email,
      userName: user?.name || 'Community Participant',
      userAvatar: user?.avatar,
      totalItems: foundWordIds.size,
      durationMs,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
      internalScore: 0,
    }

    api.saveParticipantSession('wend-game', sessionData, userKey)
    setCompletedSession(sessionData)
  }, [board.title, currentSessionId, foundWordIds.size, user])

  const triggerScreenshotViolation = useCallback(() => {
    setScreenshotWarningCount((prev) => {
      const nextCount = prev + 1
      try { soundManager.playError() } catch {}

      sendScreenshotViolation({
        userId: user?._id,
        userName: user?.name || 'Anonymous Participant',
        userEmail: user?.email,
        avatar: user?.avatar,
        gameSlug: 'wend-game',
        gameTitle: board.title || 'Wend Word Puzzle Arena',
        questionIndex: foundWordIds.size,
        warningCount: nextCount,
      })

      setShowScreenshotWarning(true)

      if (nextCount >= 3) {
        setIsDisqualified(true)
        void handleSecurityDisqualification()
      }

      return nextCount
    })
  }, [board.title, foundWordIds.size, handleSecurityDisqualification, sendScreenshotViolation, user])

  useEffect(() => {
    if (completedSession || isDisqualified) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen'
      const isSnippingTool = (e.key === 's' || e.key === 'S') && (e.metaKey || e.shiftKey) && (e.ctrlKey || e.metaKey)
      const isMacScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5'].includes(e.key)
      const isPrintDialog = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')

      if (isPrintScreen || isSnippingTool || isMacScreenshot || isPrintDialog) {
        e.preventDefault()
        e.stopPropagation()

        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {})
        }

        triggerScreenshotViolation()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {})
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [completedSession, isDisqualified, triggerScreenshotViolation])

  // Confetti helper
  const triggerWinConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: GOOGLE_COLORS,
      })
    } catch {}
  }

  // Handle path change as user drags
  const handlePathChange = useCallback((word: string) => {
    setCurrentWord(word)
  }, [])

  // Handle path release: validate against target words
  const handlePathComplete = useCallback(
    (word: string, path: { row: number; col: number }[]) => {
      const normalized = word.toUpperCase().trim()
      if (!normalized) return

      // Find matching target word in board
      const matched = board.targetWords.find(
        (tw) => tw.word.toUpperCase() === normalized
      )

      if (matched) {
        if (foundWordIds.has(matched.id)) {
          showToast(`Already found "${matched.word}"!`, 'info')
          return
        }

        const nextFound = new Set(foundWordIds)
        nextFound.add(matched.id)
        setFoundWordIds(nextFound)

        setDiscoveredWords((prev) => [
          ...prev,
          {
            wordId: matched.id,
            word: matched.word,
            colorIndex: prev.length,
            path,
          },
        ])

        showToast(`Discovered "${matched.word}"!`, 'success')
        soundManager.playWendCorrect()
        triggerWinConfetti()

        // Check if all target words are found!
        if (nextFound.size === board.targetWords.length) {
          soundManager.playWinner()
          const durationMs = Math.max(1500, (allocatedTimeSeconds - timeLeft) * 1000)
          const timeBonus = Math.floor(timeLeft * 2)
          const totalPoints = board.targetWords.length * 200 + timeBonus

          const attemptEntry = {
            _id: `wend_${Date.now()}_${user?._id || 'anon'}`,
            totalScore: totalPoints,
            durationMs,
            submittedAt: new Date().toISOString(),
            user: {
              _id: user?._id,
              name: user?.name || 'Community Participant',
              avatar: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'WendPlayer'}`,
            },
          }
          api.recordLocalAttempt('wend-game', attemptEntry)
          sendSubmitAttempt('wend-game', attemptEntry)

          const userKey = user?._id || user?.email || (currentSessionId ? `guest_${currentSessionId}` : 'guest')
          const sessionData: ParticipantSession = {
            sessionId: `sess_wend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventSlug: 'wend-game',
            eventTitle: board.title || 'Wend Word Puzzle Arena',
            userId: user?._id,
            userEmail: user?.email,
            userName: user?.name || 'Community Participant',
            userAvatar: user?.avatar,
            totalItems: board.targetWords.length,
            durationMs,
            submittedAt: new Date().toISOString(),
            status: 'SUBMITTED',
            internalScore: totalPoints,
          }

          api.saveParticipantSession('wend-game', sessionData, userKey)
          setCompletedSession(sessionData)
          showToast('Grand Puzzle Completed! Responses submitted.', 'success')
        }
      } else {
        // Invalid word: shake pill
        setShakeInvalid(true)
        setTimeout(() => setShakeInvalid(false), 500)
      }

      setCurrentWord('')
    },
    [allocatedTimeSeconds, board, currentSessionId, foundWordIds, sendSubmitAttempt, showToast, timeLeft, user]
  )

  // Undo button handler
  const handleUndo = () => {
    setCurrentWord('')
    setHintCell(null)
    setHintClue(null)
  }

  // Hint button handler
  const handleHint = () => {
    const unfound = board.targetWords.filter((tw) => !foundWordIds.has(tw.id))
    if (unfound.length === 0) return

    // Pick first unfound word
    const target = unfound[0]
    const path = findWordPathInGrid(target.word, board.grid)

    if (path && path.length > 0) {
      setHintCell(path[0])
      setHintClue(target.hint || `Starts with "${target.word[0]}" (${target.word.length} letters)`)
      setTimeout(() => {
        setHintCell(null)
        setHintClue(null)
      }, 4000)
    } else {
      setHintClue(`Word is "${target.word}" (${target.word.length} letters)`)
      setTimeout(() => setHintClue(null), 3500)
    }
  }

  // Individual target word hint request handler
  const handleWordHintRequest = useCallback((target: { id: string; word: string; hint?: string }) => {
    const path = findWordPathInGrid(target.word, board.grid)
    if (path && path.length > 0) {
      setHintCell(path[0])
      setHintClue(target.hint || `Starts with "${target.word[0]}" (${target.word.length} letters)`)
      setTimeout(() => {
        setHintCell(null)
        setHintClue(null)
      }, 4000)
    } else {
      setHintClue(target.hint || `Word is "${target.word}" (${target.word.length} letters)`)
      setTimeout(() => setHintClue(null), 3500)
    }
  }, [board.grid])

  // Reset / Play Again

  const wordColorMap = React.useMemo(() => {
    const map = new Map<string, number>()
    discoveredWords.forEach((dw) => map.set(dw.wordId, dw.colorIndex))
    return map
  }, [discoveredWords])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] bg-tech-grid">
        <div className="h-9 w-9 border-3 border-[#34A853] border-t-transparent animate-spin" />
        <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-[#3C4043]">
          Authenticating participant...
        </p>
        <p className="mt-1 font-mono text-[11px] text-[#5F6368]">
          Guest players are restricted. Redirecting to sign in.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111827] relative selection:bg-[#111827] selection:text-white">
      <Navbar />

      {/* 5-Second Local Countdown Animation Before Game Start */}
      {Boolean(!completedSession && !isLocked && !isDisqualified && isCountingDown && (board?.targetWords?.length ?? 0) > 0) && (
        <LocalGameCountdown
          gameTitle={board.title || 'Wend Word Arena'}
          onComplete={handleCountdownComplete}
        />
      )}

      <main className="relative flex-1 flex flex-col items-center justify-between p-2 sm:p-4 max-w-lg mx-auto w-full select-none no-copy" onCopy={(e) => { e.preventDefault(); showCopyProhibitedAlert(); }} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
        {/* Navigation & Live Header with Admin Time Limit */}
        <div className="w-full flex items-center justify-between mb-2 gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin-panel/panel?tab=wend"
                className="inline-flex items-center gap-1 rounded-full border border-[#1A73E8]/30 bg-[#E8F0FE] px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[#1A73E8] hover:bg-[#D2E3FC] transition-colors"
                title="Manipulate Wend board in Host Studio"
              >
                <Sliders className="h-2.5 w-2.5" />
                <span>Manipulate</span>
              </Link>
            )}
            <SoundToggle />
            {/* Live Admin-Configured Countdown Timer */}
            {!completedSession && (board?.targetWords?.length ?? 0) > 0 && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-medium transition-all ${
                  timeLeft <= 15
                    ? 'bg-[#FEF2F2] border-[#FEE2E2] text-[#DC2626]'
                    : timeLeft <= allocatedTimeSeconds * 0.4
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                    : 'bg-white border-[#E5E7EB] text-[#111827]'
                }`}
                title={`Round Time Limit set by Host: ${allocatedTimeSeconds}s`}
              >
                <Clock className={`h-3 w-3 ${timeLeft <= 15 ? 'text-[#DC2626]' : 'text-[#6B7280]'}`} />
                <span className="font-mono">{formatTimer(timeLeft)}</span>
                <span className="hidden sm:inline text-[10px] text-[#9CA3AF]">/ {allocatedTimeSeconds}s</span>
              </div>
            )}

            {(board?.targetWords?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 font-mono text-xs font-bold text-[#137333] border border-[#34A853] shadow-2xs">
                <span className="h-2 w-2 bg-[#34A853] animate-pulse" />
                <span>{foundWordIds.size} / {board.targetWords.length} WORDS</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Countdown Progress Bar (Reflecting admin-configured time) */}
        {!completedSession && !isLocked && (board?.targetWords?.length ?? 0) > 0 && (
          <div className="w-full h-1 bg-[#E8EAED] overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 15
                  ? 'bg-[#EA4335]'
                  : timeLeft <= allocatedTimeSeconds * 0.4
                  ? 'bg-[#FBBC04]'
                  : 'bg-[#34A853]'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (timeLeft / allocatedTimeSeconds) * 100))}%` }}
            />
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`mb-2 w-full text-center py-1.5 px-4 rounded-full text-xs font-semibold animate-in slide-in-from-top-2 duration-200 shadow-xs border ${
              toastMessage.type === 'success'
                ? 'bg-[#E6F4EA] text-[#137333] border-[#34A853]/40 shadow-[0_0_15px_rgba(52,168,83,0.15)]'
                : toastMessage.type === 'error'
                ? 'bg-[#FCE8E6] text-[#C5221F] border-[#EA4335]/40 shadow-[0_0_15px_rgba(234,67,53,0.15)]'
                : 'bg-[#E8F0FE] text-[#1A73E8] border-[#4285F4]/40 shadow-[0_0_15px_rgba(66,133,244,0.15)]'
            }`}
          >
            {toastMessage.text}
          </div>
        )}

        {/* --- LOCKED OVERLAY WITH LIVE BROADCAST LISTENER --- */}
        {isLocked ? (
          <div className="my-auto flex flex-col items-center rounded-3xl border border-[#E5E7EB] bg-white p-7 sm:p-10 text-center max-w-sm w-full mx-auto shadow-[0_12px_40px_rgba(0,0,0,0.03)] animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-5 flex items-center justify-center">
              <LockedIllustration size={88} />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9CA3AF] mb-1">
              STATUS // RESTRICTED ARENA
            </span>
            <h2 className="text-2xl font-normal tracking-[-0.03em] text-[#111827]">
              Wend Word Arena Locked
            </h2>
            <p className="mt-2 text-xs text-[#6B7280] leading-relaxed">
              The organizer has restricted access to this arena. As soon as the host unlocks it, the puzzle matrix connects automatically.
            </p>
            <div className="mt-6 flex flex-col w-full gap-2">
              <div className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] font-mono text-[10px] text-[#6B7280]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335] animate-pulse" />
                <span>Awaiting Live Host Broadcast</span>
              </div>
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-xs font-medium text-[#111827] hover:border-[#111827] transition-all cursor-pointer"
              >
                Return to Hub
              </Link>
            </div>
          </div>
        ) : isMySession && completedSession ? (
          /* --- EDITORIAL COMPLETED SESSION RECEIPT SCREEN --- */
          <div className="relative my-auto flex flex-col items-center rounded-2xl border border-[#E5E7EB] bg-white p-7 sm:p-9 text-center shadow-[0_12px_40px_rgba(0,0,0,0.03)] w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Status Pill Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#34A853]/40 bg-[#F0FDF4] px-3.5 py-1 font-mono text-[10px] tracking-wider uppercase text-[#15803D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
              <span>Puzzle Completed</span>
            </div>

            <h2 className="text-3xl font-normal tracking-[-0.035em] text-[#111827] mt-5">
              Session Recorded
            </h2>
            <p className="mt-1.5 text-xs text-[#6B7280] max-w-xs leading-relaxed">
              Your discovered word paths are recorded into the tournament index.
            </p>

            {/* Session Info Receipt Card */}
            <div className="my-6 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-left">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E5E7EB]">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6B7280]">
                  OFFICIAL RECEIPT
                </span>
                <span className="font-mono text-[9px] text-[#9CA3AF]">
                  {completedSession.sessionId.slice(0, 14)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Track:</span>
                  <span className="font-medium text-[#111827]">{completedSession.eventTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Participant:</span>
                  <span className="font-medium text-[#111827]">{completedSession.userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Words Discovered:</span>
                  <span className="font-medium text-[#111827]">{completedSession.totalItems} words</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Duration:</span>
                  <span className="font-mono font-medium text-[#111827]">
                    {formatDuration(completedSession.durationMs)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Status:</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#B45309] uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04]" />
                    Awaiting Ceremony
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex w-full flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={handleStartNewAttempt}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#111827] text-xs font-medium uppercase tracking-wider text-white hover:bg-black active:scale-[0.99] transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retake Puzzle</span>
              </button>
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-medium uppercase tracking-wider text-[#111827] hover:border-[#111827] hover:bg-[#FAFAFA] transition-all cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Back to Hub</span>
              </Link>
            </div>
          </div>
        ) : (!board || !board.targetWords || board.targetWords.length === 0) ? (
          /* --- CLEAN EMPTY UNPUBLISHED PUZZLE STATE --- */
          <div className="my-auto flex flex-col items-center rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center max-w-sm w-full">
            <span className="h-2 w-2 rounded-full bg-[#34A853] mb-3" />
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#9CA3AF] mb-1">
              STATUS // UNPUBLISHED
            </span>
            <h2 className="text-2xl font-normal tracking-[-0.03em] text-[#111827]">
              No Puzzle Words Published Yet
            </h2>
            <p className="mt-1.5 text-xs text-[#6B7280] max-w-xs leading-relaxed">
              The organizer has not yet added puzzle target words to this arena. Check back soon.
            </p>
            <div className="mt-6 flex gap-2.5 w-full">
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-xs font-medium text-[#111827] hover:border-[#111827] transition-all cursor-pointer"
              >
                Back to Hub
              </Link>
              <Link
                href="/events/wend-game/leaderboard"
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#111827] text-xs font-medium text-white hover:bg-black transition-all cursor-pointer"
              >
                Standings
              </Link>
            </div>
          </div>
        ) : (
          /* --- ACTIVE SNAKE WORD PATH PUZZLE ARENA --- */
          <div className="flex flex-col items-center gap-2.5 sm:gap-3.5 w-full my-auto">
            {/* 1. 8x8 Letter Grid with Obstacle Blocks & SVG Ribbon */}
            <WendSnakeGrid
              grid={board.grid}
              onPathComplete={handlePathComplete}
              onPathChange={handlePathChange}
              hintCell={hintCell}
              discoveredWords={discoveredWords}
            />

            {/* 2. Floating Active Word Pill + Undo / Hint Buttons */}
            <WendControls
              currentWord={currentWord}
              onUndo={handleUndo}
              onHint={handleHint}
              hintDisabled={foundWordIds.size === board.targetWords.length}
              shakeInvalid={shakeInvalid}
            />

            {/* 3. Word Slots Matrix & Clues Matrix */}
            <div className="w-full pt-0.5 pb-2">
              <WendWordBank
                targetWords={board.targetWords}
                foundWordIds={foundWordIds}
                wordColorMap={wordColorMap}
                activeHintClue={hintClue}
                onWordHintRequest={handleWordHintRequest}
              />
            </div>
          </div>
        )}
        
        {/* Anti-Copy Prohibited Toast */}
        {copyWarningToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center gap-2 rounded-full border border-[#EA4335]/40 bg-[#FCE8E6] px-4 py-2 text-xs font-bold text-[#C5221F] shadow-lg backdrop-blur-md">
              <span>⚠️ Copying puzzle content is strictly prohibited</span>
            </div>
          </div>
        )}

        {/* Screenshot Warning & Disqualification Modal */}
        {showScreenshotWarning && (
          <ScreenshotWarningModal
            warningCount={screenshotWarningCount}
            maxWarnings={3}
            isDisqualified={isDisqualified}
            onAcknowledge={() => setShowScreenshotWarning(false)}
          />
        )}

      </main>
    </div>
  )
}
