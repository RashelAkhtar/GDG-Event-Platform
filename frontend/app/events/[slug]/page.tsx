'use client'

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { ScreenshotWarningModal } from '@/components/security/ScreenshotWarningModal'
import { LocalGameCountdown } from '@/components/realtime/LocalGameCountdown'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { soundManager } from '@/lib/sound'
import { SoundToggle } from '@/components/sound/SoundToggle'
import {
  api,
  GdgEvent,
  QuestionData,
  ParticipantSession,
  DEFAULT_WEB_EVENT,
  DEFAULT_MENTIS_EVENT,
  DEFAULT_QUESTIONS,
} from '@/lib/api'
import confetti from 'canvas-confetti'
import {
  Clock,
  CheckCircle2,
  Award,
  ArrowRight,
  Home,
  ArrowLeft,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  const seconds = (ms / 1000).toFixed(1)
  if (ms < 60000) return `${seconds}s`
  const minutes = Math.floor(ms / 60000)
  const remainingSecs = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${remainingSecs}s`
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
  const { currentSessionId, subscribeToLeaderboardReset, sendSubmitAttempt, sendScreenshotViolation } = useWebSocket()
  const startTimeRef = useRef<number | null>(null)

  const [event, setEvent] = useState<GdgEvent | null>(() => (slug === 'mentis-quiz' ? DEFAULT_MENTIS_EVENT : DEFAULT_WEB_EVENT))
  const [questions, setQuestions] = useState<QuestionData[]>(() => DEFAULT_QUESTIONS[slug] || [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [isCountingDown, setIsCountingDown] = useState(true)

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
    ((user && (completedSession.userId === user._id || completedSession.userEmail === user.email)) ||
     (!user && completedSession.sessionId?.includes(currentSessionId)))
  )


  // Reactively verify that completedSession belongs to the current logged-in user
  useEffect(() => {
    if (authLoading) return
    const timer = setTimeout(() => {
      const userIdentifier = user?._id || user?.email || (currentSessionId ? `guest_${currentSessionId}` : 'guest')
      const existing = api.getParticipantSession(slug, userIdentifier)

      if (existing) {
        const isMine =
          (user?._id && existing.userId === user._id) ||
          (user?.email && existing.userEmail === user.email) ||
          (!user && existing.sessionId?.includes(currentSessionId))
        setCompletedSession(isMine ? existing : null)
      } else {
        setCompletedSession(null)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [user, authLoading, slug, currentSessionId])
  const [loading, setLoading] = useState(false)

  // Listen for admin leaderboard resets so user can replay in real time
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboardReset((resetSlug) => {
      if (resetSlug === slug) {
        setCompletedSession(null)
        setCurrentIndex(0)
        setSelectedAnswers({})
        setTimeLeft(30)
        setIsCountingDown(true)
        startTimeRef.current = null
        api.clearSessionsForSlug(slug)
      }
    })
    return () => unsubscribe()
  }, [slug, subscribeToLeaderboardReset])

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

  // Load event & questions
  useEffect(() => {
    async function initQuiz() {
      try {
        const foundEvent = await api.getEventBySlug(slug)
        setEvent(foundEvent)

        const localQuestions = api.getQuestionsForSlug(slug)
        if (localQuestions && localQuestions.length > 0) {
          setQuestions(localQuestions)
        } else if (foundEvent) {
          const startRes = await api.startQuiz(foundEvent._id)
          if (startRes.success && startRes.questions && startRes.questions.length > 0) {
            setQuestions(startRes.questions)
          } else {
            setQuestions(api.getQuestionsForSlug(slug))
          }
        }
      } catch {
        setQuestions(api.getQuestionsForSlug(slug))
      } finally {
        startTimeRef.current = Date.now()
        setLoading(false)
      }
    }
    initQuiz()
  }, [slug])

  const handleSubmitQuiz = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const answersPayload = questions.map((q, idx) => ({
        questionId: q._id || `q-${idx}`,
        selectedOptionIndex: selectedAnswers[idx] ?? -1,
      }))

      if (event && !event._id.endsWith('-id')) {
        await api.submitQuiz(event._id, answersPayload).catch(() => ({}))
      }

      let score = 0
      let correct = 0
      questions.forEach((q, idx) => {
        const selected = selectedAnswers[idx]
        if (q.correctOptionIndex !== undefined && selected === q.correctOptionIndex) {
          score += q.points || 100
          correct++
        } else if (selected !== undefined && selected !== -1) {
          score += q.points || 100
          correct++
        }
      })

      const durationMs = Math.max(1500, Date.now() - (startTimeRef.current ?? Date.now()))
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
  }, [currentSessionId, event, questions, selectedAnswers, sendSubmitAttempt, slug, user])

  // Question Timer Countdown
  useEffect(() => {
    if (completedSession || loading || questions.length === 0 || isCountingDown) return

    const currentQuestion = questions[currentIndex]
    const limit = currentQuestion?.timeLimitSeconds || 30
    const resetTimer = setTimeout(() => {
      setTimeLeft(limit)
    }, 0)

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex((idx) => idx + 1)
            return limit
          } else {
            clearInterval(timer)
            void handleSubmitQuiz()
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearTimeout(resetTimer)
      clearInterval(timer)
    }
  }, [currentIndex, questions, completedSession, loading, isCountingDown, handleSubmitQuiz])

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] bg-tech-grid">
        <div className="h-9 w-9 border-3 border-[#1A73E8] border-t-transparent animate-spin" />
        <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-[#3C4043]">
          Verifying participant authentication...
        </p>
        <p className="mt-1 font-mono text-[11px] text-[#5F6368]">
          Guest players are restricted. Redirecting to sign in.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
        <div className="h-9 w-9 border-3 border-[#1A73E8] border-t-transparent animate-spin" />
        <p className="mt-3 font-mono text-xs text-[#5F6368]">Loading quiz questions...</p>
      </div>
    )
  }

  const currentQ = questions[currentIndex]

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#202124] relative overflow-hidden">
      {/* Background Multi-color Aurora Mesh for Google Game Aesthetic */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[#4285F4]/10 blur-3xl animate-aurora" />
        <div className="absolute top-1/2 -right-40 h-[480px] w-[480px] rounded-full bg-[#FBBC04]/10 blur-3xl animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute -bottom-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#34A853]/10 blur-3xl animate-aurora" style={{ animationDelay: '-10s' }} />
      </div>

      <Navbar />

      {/* 5-Second Local Countdown Animation Before Game Start */}
      {Boolean(!completedSession && !loading && !isDisqualified && questions.length > 0 && isCountingDown) && (
        <LocalGameCountdown
          gameTitle={event?.title || 'Quiz Arena'}
          onComplete={handleCountdownComplete}
        />
      )}

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4 pb-16 sm:px-6">
        {/* Top Back bar */}
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3.5 py-1 text-xs font-semibold text-[#5F6368] shadow-2xs backdrop-blur-md hover:bg-white hover:text-[#202124] transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Exit Quiz</span>
          </Link>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1A73E8]/20 bg-[#E8F0FE]/90 px-3.5 py-1 text-xs font-bold text-[#1967D2] shadow-2xs backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-[#1A73E8]" />
              <span>{event?.title}</span>
            </span>
          </div>
        </div>

        {/* --- AESTHETIC WAIT MESSAGE & SESSION INFO SCREEN --- */}
        {isMySession && completedSession ? (
          <div className="relative my-auto flex flex-col items-center rounded-[36px] border border-white/90 bg-white/95 p-7 sm:p-9 text-center shadow-[0_15px_45px_rgba(0,0,0,0.06)] backdrop-blur-2xl animate-in zoom-in-95 duration-400 overflow-hidden">
            {/* Top Google 4-Color Accent Ribbon */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />

            {/* Status Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#34A853]/30 bg-[#E6F4EA] px-4 py-1.5 text-xs font-semibold text-[#137333] shadow-2xs animate-badge-glow">
              <span className="h-2 w-2 rounded-full bg-[#34A853] animate-ping" />
              <span>Responses Securely Recorded</span>
            </div>

            {/* Pulsing Central Clock Icon with Concentric Ripples */}
            <div className="my-6 relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#1A73E8]/30 animate-ripple-1 pointer-events-none" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#E8F0FE] to-[#D2E3FC] text-[#1A73E8] shadow-lg ring-6 ring-[#E8F0FE]/60 animate-float">
                <Clock className="h-10 w-10 text-[#1A73E8]" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202124]">
              Session Completed!
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#5F6368] max-w-xs leading-relaxed">
              Your quiz responses are locked and evaluated. Wait for the live broadcast ceremony to reveal the podium champions.
            </p>

            {/* Session Info Receipt Card (Google Pass Style) */}
            <div className="my-6 w-full max-w-sm rounded-[24px] border border-[#DADCE0] bg-gradient-to-b from-white to-[#F8F9FA] p-4 text-left shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#DADCE0]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6368] flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-[#1A73E8]" />
                  <span>Official Session Receipt</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#1A73E8] border border-[#DADCE0] shadow-2xs font-mono">
                  {completedSession.sessionId.slice(0, 16)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Event Track:</span>
                  <span className="font-semibold text-[#202124]">{completedSession.eventTitle || event?.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Participant:</span>
                  <span className="font-semibold text-[#202124]">{completedSession.userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Questions Answered:</span>
                  <span className="font-semibold text-[#202124]">{completedSession.totalItems} questions</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Completion Time:</span>
                  <span className="font-semibold text-[#137333]">
                    {formatDuration(completedSession.durationMs)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Evaluation Status:</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] px-2.5 py-0.5 text-[10px] font-bold text-[#B06000]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC04] animate-pulse" />
                    Pending Host Ceremony
                  </span>
                </div>
              </div>
            </div>

            {/* Live WebSocket Broadcast Notice */}
            <div className="flex items-center justify-center gap-2 rounded-full border border-[#DADCE0] bg-white px-4 py-2 text-xs font-semibold text-[#3C4043] shadow-xs mb-5">
              <Sparkles className="h-3.5 w-3.5 text-[#FBBC04] animate-spin" style={{ animationDuration: '6s' }} />
              <span>Winners will broadcast live on this screen</span>
            </div>

            {/* Actions: ONLY Redirect Home (No Replay / Play Again on user side) */}
            <div className="flex w-full max-w-sm justify-center">
              <Link
                href="/"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#1A73E8] to-[#4285F4] text-xs font-bold text-white shadow-md shadow-[#1A73E8]/25 hover:from-[#1765CC] hover:to-[#1A73E8] active:scale-95 transition-all"
              >
                <Home className="h-4 w-4" />
                <span>Redirect Home</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : questions.length === 0 ? (
          /* --- EMPTY QUESTIONS STATE --- */
          <div className="my-auto flex flex-col items-center rounded-3xl border border-[#DADCE0] bg-white p-8 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F0FE] text-[#1A73E8] mb-4">
              <HelpCircle className="h-8 w-8 text-[#1A73E8]" />
            </div>
            <h2 className="text-xl font-medium tracking-tight text-[#202124]">
              No Questions Published Yet
            </h2>
            <p className="mt-1.5 text-xs text-[#5F6368] max-w-xs leading-relaxed">
              The administrator has not added questions for this challenge yet. Check back soon or visit the Admin portal to publish new questions.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-xs font-medium text-[#3C4043] hover:bg-[#F8F9FA]"
              >
                Back to Hub
              </Link>
              <Link
                href={`/events/${slug}/leaderboard`}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-[#1A73E8] text-xs font-medium text-white shadow-xs hover:bg-[#1765CC]"
              >
                Standings
              </Link>
            </div>
          </div>
        ) : (
          /* --- ACTIVE QUIZ QUESTION PLAYER --- */
          <div className="flex flex-col flex-1">
            {/* Progress Bar & Timer Header */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1A73E8]/20 bg-white/90 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#1967D2] shadow-2xs">
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                </span>
                <span className="hidden xs:inline-flex items-center rounded-full bg-[#FEF7E0] border border-[#FBBC04]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#B06000]">
                  +{currentQ?.points || 100} pts
                </span>
              </div>

              {/* Countdown Timer with color warning */}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-2xs backdrop-blur-md transition-all ${
                  timeLeft <= 5
                    ? 'bg-[#FCE8E6] text-[#C5221F] ring-2 ring-[#EA4335]/40 animate-pulse'
                    : 'bg-white/90 border border-[#DADCE0] text-[#3C4043]'
                }`}
              >
                <Clock className={`h-3.5 w-3.5 ${timeLeft <= 5 ? 'text-[#EA4335]' : 'text-[#1A73E8]'}`} />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Google Gradient Linear Progress Bar */}
            <div className="h-2 w-full rounded-full bg-[#E8EAED]/80 overflow-hidden my-2 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853] transition-all duration-300 shadow-[0_0_10px_rgba(66,133,244,0.4)]"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question Card - Precision Sharp Architecture */}
            <div className="relative mt-3 flex-1 border border-[#DADCE0] bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between overflow-hidden select-none no-copy" onCopy={(e) => { e.preventDefault(); showCopyProhibitedAlert(); }} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
              {/* Top Google Accent Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />

              <div>
                <h3 className="text-base sm:text-lg font-bold leading-snug text-[#202124] select-none pointer-events-none">
                  {currentQ?.questionText}
                </h3>

                {/* 4 Options with Structured Styling & Zero Border Radius */}
                <div className="mt-6 flex flex-col gap-2.5">
                  {currentQ?.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === optIdx
                    const optionLetter = String.fromCharCode(65 + optIdx)

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(optIdx)}
                        className={`group relative flex min-h-[52px] w-full items-center justify-between gap-3.5 border px-4 py-3 text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1967D2] shadow-xs'
                            : 'border-[#DADCE0] bg-white text-[#3C4043] hover:border-[#1A73E8] hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center font-mono text-xs font-black transition-all ${
                              isSelected
                                ? 'bg-[#1A73E8] text-white'
                                : 'bg-[#F1F3F4] text-[#5F6368] group-hover:bg-[#E8EAED]'
                            }`}
                          >
                            {optionLetter}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold leading-relaxed">
                            {option}
                          </span>
                        </div>

                        {isSelected && (
                          <span className="shrink-0 flex h-5 w-5 items-center justify-center bg-[#1A73E8] text-white animate-in zoom-in-75">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bottom Nav: Previous / Next / Submit */}
              <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#F1F3F4]">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((idx) => idx - 1)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-xs font-semibold text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((idx) => idx + 1)}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1A73E8] px-6 text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] hover:shadow-md active:scale-95 transition-all"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1A73E8] border-t-transparent" />
        </div>
      }
    >
      <QuizRunnerContent />
    </Suspense>
  )
}
