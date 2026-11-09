'use client'

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { ScreenshotWarningModal } from '@/components/security/ScreenshotWarningModal'
import { LocalGameCountdown } from '@/components/realtime/LocalGameCountdown'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket, normalizeGameSlug } from '@/context/WebSocketContext'
import { soundManager } from '@/lib/sound'
import { SoundToggle } from '@/components/sound/SoundToggle'
import { LockedIllustration } from '@/components/ui/LockIllustrations'
import {
  api,
  GdgEvent,
  QuestionData,
  ParticipantSession,
  DEFAULT_WEB_EVENT,
  DEFAULT_MENTIS_EVENT,
} from '@/lib/api'
import confetti from 'canvas-confetti'
import Loader from '@/components/ui/Loader'
import {
  CheckCircle2,
  ArrowRight,
  Home,
  ArrowLeft,
  RotateCcw,
  Sliders,
  Clock,
} from 'lucide-react'

function formatTimer(totalSecs: number): string {
  if (totalSecs <= 0) return '00:00'
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
}

function renderQuestionText(questionText?: string) {
  if (!questionText) return null

  const codeFencePattern = /```([\s\S]*?)```/g
  const matches = [...questionText.matchAll(codeFencePattern)]

  if (matches.length === 0) {
    return (
      <h3 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] leading-snug text-[#111827] dark:text-[#F9FAFB] select-none pointer-events-none">
        {questionText}
      </h3>
    )
  }

  const segments: React.ReactNode[] = []
  let lastIndex = 0

  matches.forEach((match, index) => {
    const [fullMatch, codeSnippet] = match
    const textBefore = questionText.slice(lastIndex, match.index)

    if (textBefore) {
      segments.push(
        <span key={`text-${index}`} className="whitespace-pre-wrap">
          {textBefore}
        </span>
      )
    }

    if (codeSnippet.trim()) {
      segments.push(
        <pre key={`code-${index}`} className="mt-2 overflow-x-auto rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#020817] p-4 text-left shadow-inner">
          <code className="block whitespace-pre-wrap font-mono text-[12px] sm:text-[13px] leading-relaxed text-[#111827] dark:text-[#E2E8F0]">
            {codeSnippet.trim()}
          </code>
        </pre>
      )
    }

    lastIndex = (match.index ?? 0) + fullMatch.length
  })

  const trailingText = questionText.slice(lastIndex)
  if (trailingText) {
    segments.push(
      <span key="text-tail" className="whitespace-pre-wrap">
        {trailingText}
      </span>
    )
  }

  return (
    <div className="space-y-2 text-xl sm:text-2xl font-normal tracking-[-0.03em] leading-snug text-[#111827] dark:text-[#F9FAFB] select-none pointer-events-none">
      {segments}
    </div>
  )
}

function QuizRunnerContent() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || 'web-dev-quiz'
  const { user, loading: authLoading } = useAuth()

  // Guest Player Guard: Guest users must not play — redirect immediately to /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/events/${slug}`)}`)
    }
  }, [authLoading, user, slug, router])

  const { currentSessionId, subscribeToLeaderboardReset, sendSubmitAttempt, sendScreenshotViolation, subscribeToQuestionsUpdate, subscribeToTimeLimitUpdate, gameLockStates, sendGameEnter, sendGameLeave } = useWebSocket()

  // Real-time active presence tracking for this specific game
  useEffect(() => {
    if (slug) {
      sendGameEnter(slug)
      return () => {
        sendGameLeave(slug)
      }
    }
  }, [slug, sendGameEnter, sendGameLeave])
  const startTimeRef = useRef<number | null>(null)

  const [event, setEvent] = useState<GdgEvent | null>(() => (slug === 'mentis-quiz' ? DEFAULT_MENTIS_EVENT : DEFAULT_WEB_EVENT))
  const normSlug = normalizeGameSlug(slug)
  const lockStateObj = gameLockStates[normSlug] || gameLockStates[slug]
  const isLocked = Boolean(
    lockStateObj
      ? lockStateObj.isLocked
      : event?.status === 'UPCOMING'
  )
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [isCountingDown, setIsCountingDown] = useState(true)

  // Cumulative time limit for the entire quiz (all questions combined)
  const allocatedTimeSeconds = event?.timeLimitSeconds || (slug.includes('mentis') ? 180 : 120)
  const [timeLeft, setTimeLeft] = useState<number>(() => allocatedTimeSeconds)

  // Sync timeLeft when event metadata updates or before quiz start
  useEffect(() => {
    if (event?.timeLimitSeconds && isCountingDown) {
      setTimeLeft(event.timeLimitSeconds)
    }
  }, [event?.timeLimitSeconds, isCountingDown])

  // Real-time synchronization if admin updates quiz round time limit
  useEffect(() => {
    const unsub = subscribeToTimeLimitUpdate((updatedSlug, updatedSeconds) => {
      if (updatedSlug === slug && typeof updatedSeconds === 'number') {
        setEvent((prev) => (prev ? { ...prev, timeLimitSeconds: updatedSeconds } : prev))
        if (isCountingDown) {
          setTimeLeft(updatedSeconds)
        }
      }
    })
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail
      if (detail && detail.slug === slug && typeof detail.timeLimitSeconds === 'number') {
        setEvent((prev) => (prev ? { ...prev, timeLimitSeconds: detail.timeLimitSeconds } : prev))
        if (isCountingDown) {
          setTimeLeft(detail.timeLimitSeconds)
        }
      }
    }
    window.addEventListener('gdg_time_limit_sync', handleSync)
    return () => {
      unsub()
      window.removeEventListener('gdg_time_limit_sync', handleSync)
    }
  }, [slug, subscribeToTimeLimitUpdate, isCountingDown])

  const handleCountdownComplete = useCallback(() => {
    setIsCountingDown(false)
    startTimeRef.current = Date.now()
  }, [])

  const [screenshotWarningCount, setScreenshotWarningCount] = useState<number>(0)
  const [showScreenshotWarning, setShowScreenshotWarning] = useState<boolean>(false)
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false)
  const [copyWarningToast, setCopyWarningToast] = useState<boolean>(false)

  const showCopyProhibitedAlert = useCallback(() => {
    setCopyWarningToast(true)
    try { soundManager.playError() } catch {}
    setTimeout(() => setCopyWarningToast(false), 2800)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completedSession, setCompletedSession] = useState<ParticipantSession | null>(null)
  // User result isolation guard: strictly ensure session belongs to the current user
  const isMySession = Boolean(
    completedSession &&
    user &&
    (completedSession.userId === user._id || completedSession.userEmail === user.email)
  )

  // Active play session guard: participants entering arena always start a fresh live attempt
  useEffect(() => {
    if (!user) return

    const userKey = user._id || user.email
    const currentAttempt = userKey ? api.getParticipantSession(slug, userKey) : null
    if (currentAttempt) {
      setCompletedSession(currentAttempt)
      return
    }

    setCompletedSession(null)
  }, [user, slug])
  const [loading, setLoading] = useState(false)

  // Listen for admin leaderboard resets so user can replay in real time
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboardReset((resetSlug) => {
      if (resetSlug === slug) {
        setCompletedSession(null)
        setCurrentIndex(0)
        setSelectedAnswers({})
        setIsCountingDown(true)
        setTimeLeft(allocatedTimeSeconds)
        startTimeRef.current = null
        api.clearSessionsForSlug(slug)
      }
    })
    return () => unsubscribe()
  }, [slug, subscribeToLeaderboardReset, allocatedTimeSeconds])

  const handleStartNewAttempt = useCallback(() => {
    const userKey = user?._id || user?.email
    if (userKey && api.getParticipantSession(slug, userKey)) {
      setCompletedSession(api.getParticipantSession(slug, userKey))
      return
    }
    if (user) {
      api.clearParticipantSession(slug, user._id)
      api.clearParticipantSession(slug, user.email)
    }
    setCompletedSession(null)
    setIsDisqualified(false)
    setScreenshotWarningCount(0)
    setShowScreenshotWarning(false)
    setCurrentIndex(0)
    setSelectedAnswers({})
    setIsCountingDown(true)
    setTimeLeft(allocatedTimeSeconds)
    startTimeRef.current = Date.now()
  }, [slug, user, allocatedTimeSeconds])

  const handleSecurityDisqualification = useCallback(async () => {
    setIsDisqualified(true)
    const userKey = user?._id || user?.email || (currentSessionId ? `guest_${currentSessionId}` : 'guest')
    const durationMs = Math.max(1500, Date.now() - (startTimeRef.current ?? Date.now()))

    const sessionData: ParticipantSession = {
      sessionId: `sess_disq_${Date.now()}_${user?._id || 'guest'}`,
      eventSlug: slug,
      eventTitle: event?.title || 'Quiz Session',
      userId: user?._id,
      userEmail: user?.email,
      userName: user?.name || 'Community Participant',
      avatar: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'Participant'}`,
      totalItems: questions.length,
      durationMs,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
      internalScore: 0,
      internalCorrectCount: 0,
    }

    api.saveParticipantSession(slug, sessionData, userKey)
    setCompletedSession(sessionData)
  }, [currentSessionId, event, questions, slug, user])

  const triggerScreenshotViolation = useCallback(() => {
    setScreenshotWarningCount((prev) => {
      const nextCount = prev + 1
      try { soundManager.playError() } catch {}

      sendScreenshotViolation({
        userId: user?._id,
        userName: user?.name || 'Anonymous Participant',
        userEmail: user?.email,
        avatar: user?.avatar,
        gameSlug: slug,
        gameTitle: event?.title || 'Quiz Challenge',
        questionIndex: currentIndex,
        warningCount: nextCount,
      })

      setShowScreenshotWarning(true)

      if (nextCount >= 3) {
        setIsDisqualified(true)
        void handleSecurityDisqualification()
      }

      return nextCount
    })
  }, [currentIndex, event, handleSecurityDisqualification, sendScreenshotViolation, slug, user])

  // Global screenshot & screen capture shortcut detection
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

        // Clear clipboard buffer
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

  // Load event & user-created questions
  useEffect(() => {
    async function initQuiz() {
      try {
        const [foundEvent, remoteQuestions] = await Promise.all([
          api.getEventBySlug(slug),
          api.fetchQuestions(slug),
        ])
        if (foundEvent) {
          setEvent(foundEvent)
          if (foundEvent.timeLimitSeconds) {
            setTimeLeft(foundEvent.timeLimitSeconds)
          }
        }
        setQuestions(remoteQuestions || [])
      } catch {
        setQuestions(api.getQuestionsForSlug(slug))
      } finally {
        startTimeRef.current = Date.now()
        setLoading(false)
      }
    }
    initQuiz()
  }, [slug])

  // Listen for real-time question updates published by the admin
  useEffect(() => {
    const unsubscribe = subscribeToQuestionsUpdate((updatedSlug, updatedQuestions) => {
      if (updatedSlug === slug && Array.isArray(updatedQuestions)) {
        setQuestions(updatedQuestions)
      }
    })
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail
      if (detail && detail.slug === slug && Array.isArray(detail.questions)) {
        setQuestions(detail.questions)
      }
    }
    window.addEventListener('gdg_questions_sync', handleSync)
    return () => {
      unsubscribe()
      window.removeEventListener('gdg_questions_sync', handleSync)
    }
  }, [slug, subscribeToQuestionsUpdate])

  const handleSubmitQuiz = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const answersPayload = questions.map((q, idx) => ({
        questionId: q._id || `q-${idx}`,
        selectedOptionIndex: selectedAnswers[idx] ?? -1,
      }))

      const computedDuration = Math.max(1500, (allocatedTimeSeconds - timeLeft) * 1000)
      const durationMs = startTimeRef.current
        ? Math.min(computedDuration, Math.max(1500, Date.now() - startTimeRef.current))
        : computedDuration

      let score = 0
      let correct = 0

      // Authoritative Server-side evaluation against MongoDB answer keys
      const eventTargetId = event?._id || slug
      const submitRes = await api
        .submitQuiz(eventTargetId, answersPayload, durationMs, {
          name: user?.name,
          avatar: user?.avatar,
        })
        .catch(() => null)

      if (submitRes && submitRes.success && submitRes.data) {
        score = typeof submitRes.data.score === 'number' ? submitRes.data.score : 0
        correct = typeof submitRes.data.correctCount === 'number' ? submitRes.data.correctCount : 0
      } else {
        // Fallback scoring strictly against verified answer keys
        questions.forEach((q, idx) => {
          const selected = selectedAnswers[idx]
          if (q.correctOptionIndex !== undefined && selected === q.correctOptionIndex) {
            score += q.points || 100
            correct++
          }
        })
      }

      const attemptEntry = {
        _id: `quiz_${Date.now()}_${user?._id || 'anon'}`,
        totalScore: score,
        durationMs,
        submittedAt: new Date().toISOString(),
        user: {
          _id: user?._id,
          name: user?.name || 'Community Participant',
          avatar: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'Participant'}`,
        },
      }
      api.recordLocalAttempt(slug, attemptEntry)
      sendSubmitAttempt(slug, attemptEntry)

      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#4285F4', '#34A853', '#FBBC04', '#EA4335'],
        })
      } catch {}

      const userKey = user?._id || user?.email || (currentSessionId ? `guest_${currentSessionId}` : 'guest')
      const sessionData: ParticipantSession = {
        sessionId: `sess_${Date.now()}_${user?._id || 'guest'}`,
        eventSlug: slug,
        eventTitle: event?.title || 'Quiz Session',
        userId: user?._id,
        userEmail: user?.email,
        userName: user?.name || 'Community Participant',
        avatar: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'Participant'}`,
        totalItems: questions.length,
        durationMs,
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED',
        internalScore: score,
        internalCorrectCount: correct,
      }
      api.saveParticipantSession(slug, sessionData, userKey)
      setCompletedSession(sessionData)
    } finally {
      setIsSubmitting(false)
    }
  }, [allocatedTimeSeconds, currentSessionId, event, questions, selectedAnswers, sendSubmitAttempt, slug, timeLeft, user])

  // Auto-submit when cumulative round time expires
  const handleTimeUpSubmit = useCallback(async () => {
    if (isSubmitting || completedSession) return
    setIsSubmitting(true)
    try {
      try { soundManager.playError() } catch {}
      const answersPayload = questions.map((q, idx) => ({
        questionId: q._id || `q-${idx}`,
        selectedOptionIndex: selectedAnswers[idx] ?? -1,
      }))

      const durationMs = allocatedTimeSeconds * 1000
      let score = 0
      let correct = 0

      // Authoritative Server-side evaluation against MongoDB answer keys
      const eventTargetId = event?._id || slug
      const submitRes = await api
        .submitQuiz(eventTargetId, answersPayload, durationMs, {
          name: user?.name,
          avatar: user?.avatar,
        })
        .catch(() => null)

      if (submitRes && submitRes.success && submitRes.data) {
        score = typeof submitRes.data.score === 'number' ? submitRes.data.score : 0
        correct = typeof submitRes.data.correctCount === 'number' ? submitRes.data.correctCount : 0
      } else {
        // Fallback scoring strictly against verified answer keys
        questions.forEach((q, idx) => {
          const selected = selectedAnswers[idx]
          if (q.correctOptionIndex !== undefined && selected === q.correctOptionIndex) {
            score += q.points || 100
            correct++
          }
        })
      }

      const attemptEntry = {
        _id: `quiz_timeup_${Date.now()}_${user?._id || 'anon'}`,
        totalScore: score,
        durationMs,
        submittedAt: new Date().toISOString(),
        user: {
          _id: user?._id,
          name: user?.name || 'Community Participant',
          avatar: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'Participant'}`,
        },
      }
      api.recordLocalAttempt(slug, attemptEntry)
      sendSubmitAttempt(slug, attemptEntry)

      const userKey = user?._id || user?.email || (currentSessionId ? `guest_${currentSessionId}` : 'guest')
      const sessionData: ParticipantSession = {
        sessionId: `sess_timeup_${Date.now()}_${user?._id || 'guest'}`,
        eventSlug: slug,
        eventTitle: event?.title || 'Quiz Session',
        userId: user?._id,
        userEmail: user?.email,
        userName: user?.name || 'Community Participant',
        avatar: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'Participant'}`,
        totalItems: questions.length,
        durationMs,
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED',
        internalScore: score,
        internalCorrectCount: correct,
      }
      api.saveParticipantSession(slug, sessionData, userKey)
      setCompletedSession(sessionData)
    } finally {
      setIsSubmitting(false)
    }
  }, [allocatedTimeSeconds, completedSession, currentSessionId, event, isSubmitting, questions, selectedAnswers, sendSubmitAttempt, slug, user])

  // Countdown timer honoring cumulative time limit set by host
  useEffect(() => {
    if (completedSession || isLocked || isCountingDown || loading || isDisqualified || questions.length === 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(() => {
            void handleTimeUpSubmit()
          }, 0)
          return 0
        }
        if (prev <= 10 && prev > 1) {
          try { soundManager.playCountdownTick() } catch {}
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [completedSession, isLocked, isCountingDown, loading, isDisqualified, questions.length, handleTimeUpSubmit])

  const handleSelectOption = (optionIndex: number) => {
    void soundManager.unlock()
    soundManager.playQuizOption()
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }))
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] dark:bg-[#080D1A] transition-colors duration-500">
        <Loader text="Authenticating..." />
        <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-[#3C4043] dark:text-[#94A3B8]">
          Verifying participant authentication...
        </p>
        <p className="mt-1 font-mono text-[11px] text-[#5F6368] dark:text-[#64748B]">
          Guest players are restricted. Redirecting to sign in.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] dark:bg-[#080D1A] transition-colors duration-500">
        <Loader text="Loading quiz..." />
        <p className="mt-3 font-mono text-xs text-[#5F6368] dark:text-[#94A3B8]">Loading quiz questions...</p>
      </div>
    )
  }

  const currentQ = questions[currentIndex]

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#080D1A] text-[#111827] dark:text-[#F9FAFB] relative selection:bg-[#111827] dark:selection:bg-[#38BDF8] selection:text-white dark:selection:text-[#080D1A] transition-colors duration-500">
      <Navbar />

      {/* 5-Second Local Countdown Animation Before Game Start */}
      {Boolean(!completedSession && !loading && !isDisqualified && !isLocked && questions.length > 0 && isCountingDown) && (
        <LocalGameCountdown
          gameTitle={event?.title || 'Quiz Arena'}
          onComplete={handleCountdownComplete}
        />
      )}

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-5 pb-16 sm:px-6">
        {/* Top Back bar */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Exit Track</span>
          </Link>
          <div className="flex items-center gap-2.5">
            {user?.role === 'ADMIN' && (
              <Link
                href={`/admin-panel/panel?tab=quiz&track=${slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#1A73E8]/30 bg-[#E8F0FE] px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[#1A73E8] hover:bg-[#D2E3FC] transition-colors"
                title="Manipulate track questions in Host Studio"
              >
                <Sliders className="h-2.5 w-2.5" />
                <span>Manipulate</span>
              </Link>
            )}
            <SoundToggle />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#111827] dark:text-[#F9FAFB]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E8]" />
              <span>{event?.title}</span>
            </span>
          </div>
        </div>

        {/* --- EDITORIAL LOCKED SCREEN WITH LIVE UNLOCK LISTENER --- */}
        {isLocked ? (
          <div className="relative my-auto flex flex-col items-center rounded-3xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-7 sm:p-10 text-center shadow-[0_12px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-5 flex items-center justify-center">
              <LockedIllustration size={88} />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9CA3AF] mb-1">
              STATUS // RESTRICTED ARENA
            </span>
            <h2 className="text-2xl font-normal tracking-[-0.03em] text-[#111827] dark:text-[#F9FAFB]">
              {event?.title || 'Challenge Arena'} Locked
            </h2>
            <p className="mt-2 text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-xs leading-relaxed">
              This challenge arena is currently locked by the host. As soon as the host unlocks it, your screen will automatically connect and launch the arena countdown.
            </p>
            <div className="mt-6 flex flex-col w-full max-w-xs gap-2">
              <div className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#FAFAFA] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] font-mono text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335] animate-pulse" />
                <span>Awaiting Live Host Broadcast</span>
              </div>
              <Link
                href="/"
                className="flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#1E293B] text-xs font-medium text-[#111827] dark:text-[#F9FAFB] dark:text-[#F9FAFB] hover:border-[#111827] dark:hover:border-white transition-all cursor-pointer"
              >
                Return to Hub
              </Link>
            </div>
          </div>
        ) : isMySession && completedSession ? (
          <div className="relative my-auto flex flex-col items-center rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-7 sm:p-9 text-center shadow-[0_12px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200">
            {/* Status Pill Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#34A853]/40 bg-[#F0FDF4] px-3.5 py-1 font-mono text-[10px] tracking-wider uppercase text-[#15803D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
              <span>Responses Recorded</span>
            </div>

            <h2 className="text-3xl font-normal tracking-[-0.035em] text-[#111827] dark:text-[#F9FAFB] mt-5">
              Session Complete
            </h2>
            <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-xs leading-relaxed">
              Your answers have been evaluated and locked into tournament standings.
            </p>

            {/* Session Info Receipt Card */}
            <div className="my-6 w-full max-w-sm rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFAFA] dark:bg-[#080D1A] p-4 text-left">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E5E7EB] dark:border-[#1E293B]">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6B7280]">
                  OFFICIAL RECEIPT
                </span>
                <span className="font-mono text-[9px] text-[#9CA3AF]">
                  {completedSession.sessionId.slice(0, 14)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Track:</span>
                  <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{completedSession.eventTitle || event?.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Participant:</span>
                  <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{completedSession.userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Questions:</span>
                  <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{completedSession.totalItems} Completed</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Round Limit:</span>
                  <span className="font-mono text-xs font-medium text-[#111827] dark:text-[#F9FAFB]">
                    {allocatedTimeSeconds}s cumulative
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Duration:</span>
                  <span className="font-mono font-medium text-[#111827] dark:text-[#F9FAFB] dark:text-[#F9FAFB]">
                    {formatDuration(completedSession.durationMs)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">Status:</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#B45309] uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04]" />
                    Awaiting Ceremony
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex w-full max-w-sm flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={handleStartNewAttempt}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#111827] dark:bg-[#38BDF8] text-xs font-semibold uppercase tracking-wider text-white dark:text-[#080D1A] hover:bg-black dark:hover:bg-[#7DD3FC] active:scale-[0.99] transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retake Track</span>
              </button>
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#1E293B] text-xs font-medium uppercase tracking-wider text-[#111827] dark:text-[#F9FAFB] hover:border-[#111827] dark:hover:border-white hover:bg-[#FAFAFA] dark:hover:bg-[#334155] transition-all cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Hub</span>
              </Link>
            </div>
          </div>
        ) : questions.length === 0 ? (
          /* --- EMPTY QUESTIONS STATE --- */
          <div className="my-auto flex flex-col items-center rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center">
            <span className="h-2 w-2 rounded-full bg-[#1A73E8] mb-3" />
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#9CA3AF] mb-1">
              STATUS // UNPUBLISHED
            </span>
            <h2 className="text-2xl font-normal tracking-[-0.03em] text-[#111827] dark:text-[#F9FAFB]">
              No Questions Published Yet
            </h2>
            <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-xs leading-relaxed">
              The organizer has not yet added questions to this arena track. Check back soon.
            </p>
            <div className="mt-6 flex gap-2.5 w-full max-w-xs">
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-xs font-medium text-[#111827] dark:text-[#F9FAFB] hover:border-[#111827] transition-all"
              >
                Back to Hub
              </Link>
              <Link
                href={`/events/${slug}/leaderboard`}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#111827] text-xs font-medium text-white hover:bg-black transition-all"
              >
                Standings
              </Link>
            </div>
          </div>
        ) : (
          /* --- ACTIVE QUIZ QUESTION PLAYER --- */
          <div className="flex flex-col flex-1">
            {/* Progress Header with Cumulative Round Timer */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] tracking-wider uppercase text-[#111827] dark:text-[#F9FAFB] font-medium">
                  Question {currentIndex + 1} / {questions.length}
                </span>
                <span className="font-mono text-[10px] text-[#9CA3AF]">
                  • {currentQ?.points || 100} PTS
                </span>
              </div>

              {/* Cumulative Countdown Timer for All Questions */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-bold border transition-all ${
                  timeLeft <= 15
                    ? 'border-[#EA4335] bg-[#FCE8E6] dark:bg-[#7F1D1D]/30 text-[#C5221F] dark:text-[#EF4444] animate-pulse ring-2 ring-[#EA4335]/20'
                    : timeLeft <= allocatedTimeSeconds * 0.3
                    ? 'border-[#FBBC04] bg-[#FEF7E0] dark:bg-[#78350F]/20 text-[#B06000] dark:text-[#FBBF24]'
                    : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#111827] dark:text-[#F9FAFB]'
                }`}
                title={`Cumulative round time limit: ${allocatedTimeSeconds}s for all questions combined`}
              >
                <Clock className={`h-3 w-3 ${timeLeft <= 15 ? 'text-[#EA4335]' : 'text-[#6B7280] dark:text-[#94A3B8]'}`} />
                <span>{formatTimer(timeLeft)}</span>
                <span className="hidden sm:inline text-[9.5px] font-normal text-[#9CA3AF]">
                  / {allocatedTimeSeconds}s
                </span>
              </div>
            </div>

            {/* Hairline Progress Lines: Question Progress & Cumulative Round Time */}
            <div className="space-y-1 my-2">
              <div className="h-1 w-full rounded-full bg-[#E5E7EB] dark:bg-[#1E293B] overflow-hidden">
                <div
                  className="h-full bg-[#1A73E8] transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
              <div className="h-0.5 w-full rounded-full bg-[#E5E7EB]/50 dark:bg-[#1E293B]/50 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft <= 15
                      ? 'bg-[#EA4335]'
                      : timeLeft <= allocatedTimeSeconds * 0.3
                      ? 'bg-[#FBBC04]'
                      : 'bg-[#34A853]'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (timeLeft / allocatedTimeSeconds) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card - Pristine Editorial Architecture */}
            <div className="relative mt-3 flex-1 rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-6 sm:p-8 flex flex-col justify-between overflow-hidden select-none no-copy" onCopy={(e) => { e.preventDefault(); showCopyProhibitedAlert(); }} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
              <div>
                {renderQuestionText(currentQ?.questionText)}

                {/* 4 Options with Structured Styling */}
                <div className="mt-6 flex flex-col gap-2.5">
                  {currentQ?.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === optIdx
                    const optionLetter = String.fromCharCode(65 + optIdx)

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(optIdx)}
                        className={`group relative flex min-h-[50px] w-full items-center justify-between gap-3.5 rounded-xl border px-4 py-3 text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-[#111827] dark:border-[#38BDF8] bg-[#F4F4F5] dark:bg-[#0C4A6E]/30 text-[#111827] dark:text-[#F9FAFB]'
                            : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] hover:border-[#9CA3AF] dark:hover:border-[#38BDF8] hover:bg-[#FAFAFA] dark:hover:bg-[#334155]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-medium transition-all ${
                              isSelected
                                ? 'bg-[#111827] dark:bg-[#38BDF8] text-white dark:text-[#080D1A]'
                                : 'bg-[#F4F4F5] dark:bg-[#0F172A] text-[#6B7280] dark:text-[#94A3B8]'
                            }`}
                          >
                            {optionLetter}
                          </span>
                          <span className="text-xs sm:text-[13px] font-normal leading-relaxed">
                            {option}
                          </span>
                        </div>

                        {isSelected && (
                          <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#111827] text-white">
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bottom Nav: Previous / Next / Submit */}
              <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#F3F4F6] dark:border-[#1E293B]">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((idx) => idx - 1)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 font-mono text-[11px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((idx) => idx + 1)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#111827] dark:bg-[#38BDF8] px-5 font-mono text-[11px] uppercase tracking-wider text-white dark:text-[#080D1A] font-semibold hover:bg-black dark:hover:bg-[#7DD3FC] transition-all cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitQuiz}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#34A853] to-[#1E8E3E] px-7 text-xs font-bold text-white shadow-sm hover:shadow-md active:scale-95 transition-all"
                  >
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Answers'}</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Anti-Copy Prohibited Toast */}
        {copyWarningToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center gap-2 rounded-full border border-[#EA4335]/40 bg-[#FCE8E6] px-4 py-2 text-xs font-bold text-[#C5221F] shadow-lg backdrop-blur-md">
              <span>⚠️ Copying questions or options is strictly prohibited</span>
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

export default function QuizRunnerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#080D1A]">
          <Loader />
        </div>
      }
    >
      <QuizRunnerContent />
    </Suspense>
  )
}
