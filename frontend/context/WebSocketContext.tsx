'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { LeaderboardEntry, CeremonyWinner } from '@/lib/api'

export interface ConnectedSession {
  sessionId: string
  userId?: string
  name: string
  avatar?: string
  role?: string
  device?: 'mobile' | 'desktop' | 'tablet'
  joinedAt?: number
}

// Backward-compatible alias
export type JoinedUser = ConnectedSession

export interface CeremonyData {
  gameSlug: string
  gameTitle: string
  winners: CeremonyWinner[]
  fullLeaderboard: LeaderboardEntry[]
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
  sendBubbleImpulse: (impulse: { x: number; y: number; senderSessionId?: string }) => void
  closeCeremony: () => void
  reconnect: () => void
  subscribeToUserJoin: (callback: (session: ConnectedSession) => void) => () => void
  subscribeToUserLeave: (callback: (sessionId: string) => void) => () => void
  subscribeToLeaderboardReset: (callback: (gameSlug: string) => void) => () => void
  subscribeToLeaderboardUpdate: (callback: (gameSlug: string, leaderboard: LeaderboardEntry[]) => void) => () => void
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
  sendBubbleImpulse: () => {},
  closeCeremony: () => {},
  reconnect: () => {},
  subscribeToUserJoin: () => () => {},
  subscribeToUserLeave: () => () => {},
  subscribeToLeaderboardReset: () => () => {},
  subscribeToLeaderboardUpdate: () => () => {},
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
  const [activeCountdown, setActiveCountdown] = useState<{ gameSlug: string; count: number } | null>(null)
  const [activeCeremony, setActiveCeremony] = useState<CeremonyData | null>(null)
  const [gameLockStates, setGameLockStates] = useState<Record<string, { isLocked: boolean; status: string }>>({
    'web-dev-quiz': { isLocked: false, status: 'LIVE' },
    'mentis-quiz': { isLocked: true, status: 'UPCOMING' },
    'wend-game': { isLocked: false, status: 'LIVE' },
  })
  const [liveLeaderboards, setLiveLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({})

  const wsRef = useRef<WebSocket | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const userJoinSubscribersRef = useRef<Set<(session: ConnectedSession) => void>>(new Set())
  const userLeaveSubscribersRef = useRef<Set<(sessionId: string) => void>>(new Set())
  const leaderboardResetSubscribersRef = useRef<Set<(gameSlug: string) => void>>(new Set())
  const leaderboardUpdateSubscribersRef = useRef<Set<(gameSlug: string, leaderboard: LeaderboardEntry[]) => void>>(new Set())
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
          const rawSession = payload as { sessionId?: string; id?: string; userId?: string; name?: string; avatar?: string; role?: string; device?: 'mobile' | 'desktop' | 'tablet'; joinedAt?: number } | undefined
          const sid = rawSession?.sessionId || rawSession?.id
          if (rawSession && sid) {
            const normalized: ConnectedSession = {
              sessionId: sid,
              userId: rawSession.userId,
              name: rawSession.name || 'Participant',
              avatar: rawSession.avatar,
              role: rawSession.role,
              device: rawSession.device,
              joinedAt: rawSession.joinedAt,
            }
            setConnectedSessions((prev) => {
              const filtered = prev.filter((s) => s.sessionId !== sid)
              return [...filtered, normalized]
            })
            notifyUserJoined(normalized)
          }
          break
        }
        case 'USER_LEAVE': {
          const sid = (payload as { sessionId?: string; id?: string })?.sessionId || (payload as { id?: string })?.id
          if (sid) {
            setConnectedSessions((prev) => prev.filter((s) => s.sessionId !== sid))
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
            setGameLockStates((prev) => ({
              ...prev,
              [gameSlug]: {
                isLocked: Boolean(payload?.isLocked),
                status: String(payload?.status || 'UPCOMING'),
              },
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
          setActiveCeremony(payload as unknown as CeremonyData)
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
          if (payload?.gameStates) {
            setGameLockStates(payload.gameStates as Record<string, { isLocked: boolean; status: string }>)
          }
          if (Array.isArray(payload?.sessions)) {
            const sessionsList = payload.sessions as ConnectedSession[]
            setConnectedSessions(sessionsList)
            sessionsList.forEach((s) => notifyUserJoined(s))
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
            mapped.forEach((s) => notifyUserJoined(s))
          }
          if (payload?.leaderboards && typeof payload.leaderboards === 'object') {
            setLiveLeaderboards(payload.leaderboards as Record<string, LeaderboardEntry[]>)
          }
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
      const fullSession: ConnectedSession = {
        sessionId: userPayload.sessionId || currentSessionId,
        userId: userPayload.userId,
        name: userPayload.name || 'Participant',
        avatar: userPayload.avatar,
        role: userPayload.role || 'PARTICIPANT',
        device: userPayload.device || detectDeviceType(),
        joinedAt: Date.now(),
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

  const sendLockToggle = useCallback(
    (gameSlug: string, isLocked: boolean, status: string) => {
      setGameLockStates((prev) => ({
        ...prev,
        [gameSlug]: { isLocked, status },
      }))
      broadcastMessage({
        type: 'GAME_LOCK_TOGGLE',
        payload: { gameSlug, isLocked, status },
      })
    },
    [broadcastMessage]
  )

  const sendCountdownStart = useCallback(
    (gameSlug: string) => {
      broadcastMessage({
        type: 'START_COUNTDOWN',
        payload: { gameSlug },
      })
      runCountdown(gameSlug)
    },
    [broadcastMessage, runCountdown]
  )

  const sendWinnerCeremonyStart = useCallback(
    (ceremonyData: CeremonyData) => {
      setActiveCeremony(ceremonyData)
      broadcastMessage({
        type: 'START_WINNER_CEREMONY',
        payload: ceremonyData,
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

  const sendBubbleImpulse = useCallback(
    (impulse: { x: number; y: number; senderSessionId?: string }) => {
      broadcastMessage({
        type: 'BUBBLE_IMPULSE',
        payload: { ...impulse, senderSessionId: currentSessionId },
      })
    },
    [broadcastMessage, currentSessionId]
  )

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
        sendBubbleImpulse,
        closeCeremony,
        reconnect,
        subscribeToUserJoin,
        subscribeToUserLeave,
        subscribeToLeaderboardReset,
        subscribeToLeaderboardUpdate,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}
