'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { LeaderboardEntry, CeremonyWinner } from '@/lib/api'

export interface JoinedUser {
  id: string
  name: string
  avatar?: string
  role?: string
  joinedAt?: number
}

export interface CeremonyData {
  gameSlug: string
  gameTitle: string
  winners: CeremonyWinner[]
  fullLeaderboard: LeaderboardEntry[]
}

interface WebSocketContextType {
  connected: boolean
  activeCountdown: { gameSlug: string; count: number } | null
  activeCeremony: CeremonyData | null
  gameLockStates: Record<string, { isLocked: boolean; status: string }>
  sendUserJoin: (user: JoinedUser) => void
  sendLockToggle: (gameSlug: string, isLocked: boolean, status: string) => void
  sendCountdownStart: (gameSlug: string) => void
  sendWinnerCeremonyStart: (ceremonyData: CeremonyData) => void
  sendLeaderboardReset: (gameSlug: string) => void
  closeCeremony: () => void
  reconnect: () => void
  subscribeToUserJoin: (callback: (user: JoinedUser) => void) => () => void
  subscribeToUserLeave: (callback: (userId: string) => void) => () => void
  subscribeToLeaderboardReset: (callback: (gameSlug: string) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  activeCountdown: null,
  activeCeremony: null,
  gameLockStates: {},
  sendUserJoin: () => {},
  sendLockToggle: () => {},
  sendCountdownStart: () => {},
  sendWinnerCeremonyStart: () => {},
  sendLeaderboardReset: () => {},
  closeCeremony: () => {},
  reconnect: () => {},
  subscribeToUserJoin: () => () => {},
  subscribeToUserLeave: () => () => {},
  subscribeToLeaderboardReset: () => () => {},
})

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.hostname}:5000/ws`
  }
  return 'ws://localhost:5000/ws'
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [activeCountdown, setActiveCountdown] = useState<{ gameSlug: string; count: number } | null>(null)
  const [activeCeremony, setActiveCeremony] = useState<CeremonyData | null>(null)
  const [gameLockStates, setGameLockStates] = useState<Record<string, { isLocked: boolean; status: string }>>({
    'web-dev-quiz': { isLocked: false, status: 'LIVE' },
    'mentis-quiz': { isLocked: true, status: 'UPCOMING' },
    'wend-game': { isLocked: false, status: 'LIVE' },
  })

  const wsRef = useRef<WebSocket | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const userJoinSubscribersRef = useRef<Set<(user: JoinedUser) => void>>(new Set())
  const userLeaveSubscribersRef = useRef<Set<(userId: string) => void>>(new Set())
  const leaderboardResetSubscribersRef = useRef<Set<(gameSlug: string) => void>>(new Set())
  const connectFnRef = useRef<(() => void) | null>(null)

  // Trigger user join listeners
  const notifyUserJoined = useCallback((user: JoinedUser) => {
    userJoinSubscribersRef.current.forEach((cb) => {
      try {
        cb(user)
      } catch (err) {
        console.error('Error in user join listener:', err)
      }
    })
  }, [])

  // Trigger user leave listeners
  const notifyUserLeft = useCallback((userId: string) => {
    userLeaveSubscribersRef.current.forEach((cb) => {
      try {
        cb(userId)
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

  // Process any incoming WS or BroadcastChannel message
  const handleIncomingMessage = useCallback(
    (message: { type: string; payload?: unknown }) => {
      const payload = message.payload as Record<string, unknown> | undefined
      if (!payload) return

      switch (message.type) {
        case 'USER_JOIN': {
          notifyUserJoined(payload as unknown as JoinedUser)
          break
        }
        case 'USER_LEAVE': {
          const userId = (payload as { id?: string })?.id
          if (userId) {
            notifyUserLeft(userId)
          }
          break
        }
        case 'GAME_LOCK_TOGGLE': {
          const gameSlug = payload.gameSlug as string | undefined
          if (gameSlug) {
            setGameLockStates((prev) => ({
              ...prev,
              [gameSlug]: {
                isLocked: Boolean(payload.isLocked),
                status: String(payload.status || 'UPCOMING'),
              },
            }))
          }
          break
        }
        case 'START_COUNTDOWN': {
          const gameSlug = payload.gameSlug as string | undefined
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
          const gameSlug = payload.gameSlug as string | undefined
          if (gameSlug) {
            notifyLeaderboardReset(gameSlug)
          }
          break
        }
        case 'SYNC_STATE': {
          if (payload.gameStates) {
            setGameLockStates(payload.gameStates as Record<string, { isLocked: boolean; status: string }>)
          }
          if (Array.isArray(payload.users)) {
            payload.users.forEach((u: JoinedUser) => {
              if (u) {
                notifyUserJoined(u)
              }
            })
          }
          break
        }
        default:
          break
      }
    },
    [notifyUserJoined, notifyUserLeft, notifyLeaderboardReset, runCountdown]
  )

  const handleIncomingMessageRef = useRef(handleIncomingMessage)
  useEffect(() => {
    handleIncomingMessageRef.current = handleIncomingMessage
  })

  // Initialize WebSocket & cross-tab BroadcastChannel
  useEffect(() => {
    let isMounted = true

    // 1. Cross-tab BroadcastChannel (works even offline or across tabs)
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
          if (!isMounted) {
            socket?.close()
            return
          }
          setConnected(true)
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
            reconnectTimeout = setTimeout(connectWs, 3000)
          }
        }

        socket.onerror = () => {
          // Non-fatal error; onclose will handle reconnection
        }
      } catch {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWs, 3000)
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

  // Dispatch message via WebSocket and BroadcastChannel
  const broadcastMessage = useCallback((msg: { type: string; payload?: unknown }) => {
    // Send to WebSocket server if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
    // Also send through BroadcastChannel for immediate multi-tab sync
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(msg)
    }
  }, [])

  const sendUserJoin = useCallback(
    (user: JoinedUser) => {
      broadcastMessage({ type: 'USER_JOIN', payload: user })
      notifyUserJoined(user)
    },
    [broadcastMessage, notifyUserJoined]
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
      notifyLeaderboardReset(gameSlug)
      broadcastMessage({
        type: 'RESET_GAME_LEADERBOARD',
        payload: { gameSlug },
      })
    },
    [broadcastMessage, notifyLeaderboardReset]
  )

  const closeCeremony = useCallback(() => {
    setActiveCeremony(null)
  }, [])

  const subscribeToUserJoin = useCallback((cb: (user: JoinedUser) => void) => {
    userJoinSubscribersRef.current.add(cb)
    return () => {
      userJoinSubscribersRef.current.delete(cb)
    }
  }, [])

  const subscribeToUserLeave = useCallback((cb: (userId: string) => void) => {
    userLeaveSubscribersRef.current.add(cb)
    return () => {
      userLeaveSubscribersRef.current.delete(cb)
    }
  }, [])

  const subscribeToLeaderboardReset = useCallback((cb: (gameSlug: string) => void) => {
    leaderboardResetSubscribersRef.current.add(cb)
    return () => {
      leaderboardResetSubscribersRef.current.delete(cb)
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        activeCountdown,
        activeCeremony,
        gameLockStates,
        sendUserJoin,
        sendLockToggle,
        sendCountdownStart,
        sendWinnerCeremonyStart,
        sendLeaderboardReset,
        closeCeremony,
        reconnect,
        subscribeToUserJoin,
        subscribeToUserLeave,
        subscribeToLeaderboardReset,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}
