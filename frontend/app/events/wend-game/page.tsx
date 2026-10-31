'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'
import {
  api,
  WendBoardConfig,
  findWordPathInGrid,
  ParticipantSession,
  DiscoveredWordRecord,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { LockedIllustration } from '@/components/ui/LockIllustrations'
import { WendSnakeGrid } from '@/components/wend/WendSnakeGrid'
import { WendWordBank } from '@/components/wend/WendWordBank'
import { WendControls } from '@/components/wend/WendControls'
import confetti from 'canvas-confetti'
import {
  Sparkles,
  ArrowLeft,
  Clock,
  Lock,
  RotateCcw,
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

export default function WendGamePage() {
  const { user } = useAuth()
  const { gameLockStates } = useWebSocket()
  const isLocked = gameLockStates['wend-game']?.isLocked ?? false

  const startTimeRef = useRef<number | null>(null)
  const [board, setBoard] = useState<WendBoardConfig>(() => api.getWendBoard())
  const [foundWordIds, setFoundWordIds] = useState<Set<string>>(new Set())
  const [discoveredWords, setDiscoveredWords] = useState<DiscoveredWordRecord[]>([])
  const [currentWord, setCurrentWord] = useState<string>('')
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null)
  const [hintClue, setHintClue] = useState<string | null>(null)
  const [shakeInvalid, setShakeInvalid] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [completedSession, setCompletedSession] = useState<ParticipantSession | null>(() =>
    api.getParticipantSession('wend-game')
  )

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [])

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 2500)
  }

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
        triggerWinConfetti()

        // Check if all target words are found!
        if (nextFound.size === board.targetWords.length) {
          const durationMs = Math.max(1500, Date.now() - (startTimeRef.current ?? Date.now()))
          const totalPoints = board.targetWords.length * 200

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

          const sessionData: ParticipantSession = {
            sessionId: `sess_wend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventSlug: 'wend-game',
            eventTitle: board.title || 'Wend Word Puzzle Arena',
            userId: user?._id,
            userName: user?.name || 'Community Participant',
            userAvatar: user?.avatar,
            totalItems: board.targetWords.length,
            durationMs,
            submittedAt: new Date().toISOString(),
            status: 'SUBMITTED',
            internalScore: totalPoints,
          }

          api.saveParticipantSession('wend-game', sessionData)
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
    [board, foundWordIds, user]
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
      }, 3500)
    } else {
      setHintClue(`Word is "${target.word}" (${target.word.length} letters)`)
      setTimeout(() => setHintClue(null), 3000)
    }
  }

  // Reset / Play Again
  const handlePlayAgain = () => {
    setCompletedSession(null)
    setFoundWordIds(new Set())
    setDiscoveredWords([])
    startTimeRef.current = Date.now()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gdg_user_session_wend-game')
    }
  }

  const wordColorMap = React.useMemo(() => {
    const map = new Map<string, number>()
    discoveredWords.forEach((dw) => map.set(dw.wordId, dw.colorIndex))
    return map
  }, [discoveredWords])

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#202124]">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-between p-3 sm:p-5 max-w-lg mx-auto w-full">
        {/* Navigation & Live Header */}
        <div className="w-full flex items-center justify-between mb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6368] hover:text-[#202124] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Challenges</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#3C4043] border border-[#DADCE0] shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#7CB342] animate-pulse" />
              <span>{foundWordIds.size} / {board.targetWords.length} Words Found</span>
            </span>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`mb-2 w-full text-center py-1 px-4 rounded-full text-xs font-semibold animate-in slide-in-from-top-2 duration-200 shadow-xs border ${
              toastMessage.type === 'success'
                ? 'bg-[#E6F4EA] text-[#137333] border-[#34A853]/40'
                : toastMessage.type === 'error'
                ? 'bg-[#FCE8E6] text-[#C5221F] border-[#EA4335]/40'
                : 'bg-[#E8F0FE] text-[#1A73E8] border-[#4285F4]/40'
            }`}
          >
            {toastMessage.text}
          </div>
        )}

        {/* Hint Clue Banner */}
        {hintClue && (
          <div className="mb-2 w-full text-center py-1.5 px-4 rounded-2xl text-xs font-bold bg-[#FEF7E0] text-[#B06000] border border-[#FBBC04]/50 shadow-xs animate-in zoom-in-95">
            💡 Hint: {hintClue}
          </div>
        )}

        {/* --- LOCKED OVERLAY --- */}
        {isLocked ? (
          <div className="my-auto flex flex-col items-center rounded-3xl border border-[#DADCE0] bg-white p-8 text-center shadow-sm max-w-md w-full">
            <div className="mb-4 flex items-center justify-center">
              <LockedIllustration size={100} />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F3F4] px-3.5 py-1 text-xs font-medium text-[#5F6368] mb-3">
              <Lock className="h-3.5 w-3.5" />
              <span>Track Currently Locked</span>
            </div>
            <h2 className="text-xl font-medium tracking-tight text-[#202124]">
              Wend Word Arena is Locked
            </h2>
            <p className="mt-2 text-xs text-[#5F6368] leading-relaxed">
              The event host has locked this challenge arena. When unlocked or launched with a countdown, the puzzle will unlock automatically.
            </p>
            <div className="mt-6 flex gap-3 w-full">
              <Link
                href="/"
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-xs font-semibold text-[#3C4043] hover:bg-[#F8F9FA]"
              >
                Return to Hub
              </Link>
            </div>
          </div>
        ) : completedSession ? (
          /* --- AESTHETIC WAIT MESSAGE & SESSION INFO SCREEN --- */
          <div className="my-auto flex flex-col items-center rounded-[32px] border border-white/80 bg-white/95 p-7 sm:p-8 text-center shadow-sm backdrop-blur-xl animate-in zoom-in-95 duration-400 w-full">
            {/* Status Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#34A853]/30 bg-[#E6F4EA] px-4 py-1.5 text-xs font-semibold text-[#137333] shadow-2xs animate-badge-glow">
              <span className="h-2 w-2 rounded-full bg-[#34A853] animate-ping" />
              <span>Puzzle Completed Successfully</span>
            </div>

            {/* Pulsing Central Clock Icon */}
            <div className="my-5 relative flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F0FE] text-[#1A73E8] shadow-md ring-8 ring-[#E8F0FE]/50 animate-float">
              <Clock className="h-10 w-10 text-[#1A73E8]" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-[#202124]">
              Session Completed!
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#5F6368] max-w-xs leading-relaxed">
              Your word puzzle responses have been securely recorded. Please wait for the host to announce the winners during the live ceremony.
            </p>

            {/* Session Info Receipt Card (Points/Answers Hidden, Session Stored) */}
            <div className="my-5 w-full max-w-sm rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-4 text-left shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#DADCE0]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  Session Receipt
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#1A73E8] border border-[#DADCE0]">
                  ID: {completedSession.sessionId.slice(0, 16)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Event Track:</span>
                  <span className="font-semibold text-[#202124]">{completedSession.eventTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Participant:</span>
                  <span className="font-semibold text-[#202124]">{completedSession.userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5F6368]">Words Solved:</span>
                  <span className="font-semibold text-[#202124]">{completedSession.totalItems} words</span>
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

            {/* Live Broadcast Notice */}
            <div className="flex items-center justify-center gap-2 rounded-full border border-[#DADCE0] bg-white px-4 py-2 text-xs font-medium text-[#3C4043] shadow-xs mb-4">
              <Sparkles className="h-3.5 w-3.5 text-[#FBBC04] animate-spin" style={{ animationDuration: '6s' }} />
              <span>Winners will broadcast live on this screen</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 w-full max-w-sm">
              <button
                onClick={handlePlayAgain}
                className="flex h-10 flex-1 items-center justify-center gap-1 rounded-full border border-[#DADCE0] bg-white text-xs font-semibold text-[#3C4043] hover:bg-[#F8F9FA] active:scale-95 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Play Again</span>
              </button>
              <Link
                href="/"
                className="flex h-10 flex-1 items-center justify-center rounded-full bg-[#1A73E8] text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all"
              >
                Return to Hub
              </Link>
            </div>
          </div>
        ) : (
          /* --- ACTIVE SNAKE WORD PATH PUZZLE ARENA --- */
          <div className="flex flex-col items-center gap-4 w-full my-auto">
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

            {/* 3. Word Slots Matrix (Rows of blank letter boxes filling pastel upon discovery) */}
            <div className="w-full pt-1 pb-3">
              <WendWordBank
                targetWords={board.targetWords}
                foundWordIds={foundWordIds}
                wordColorMap={wordColorMap}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
