'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { LeaderboardEntry, CeremonyWinner, WendBoardConfig, QuestionData } from '@/lib/api'
import { useAuth } from './AuthContext'

export interface ConnectedSession {
  sessionId: string
  userId?: string
  name: string
  avatar?: string
  role?: string
  device?: 'mobile' | 'desktop' | 'tablet'
  joinedAt?: number
  activeGame?: string
}

export function normalizeGameSlug(slug: string): string {
  const lower = (slug || '').toLowerCase().trim()
  if (lower.includes('wend')) return 'wend-game'
  if (lower.includes('mentis')) return 'mentis-quiz'
  if (lower.includes('web')) return 'web-dev-quiz'
  return slug
}

// Backward-compatible alias
export type JoinedUser = ConnectedSession

export interface CeremonyData {
  gameSlug: string
  gameTitle: string
  winners: CeremonyWinner[]
  fullLeaderboard: LeaderboardEntry[]
  broadcastId?: string
  timestamp?: number
}


export interface SecurityAlert {
  id: string
  userId?: string
  userName: string
  userEmail?: string
  avatar?: string
  gameSlug: string
  gameTitle?: string
  questionIndex?: number
  warningCount: number
  maxWarnings: number
  isDisqualified: boolean
  timestamp: string
}

interface WebSocketContextType {
  connected: boolean
  currentSessionId: string
  connectedSessions: ConnectedSession[]
  activeCountdown: { gameSlug: string; count: number } | null
  activeCeremony: CeremonyData | null
  gameLockStates: Record<string, { isLocked: boolean; status: string }>
  liveLeaderboards: Record<string, LeaderboardEntry[]>
  sendUserJoin: (user: Partial<ConnectedSession>) => void
  sendSubmitAttempt: (gameSlug: string, entry: LeaderboardEntry) => void
  sendLockToggle: (gameSlug: string, isLocked: boolean, status: string) => void
  sendCountdownStart: (gameSlug: string) => void
  sendWinnerCeremonyStart: (ceremonyData: CeremonyData) => void
  sendLeaderboardReset: (gameSlug: string) => void
  sendDeleteLeaderboardEntry: (gameSlug: string, participantId: string, participantName?: string) => void
  sendWendConfigUpdate: (config: WendBoardConfig) => void
  sendBubbleImpulse: (impulse: { x: number; y: number; senderSessionId?: string }) => void
  securityAlerts: SecurityAlert[]
  unreadSecurityAlertsCount: number
  sendScreenshotViolation: (alert: Omit<SecurityAlert, 'id' | 'maxWarnings' | 'isDisqualified' | 'timestamp'>) => void
  clearSecurityAlerts: () => void
  markSecurityAlertsRead: () => void
  closeCeremony: () => void
  reconnect: () => void
  sendQuestionsUpdate: (gameSlug: string, questions: QuestionData[]) => void
  sendTimeLimitUpdate: (gameSlug: string, timeLimitSeconds: number) => void
  subscribeToTimeLimitUpdate: (callback: (gameSlug: string, timeLimitSeconds: number) => void) => () => void
  subscribeToUserJoin: (callback: (session: ConnectedSession) => void) => () => void
  subscribeToUserLeave: (callback: (sessionId: string) => void) => () => void
  subscribeToLeaderboardReset: (callback: (gameSlug: string) => void) => () => void
  subscribeToLeaderboardUpdate: (callback: (gameSlug: string, leaderboard: LeaderboardEntry[]) => void) => () => void
  subscribeToQuestionsUpdate: (callback: (gameSlug: string, questions: QuestionData[]) => void) => () => void
  sendGameEnter: (gameSlug: string) => void
  sendGameLeave: (gameSlug: string) => void
  getActiveGameCount: (gameSlug: string) => number
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  currentSessionId: 'sess_init',
  connectedSessions: [],
  activeCountdown: null,
  activeCeremony: null,
  gameLockStates: {},
  liveLeaderboards: {},
  sendUserJoin: () => {},
  sendSubmitAttempt: () => {},
  sendLockToggle: () => {},
  sendCountdownStart: () => {},
  sendWinnerCeremonyStart: () => {},
  sendLeaderboardReset: () => {},
  sendDeleteLeaderboardEntry: () => {},
  sendQuestionsUpdate: () => {},
  sendTimeLimitUpdate: () => {},
  subscribeToTimeLimitUpdate: () => () => {},
  sendWendConfigUpdate: () => {},
  sendBubbleImpulse: () => {},
  securityAlerts: [],
  unreadSecurityAlertsCount: 0,
  sendScreenshotViolation: () => {},
  clearSecurityAlerts: () => {},
  markSecurityAlertsRead: () => {},
  closeCeremony: () => {},
  reconnect: () => {},
  subscribeToUserJoin: () => () => {},
  subscribeToUserLeave: () => () => {},
  subscribeToLeaderboardReset: () => () => {},
  subscribeToLeaderboardUpdate: () => () => {},
  subscribeToQuestionsUpdate: () => () => {},
  sendGameEnter: () => {},
  sendGameLeave: () => {},
  getActiveGameCount: () => 0,
})

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.hostname}:5000/ws`
  }
  return 'ws://localhost:5000/ws'
}

function getClientSessionId(): string {
  if (typeof window === 'undefined') return 'sess_ssr'
  try {
    let sid = sessionStorage.getItem('gdg_client_session_id')
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      sessionStorage.setItem('gdg_client_session_id', sid)
    }
    return sid
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
}

function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobile|iphone|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [currentSessionId] = useState<string>(() => getClientSessionId())
  const [connected, setConnected] = useState(false)
  const [connectedSessions, setConnectedSessions] = useState<ConnectedSession[]>([])
  const [activeGamePresence, setActiveGamePresence] = useState<Record<string, string[]>>({})
  const [activeCountdown, setActiveCountdown] = useState<{ gameSlug: string; count: number } | null>(null)
  const [activeCeremony, setActiveCeremony] = useState<CeremonyData | null>(null)
  const [gameLockStates, setGameLockStates] = useState<Record<string, { isLocked: boolean; status: string }>>({
    'web-dev-quiz': { isLocked: false, status: 'LIVE' },
    'mentis-quiz': { isLocked: true, status: 'UPCOMING' },
    'wend-game': { isLocked: false, status: 'LIVE' },
  })
  const [liveLeaderboards, setLiveLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({})
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [unreadSecurityAlertsCount, setUnreadSecurityAlertsCount] = useState<number>(0)

  const wsRef = useRef<WebSocket | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const userJoinSubscribersRef = useRef<Set<(session: ConnectedSession) => void>>(new Set())
  const userLeaveSubscribersRef = useRef<Set<(sessionId: string) => void>>(new Set())
  const leaderboardResetSubscribersRef = useRef<Set<(gameSlug: string) => void>>(new Set())
  const leaderboardUpdateSubscribersRef = useRef<Set<(gameSlug: string, leaderboard: LeaderboardEntry[]) => void>>(new Set())
  const questionsUpdateSubscribersRef = useRef<Set<(gameSlug: string, questions: QuestionData[]) => void>>(new Set())
  const timeLimitUpdateSubscribersRef = useRef<Set<(gameSlug: string, timeLimitSeconds: number) => void>>(new Set())
  const pendingMessagesRef = useRef<{ type: string; payload?: unknown }[]>([])
  const connectFnRef = useRef<(() => void) | null>(null)

  // Trigger user join listeners
  const notifyUserJoined = useCallback((session: ConnectedSession) => {
    userJoinSubscribersRef.current.forEach((cb) => {
      try {
        cb(session)
      } catch (err) {
        console.error('Error in user join listener:', err)
      }
    })
  }, [])

  // Trigger user leave listeners
  const notifyUserLeft = useCallback((sessionId: string) => {
    userLeaveSubscribersRef.current.forEach((cb) => {
      try {
        cb(sessionId)
      } catch (err) {
        console.error('Error in user leave listener:', err)
      }
    })
  }, [])

  // Trigger leaderboard reset listeners
  const notifyLeaderboardReset = useCallback((gameSlug: string) => {
    leaderboardResetSubscribersRef.current.forEach((cb) => {
      try {
        cb(gameSlug)
      } catch (err) {
        console.error('Error in leaderboard reset listener:', err)
      }
    })
  }, [])

  // Trigger leaderboard update listeners
  const notifyLeaderboardUpdate = useCallback((gameSlug: string, leaderboard: LeaderboardEntry[]) => {
    leaderboardUpdateSubscribersRef.current.forEach((cb) => {
      try {
        cb(gameSlug, leaderboard)
      } catch (err) {
        console.error('Error in leaderboard update listener:', err)
      }
    })
  }, [])

  // Start internal 5-4-3-2-1 countdown sequence
  const runCountdown = useCallback((gameSlug: string) => {
    let current = 5
    setActiveCountdown({ gameSlug, count: current })

    const interval = setInterval(() => {
      current -= 1
      if (current >= 0) {
        setActiveCountdown({ gameSlug, count: current })
      } else {
        clearInterval(interval)
        setActiveCountdown(null)
      }
    }, 1000)
  }, [])

  // Process incoming WS or BroadcastChannel messages
  const handleIncomingMessage = useCallback(
    (message: { type: string; payload?: unknown }) => {
      const payload = message.payload as Record<string, unknown> | undefined
      if (!payload && message.type !== 'PING') return

      switch (message.type) {
        case 'USER_JOIN': {
          const rawSession = payload as { sessionId?: string; id?: string; userId?: string; name?: string; avatar?: string; role?: string; device?: 'mobile' | 'desktop' | 'tablet'; joinedAt?: number; activeGame?: string } | undefined
          const sid = rawSession?.sessionId || rawSession?.id
          if (rawSession && sid) {
            const normGame = rawSession.activeGame ? normalizeGameSlug(rawSession.activeGame) : undefined
            const normalized: ConnectedSession = {
              sessionId: sid,
              userId: rawSession.userId,
              name: rawSession.name || 'Participant',
              avatar: rawSession.avatar,
              role: rawSession.role,
              device: rawSession.device,
              joinedAt: rawSession.joinedAt,
              activeGame: normGame,
            }
            setConnectedSessions((prev) => {
              const filtered = prev.filter((s) => s.sessionId !== sid)
              return [...filtered, normalized]
            })
            if (normGame) {
              setActiveGamePresence((prev) => {
                const list = prev[normGame] || []
                return { ...prev, [normGame]: Array.from(new Set([...list, sid])) }
              })
            }
            notifyUserJoined(normalized)
          }
          break
        }
        case 'GAME_PRESENCE': {
          const { sessionId, gameSlug, isPlaying } = (payload || {}) as { sessionId?: string; gameSlug?: string; isPlaying?: boolean }
          if (sessionId && gameSlug) {
            const norm = normalizeGameSlug(gameSlug)
            setConnectedSessions((prev) =>
              prev.map((s) => (s.sessionId === sessionId ? { ...s, activeGame: isPlaying ? norm : undefined } : s))
            )
            setActiveGamePresence((prev) => {
              const list = prev[norm] || []
              const updated = isPlaying
                ? Array.from(new Set([...list, sessionId]))
                : list.filter((id) => id !== sessionId)
              return { ...prev, [norm]: updated }
            })
          }
          break
        }
        case 'USER_LEAVE': {
          const sid = (payload as { sessionId?: string; id?: string })?.sessionId || (payload as { id?: string })?.id
          if (sid) {
            setConnectedSessions((prev) => prev.filter((s) => s.sessionId !== sid))
            setActiveGamePresence((prev) => {
              const next: Record<string, string[]> = {}
              for (const [k, v] of Object.entries(prev)) {
                next[k] = v.filter((id) => id !== sid)
              }
              return next
            })
            notifyUserLeft(sid)
          }
          break
        }
        case 'LEADERBOARD_UPDATE': {
          const gameSlug = payload?.gameSlug as string | undefined
          const leaderboard = payload?.leaderboard as LeaderboardEntry[] | undefined
          if (gameSlug && Array.isArray(leaderboard)) {
            setLiveLeaderboards((prev) => ({
              ...prev,
              [gameSlug]: leaderboard,
            }))
            notifyLeaderboardUpdate(gameSlug, leaderboard)
          }
          break
        }
        case 'GAME_LOCK_TOGGLE': {
          const gameSlug = payload?.gameSlug as string | undefined
          if (gameSlug) {
            const norm = normalizeGameSlug(gameSlug)
            const lockObj = {
              isLocked: Boolean(payload?.isLocked),
              status: String(payload?.status || 'UPCOMING'),
            }
            setGameLockStates((prev) => ({
              ...prev,
              [gameSlug]: lockObj,
              [norm]: lockObj,
            }))
          }
          break
        }
        case 'START_COUNTDOWN': {
          const gameSlug = payload?.gameSlug as string | undefined
          if (gameSlug) {
            runCountdown(gameSlug)
          }
          break
        }
        case 'START_WINNER_CEREMONY': {
          const raw = payload as unknown as CeremonyData
          const enriched: CeremonyData = {
            ...raw,
            broadcastId: raw?.broadcastId || `ceremony_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: raw?.timestamp || Date.now(),
          }
          setActiveCeremony(enriched)
          break
        }
        case 'RESET_GAME_LEADERBOARD': {
          const gameSlug = payload?.gameSlug as string | undefined
          if (gameSlug) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`gdg_ceremony_revealed_${gameSlug}`)
            }
            setLiveLeaderboards((prev) => ({
              ...prev,
              [gameSlug]: [],
            }))
            notifyLeaderboardReset(gameSlug)
          }
          break
        }
        case 'SYNC_STATE': {
          if (payload?.gameStates && typeof payload.gameStates === 'object') {
            const normalizedMap: Record<string, { isLocked: boolean; status: string }> = {}
            for (const [key, val] of Object.entries(payload.gameStates as Record<string, any>)) {
              if (val && typeof val === 'object') {
                const normKey = normalizeGameSlug(key)
                const entry = { isLocked: Boolean(val.isLocked), status: String(val.status || 'UPCOMING') }
                normalizedMap[key] = entry
                normalizedMap[normKey] = entry
              }
            }
            setGameLockStates((prev) => ({ ...prev, ...normalizedMap }))
          }
          if (Array.isArray(payload?.sessions)) {
            const sessionsList = (payload.sessions as ConnectedSession[]).map((s) => ({
              ...s,
              activeGame: s.activeGame ? normalizeGameSlug(s.activeGame) : undefined,
            }))
            setConnectedSessions(sessionsList)
            const presenceMap: Record<string, string[]> = {}
            sessionsList.forEach((s) => {
              if (s.activeGame) {
                const norm = normalizeGameSlug(s.activeGame)
                presenceMap[norm] = Array.from(new Set([...(presenceMap[norm] || []), s.sessionId]))
              }
            })
            setActiveGamePresence(presenceMap)
          } else if (Array.isArray(payload?.users)) {
            const rawUsers = payload.users as { sessionId?: string; id?: string; userId?: string; name?: string; avatar?: string; role?: string }[]
            const mapped: ConnectedSession[] = rawUsers.map((u) => ({
              sessionId: u.sessionId || u.id || `sess_${Math.random()}`,
              userId: u.userId || u.id,
              name: u.name || 'Participant',
              avatar: u.avatar,
              role: u.role,
            }))
            setConnectedSessions(mapped)
          }
          if (payload?.leaderboards && typeof payload.leaderboards === 'object') {
            setLiveLeaderboards(payload.leaderboards as Record<string, LeaderboardEntry[]>)
          }
          if (Array.isArray(payload?.securityAlerts)) {
            setSecurityAlerts(payload.securityAlerts as SecurityAlert[])
          }
          if (payload?.wendBoardConfig) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('gdg_wend_board_config', JSON.stringify(payload.wendBoardConfig))
              window.dispatchEvent(new CustomEvent('gdg_wend_board_sync', { detail: payload.wendBoardConfig }))
            }
          }
          break
        }
        case 'WEND_CONFIG_UPDATE': {
          if (payload) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('gdg_wend_board_config', JSON.stringify(payload))
              window.dispatchEvent(new CustomEvent('gdg_wend_board_sync', { detail: payload }))
            }
          }
          break
        }
        case 'QUESTIONS_UPDATE': {
          const gameSlug = payload?.gameSlug as string | undefined
          const questions = payload?.questions as QuestionData[] | undefined
          if (gameSlug && Array.isArray(questions)) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(`gdg_questions_${gameSlug}`, JSON.stringify(questions))
              window.dispatchEvent(new CustomEvent('gdg_questions_sync', { detail: payload }))
            }
            questionsUpdateSubscribersRef.current.forEach((cb) => {
              try { cb(gameSlug, questions) } catch (err) { console.error('Error in questions update listener:', err) }
            })
          }
          break
        }
        case 'GAME_TIME_LIMIT_UPDATE': {
          const gameSlug = payload?.gameSlug as string | undefined
          const timeLimitSeconds = payload?.timeLimitSeconds as number | undefined
          if (gameSlug && typeof timeLimitSeconds === 'number') {
            if (typeof window !== 'undefined') {
              localStorage.setItem(`gdg_time_limit_${gameSlug}`, String(timeLimitSeconds))
              window.dispatchEvent(new CustomEvent('gdg_time_limit_sync', { detail: payload }))
            }
            timeLimitUpdateSubscribersRef.current.forEach((cb) => {
              try { cb(gameSlug, timeLimitSeconds) } catch (err) { console.error('Error in time limit update listener:', err) }
            })
          }
          break
        }
        case 'ADMIN_SECURITY_ALERT': {
          const alert = payload as unknown as SecurityAlert
          if (alert && alert.id) {
            setSecurityAlerts((prev) => {
              const filtered = prev.filter((a) => a.id !== alert.id)
              return [alert, ...filtered.slice(0, 49)]
            })
            setUnreadSecurityAlertsCount((c) => c + 1)
          }
          break
        }
        case 'CLEAR_SECURITY_ALERTS': {
          setSecurityAlerts([])
          setUnreadSecurityAlertsCount(0)
          break
        }
        case 'PING': {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'PONG' }))
          }
          break
        }
        default:
          break
      }
    },
    [notifyUserJoined, notifyUserLeft, notifyLeaderboardReset, notifyLeaderboardUpdate, runCountdown]
  )

  const handleIncomingMessageRef = useRef(handleIncomingMessage)
  useEffect(() => {
    handleIncomingMessageRef.current = handleIncomingMessage
  })

  // Initialize WebSocket & cross-tab BroadcastChannel
  useEffect(() => {
    let isMounted = true

    // 1. Cross-tab BroadcastChannel (works for local tabs)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('gdg_realtime_channel')
      broadcastChannelRef.current = channel
      channel.onmessage = (event) => {
        handleIncomingMessageRef.current(event.data)
      }
    }

    // 2. Native WebSocket Connection
    let socket: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout

    const connectWs = () => {
      if (!isMounted) return

      try {
        const url = getWsUrl()
        socket = new WebSocket(url)
        wsRef.current = socket

        socket.onopen = () => {
          const currentSocket = wsRef.current
          if (!isMounted) {
            currentSocket?.close()
            return
          }
          setConnected(true)

          // Flush any buffered outgoing messages immediately
          if (currentSocket) {
            while (pendingMessagesRef.current.length > 0) {
              const msg = pendingMessagesRef.current.shift()
              if (msg && currentSocket.readyState === WebSocket.OPEN) {
                currentSocket.send(JSON.stringify(msg))
              }
            }
          }
        }

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            handleIncomingMessageRef.current(data)
          } catch {}
        }

        socket.onclose = () => {
          setConnected(false)
          if (isMounted) {
            reconnectTimeout = setTimeout(connectWs, 2500)
          }
        }

        socket.onerror = () => {
          // Non-fatal; onclose will schedule reconnect
        }
      } catch {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWs, 2500)
        }
      }
    }

    connectFnRef.current = connectWs
    connectWs()

    return () => {
      isMounted = false
      clearTimeout(reconnectTimeout)
      if (socket) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close()
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            socket?.close()
          }
        }
      }
      broadcastChannelRef.current?.close()
    }
  }, [])

  const reconnect = useCallback(() => {
    if (connectFnRef.current) {
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {}
      }
      connectFnRef.current()
    }
  }, [])

  // Dispatch message via WebSocket (or queue if connecting) and BroadcastChannel
  const broadcastMessage = useCallback((msg: { type: string; payload?: unknown }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    } else {
      pendingMessagesRef.current.push(msg)
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(msg)
    }
  }, [])

  const sendUserJoin = useCallback(
    (userPayload: Partial<ConnectedSession>) => {
      let activeGame = userPayload.activeGame
      if (!activeGame && typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem('gdg_active_game')
          if (stored) activeGame = stored
        } catch {}
      }
      const fullSession: ConnectedSession = {
        sessionId: userPayload.sessionId || currentSessionId,
        userId: userPayload.userId,
        name: userPayload.name || 'Participant',
        avatar: userPayload.avatar,
        role: userPayload.role || 'PARTICIPANT',
        device: userPayload.device || detectDeviceType(),
        joinedAt: Date.now(),
        activeGame: activeGame ? normalizeGameSlug(activeGame) : undefined,
      }

      setConnectedSessions((prev) => {
        const filtered = prev.filter((s) => s.sessionId !== fullSession.sessionId)
        return [...filtered, fullSession]
      })

      broadcastMessage({ type: 'USER_JOIN', payload: fullSession })
      notifyUserJoined(fullSession)
    },
    [broadcastMessage, currentSessionId, notifyUserJoined]
  )

  const sendSubmitAttempt = useCallback(
    (gameSlug: string, entry: LeaderboardEntry) => {
      // Optimistically update local leaderboards state
      setLiveLeaderboards((prev) => {
        const current = prev[gameSlug] || []
        const participantId = entry.user?._id || entry._id
        const filtered = current.filter((e) => (e.user?._id || e._id) !== participantId)
        const updated = [...filtered, entry].sort((a, b) => b.totalScore - a.totalScore || a.durationMs - b.durationMs)
        return {
          ...prev,
          [gameSlug]: updated,
        }
      })

      broadcastMessage({
        type: 'SUBMIT_ATTEMPT',
        payload: { gameSlug, entry },
      })
    },
    [broadcastMessage]
  )

  const { user } = useAuth()

  // Sync user state with WebSocket when user logs in or reconnects
  useEffect(() => {
    if (user && connected) {
      broadcastMessage({
        type: 'USER_JOIN',
        payload: {
          sessionId: currentSessionId,
          userId: user._id,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          device: detectDeviceType(),
          joinedAt: Date.now(),
        },
      })
    }
  }, [user, connected, currentSessionId, broadcastMessage])

  const sendLockToggle = useCallback(
    (gameSlug: string, isLocked: boolean, status: string) => {
      const norm = normalizeGameSlug(gameSlug)
      setGameLockStates((prev) => ({
        ...prev,
        [gameSlug]: { isLocked, status },
        [norm]: { isLocked, status },
      }))
      broadcastMessage({
        type: 'GAME_LOCK_TOGGLE',
        payload: {
          gameSlug: norm,
          rawSlug: gameSlug,
          isLocked,
          status,
          role: 'ADMIN',
          adminAuth: true,
        },
      })
    },
    [broadcastMessage]
  )

  const sendCountdownStart = useCallback(
    (gameSlug: string) => {
      broadcastMessage({
        type: 'START_COUNTDOWN',
        payload: {
          gameSlug,
          role: 'ADMIN',
          adminAuth: true,
        },
      })
      runCountdown(gameSlug)
    },
    [broadcastMessage, runCountdown]
  )

  const sendWinnerCeremonyStart = useCallback(
    (ceremonyData: CeremonyData) => {
      const broadcastId = ceremonyData.broadcastId || `ceremony_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const enriched: CeremonyData = {
        ...ceremonyData,
        broadcastId,
        timestamp: Date.now(),
      }
      setActiveCeremony(enriched)
      broadcastMessage({
        type: 'START_WINNER_CEREMONY',
        payload: {
          ...enriched,
          role: 'ADMIN',
          adminAuth: true,
        },
      })
    },
    [broadcastMessage]
  )

  const sendLeaderboardReset = useCallback(
    (gameSlug: string) => {
      setLiveLeaderboards((prev) => ({
        ...prev,
        [gameSlug]: [],
      }))
      notifyLeaderboardReset(gameSlug)
      broadcastMessage({
        type: 'RESET_GAME_LEADERBOARD',
        payload: { gameSlug },
      })
    },
    [broadcastMessage, notifyLeaderboardReset]
  )

  const sendDeleteLeaderboardEntry = useCallback(
    (gameSlug: string, participantId: string, participantName?: string) => {
      setLiveLeaderboards((prev) => {
        const list = prev[gameSlug] || []
        const filtered = list.filter((e) => {
          const matchId = (e.user?._id && e.user._id === participantId) || e._id === participantId
          const matchName = participantName && e.user?.name?.toLowerCase() === participantName.toLowerCase()
          return !matchId && !matchName
        })
        return {
          ...prev,
          [gameSlug]: filtered,
        }
      })

      broadcastMessage({
        type: 'DELETE_LEADERBOARD_ENTRY',
        payload: { gameSlug, participantId, participantName },
      })
    },
    [broadcastMessage]
  )

  const sendWendConfigUpdate = useCallback(
    (config: WendBoardConfig) => {
      broadcastMessage({
        type: 'WEND_CONFIG_UPDATE',
        payload: config,
      })
    },
    [broadcastMessage]
  )

  const sendBubbleImpulse = useCallback(
    (impulse: { x: number; y: number; senderSessionId?: string }) => {
      broadcastMessage({
        type: 'BUBBLE_IMPULSE',
        payload: { ...impulse, senderSessionId: currentSessionId },
      })
    },
    [broadcastMessage, currentSessionId]
  )

  const sendScreenshotViolation = useCallback(
    (alertData: Omit<SecurityAlert, 'id' | 'maxWarnings' | 'isDisqualified' | 'timestamp'>) => {
      const fullAlert: SecurityAlert = {
        ...alertData,
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        maxWarnings: 3,
        isDisqualified: alertData.warningCount >= 3,
        timestamp: new Date().toISOString(),
      }
      setSecurityAlerts((prev) => [fullAlert, ...prev.slice(0, 49)])
      broadcastMessage({
        type: 'SCREENSHOT_VIOLATION',
        payload: fullAlert,
      })
    },
    [broadcastMessage]
  )

  const clearSecurityAlerts = useCallback(() => {
    setSecurityAlerts([])
    setUnreadSecurityAlertsCount(0)
    broadcastMessage({ type: 'CLEAR_SECURITY_ALERTS', payload: {} })
  }, [broadcastMessage])

  const markSecurityAlertsRead = useCallback(() => {
    setUnreadSecurityAlertsCount(0)
  }, [])

  const closeCeremony = useCallback(() => {
    setActiveCeremony(null)
  }, [])

  const subscribeToUserJoin = useCallback((callback: (session: ConnectedSession) => void) => {
    userJoinSubscribersRef.current.add(callback)
    return () => {
      userJoinSubscribersRef.current.delete(callback)
    }
  }, [])

  const subscribeToUserLeave = useCallback((callback: (sessionId: string) => void) => {
    userLeaveSubscribersRef.current.add(callback)
    return () => {
      userLeaveSubscribersRef.current.delete(callback)
    }
  }, [])

  const subscribeToLeaderboardReset = useCallback((callback: (gameSlug: string) => void) => {
    leaderboardResetSubscribersRef.current.add(callback)
    return () => {
      leaderboardResetSubscribersRef.current.delete(callback)
    }
  }, [])

  const subscribeToLeaderboardUpdate = useCallback(
    (callback: (gameSlug: string, leaderboard: LeaderboardEntry[]) => void) => {
      leaderboardUpdateSubscribersRef.current.add(callback)
      return () => {
        leaderboardUpdateSubscribersRef.current.delete(callback)
      }
    },
    []
  )

  const sendQuestionsUpdate = useCallback((gameSlug: string, questions: QuestionData[]) => {
    broadcastMessage({
      type: 'QUESTIONS_UPDATE',
      payload: {
        gameSlug,
        questions,
        role: 'ADMIN',
        adminAuth: true,
      },
    })
  }, [broadcastMessage])

  const subscribeToQuestionsUpdate = useCallback(
    (callback: (gameSlug: string, questions: QuestionData[]) => void) => {
      questionsUpdateSubscribersRef.current.add(callback)
      return () => {
        questionsUpdateSubscribersRef.current.delete(callback)
      }
    },
    []
  )

  const sendTimeLimitUpdate = useCallback((gameSlug: string, timeLimitSeconds: number) => {
    const norm = normalizeGameSlug(gameSlug)
    const safeSecs = Math.max(10, timeLimitSeconds)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gdg_time_limit_${norm}`, String(safeSecs))
      window.dispatchEvent(new CustomEvent('gdg_time_limit_sync', { detail: { slug: norm, timeLimitSeconds: safeSecs } }))
    }
    broadcastMessage({
      type: 'GAME_TIME_LIMIT_UPDATE',
      payload: {
        gameSlug: norm,
        timeLimitSeconds: safeSecs,
        role: 'ADMIN',
        adminAuth: true,
      },
    })
  }, [broadcastMessage])

  const subscribeToTimeLimitUpdate = useCallback(
    (callback: (gameSlug: string, timeLimitSeconds: number) => void) => {
      timeLimitUpdateSubscribersRef.current.add(callback)
      return () => {
        timeLimitUpdateSubscribersRef.current.delete(callback)
      }
    },
    []
  )

  const sendGameEnter = useCallback(
    (gameSlug: string) => {
      const norm = normalizeGameSlug(gameSlug)
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('gdg_active_game', norm)
        }
      } catch {}

      setConnectedSessions((prev) =>
        prev.map((s) => (s.sessionId === currentSessionId ? { ...s, activeGame: norm } : s))
      )
      setActiveGamePresence((prev) => {
        const list = prev[norm] || []
        return { ...prev, [norm]: Array.from(new Set([...list, currentSessionId])) }
      })

      broadcastMessage({
        type: 'GAME_PRESENCE',
        payload: { sessionId: currentSessionId, gameSlug: norm, isPlaying: true },
      })
      sendUserJoin({ sessionId: currentSessionId, activeGame: norm })
    },
    [currentSessionId, broadcastMessage, sendUserJoin]
  )

  const sendGameLeave = useCallback(
    (gameSlug: string) => {
      const norm = normalizeGameSlug(gameSlug)
      try {
        if (typeof window !== 'undefined') {
          const cur = sessionStorage.getItem('gdg_active_game')
          if (cur === norm) {
            sessionStorage.removeItem('gdg_active_game')
          }
        }
      } catch {}

      setConnectedSessions((prev) =>
        prev.map((s) => (s.sessionId === currentSessionId ? { ...s, activeGame: undefined } : s))
      )
      setActiveGamePresence((prev) => {
        const list = prev[norm] || []
        return { ...prev, [norm]: list.filter((id) => id !== currentSessionId) }
      })

      broadcastMessage({
        type: 'GAME_PRESENCE',
        payload: { sessionId: currentSessionId, gameSlug: norm, isPlaying: false },
      })
    },
    [currentSessionId, broadcastMessage]
  )

  const getActiveGameCount = useCallback(
    (gameSlug: string): number => {
      const norm = normalizeGameSlug(gameSlug)
      const sessionsPlaying = connectedSessions.filter(
        (s) => s.activeGame && normalizeGameSlug(s.activeGame) === norm && s.role !== 'ADMIN'
      ).length

      const presenceIds = (activeGamePresence[norm] || []).length

      let isLocalPlaying = false
      if (typeof window !== 'undefined') {
        try {
          isLocalPlaying = sessionStorage.getItem('gdg_active_game') === norm
        } catch {}
      }

      return Math.max(sessionsPlaying, presenceIds, isLocalPlaying ? 1 : 0)
    },
    [connectedSessions, activeGamePresence]
  )

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        currentSessionId,
        connectedSessions,
        activeCountdown,
        activeCeremony,
        gameLockStates,
        liveLeaderboards,
        sendUserJoin,
        sendSubmitAttempt,
        sendLockToggle,
        sendCountdownStart,
        sendWinnerCeremonyStart,
        sendLeaderboardReset,
        sendDeleteLeaderboardEntry,
        sendQuestionsUpdate,
        sendTimeLimitUpdate,
        subscribeToTimeLimitUpdate,
        sendWendConfigUpdate,
        sendBubbleImpulse,
        securityAlerts,
        unreadSecurityAlertsCount,
        sendScreenshotViolation,
        clearSecurityAlerts,
        markSecurityAlertsRead,
        closeCeremony,
        reconnect,
        subscribeToUserJoin,
        subscribeToUserLeave,
        subscribeToLeaderboardReset,
        subscribeToLeaderboardUpdate,
        subscribeToQuestionsUpdate,
        sendGameEnter,
        sendGameLeave,
        getActiveGameCount,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}
