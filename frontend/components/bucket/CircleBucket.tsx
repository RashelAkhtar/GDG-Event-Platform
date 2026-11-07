'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { Wifi, WifiOff, RotateCcw } from 'lucide-react'

interface Bubble {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  targetRadius: number
  unevenFactor: number
  name: string
  avatar?: string
  color: string
  isUser?: boolean
  imageObj?: HTMLImageElement
  isDragging?: boolean
  squishX: number
  squishY: number
}

interface DragInfo {
  bubbleId: string
  pointerId: number
  targetX: number
  targetY: number
  history: { x: number; y: number; time: number }[]
}

const GOOGLE_COLORS = ['#4285F4', '#34A853', '#FBBC04', '#EA4335']

// Dynamic base radius scaling inversely with bubble count in the bucket
function getBaseRadiusForCount(count: number): number {
  if (count <= 1) return 44
  if (count <= 2) return 38
  if (count <= 4) return 32
  if (count <= 7) return 26
  if (count <= 12) return 22
  if (count <= 18) return 18
  if (count <= 26) return 15
  return 13
}

// Stable hash generating organic unevenness per user
function getUnevenFactor(id: string, isUser: boolean): number {
  if (isUser) return 1.15 // User's ball is slightly larger and easier to locate
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  const normalized = Math.abs(hash % 100) / 100
  // Uneven variation range between 0.82 and 1.20 (~38% organic difference)
  return 0.82 + normalized * 0.38
}

export function CircleBucket() {
  const { user } = useAuth()
  const { connected, currentSessionId, connectedSessions, reconnect, sendUserJoin, sendBubbleImpulse, subscribeToUserJoin } = useWebSocket()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const physicsRef = useRef<{ bubbles: Bubble[] }>({ bubbles: [] })
  const dragRef = useRef<DragInfo | null>(null)
  const animFrameIdRef = useRef<number | null>(null)

  const [activeTooltip, setActiveTooltip] = useState<{ name: string; x: number; y: number } | null>(null)
  const [liveArrivalToast, setLiveArrivalToast] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  // Drop a bubble into physics arena with dynamic initial sizing & plunge inside bucket
  const dropBubble = useCallback((name: string, avatar?: string, isUser = false, customId?: string) => {
    const canvas = canvasRef.current
    const width = canvas ? canvas.width : 340
    const height = canvas ? canvas.height : 340
    const cx = width / 2
    const cy = height / 2
    const bucketRadius = width / 2 - 12
    const color = GOOGLE_COLORS[Math.floor(Math.random() * GOOGLE_COLORS.length)]
    const bubbleId = customId || `bubble-${name.replace(/\s+/g, '')}-${Date.now()}`

    // Check if bubble already exists
    const existing = physicsRef.current.bubbles.find((b) => b.id === bubbleId)
    if (existing) {
      if (existing.name !== name) existing.name = name;
      if (avatar && existing.avatar !== avatar) {
        existing.avatar = avatar
        const img = new Image()
        img.referrerPolicy = 'no-referrer'
        img.src = avatar
        existing.imageObj = img
      }
      return
    }

    const img = new Image()
    if (avatar) {
      img.referrerPolicy = 'no-referrer'
      img.src = avatar
    }

    const unevenFactor = getUnevenFactor(bubbleId, isUser)
    const baseRadius = getBaseRadiusForCount(physicsRef.current.bubbles.length + 1)
    const initialRadius = baseRadius * unevenFactor

    // Spawn safely inside the top interior of the circular bucket (never outside)
    const spawnY = cy - bucketRadius + initialRadius + 14
    const maxSpread = Math.max(10, (bucketRadius - initialRadius - 20) * 0.45)
    const spawnX = cx + (Math.random() - 0.5) * maxSpread * 2

    const newBubble: Bubble = {
      id: bubbleId,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2.8 + Math.random() * 1.5, // Gentle downward plunge inside bucket
      radius: initialRadius,
      targetRadius: initialRadius,
      unevenFactor,
      name,
      avatar,
      color: isUser ? '#1A73E8' : color,
      isUser,
      imageObj: avatar ? img : undefined,
      isDragging: false,
      squishX: 1,
      squishY: 1,
    }

    physicsRef.current.bubbles = [newBubble, ...physicsRef.current.bubbles]
    setTotalCount(physicsRef.current.bubbles.length)
  }, [])

  // Quick Action: Scatter balls inside the bucket
  const handleScatter = () => {
    physicsRef.current.bubbles = physicsRef.current.bubbles.map((b) => ({
      ...b,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      squishX: 0.85,
      squishY: 1.15,
    }));
    sendBubbleImpulse({ x: 0, y: 0 });
  }

  // Ensure current user / device session is registered
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && /mobile|iphone|android|ipad/i.test(navigator.userAgent)
    const deviceType = isMobile ? 'mobile' : 'desktop'

    const isAdminUser = Boolean(
      user &&
      (user.role === 'ADMIN' ||
       user.name?.toLowerCase().includes('admin') ||
       user.email?.toLowerCase().includes('admin') ||
       user.email === 'aryan.crores@gmail.com')
    )

    if (user) {
      // Exclude GDG Admin from entering the physics bucket simulation
      if (!isAdminUser) {
        dropBubble(user.name + ' (You)', user.avatar, true, `session-${currentSessionId}`)
      }
      sendUserJoin({
        sessionId: currentSessionId,
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        device: deviceType,
      })
    } else {
      const guestName = `Guest (${currentSessionId.slice(-4)})`
      const guestAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentSessionId}`
      dropBubble(`${guestName} (You)`, guestAvatar, true, `session-${currentSessionId}`)
      sendUserJoin({
        sessionId: currentSessionId,
        name: guestName,
        avatar: guestAvatar,
        role: 'GUEST',
        device: deviceType,
      })
    }
  }, [user, currentSessionId, dropBubble, sendUserJoin])

  useEffect(() => {
    const unsub = subscribeToUserJoin((session) => {
      if (session.sessionId !== currentSessionId) {
        // Suppress toast for GDG Admin joins
        const isRemoteAdmin =
          session.role === 'ADMIN' ||
          session.name?.toLowerCase().includes('admin') ||
          session.userId === 'admin_master_aryan'
        if (isRemoteAdmin) return

        setLiveArrivalToast(`${session.name} joined the arena!`)
        const timer = setTimeout(() => setLiveArrivalToast(null), 3500)
        return () => clearTimeout(timer)
      }
    })
    return () => unsub()
  }, [subscribeToUserJoin, currentSessionId])

  // Synchronize remote participant sessions directly into the physics bucket
  useEffect(() => {
    connectedSessions.forEach((sess) => {
      const isCurrentSession = sess.sessionId === currentSessionId
      if (isCurrentSession) return // Self bubble already handled

      // Exclude GDG Admin sessions from appearing as bubbles in CircleBucket
      const isRemoteAdmin =
        sess.role === 'ADMIN' ||
        sess.name?.toLowerCase().includes('admin') ||
        sess.userId === 'admin_master_aryan'
      if (isRemoteAdmin) return

      // Label with secondary device if same user logged in on another device!
      let displayName = sess.name
      if (user && sess.userId === user._id) {
        displayName = `${sess.name} (${sess.device === 'mobile' ? 'Mobile' : '2nd Device'})`
      } else if (sess.device === 'mobile' && !sess.name.includes('Mobile')) {
        displayName = `${sess.name} (Mobile)`
      }

      dropBubble(displayName, sess.avatar, false, `session-${sess.sessionId}`)
    })

    // Remove any remote bubbles that have disconnected
    const activeSessionIds = new Set(connectedSessions.map((s) => `session-${s.sessionId}`))
    activeSessionIds.add(`session-${currentSessionId}`)

    physicsRef.current.bubbles = physicsRef.current.bubbles.filter((b) => {
      return b.id === `session-${currentSessionId}` || activeSessionIds.has(b.id)
    })

    setTotalCount(physicsRef.current.bubbles.length)
  }, [connectedSessions, currentSessionId, user, dropBubble])

  // Interactive Drag & Throw Event Handlers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, domX: 0, domY: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      domX: e.clientX - rect.left,
      domY: e.clientY - rect.top,
    }
  }

  const findBubbleAt = (x: number, y: number): Bubble | null => {
    const bubbles = physicsRef.current.bubbles
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]
      const dx = x - b.x
      const dy = y - b.y
      if (Math.sqrt(dx * dx + dy * dy) <= b.radius * 1.3) {
        return b
      }
    }
    return null
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e)
    const b = findBubbleAt(coords.x, coords.y)
    if (b) {
      try {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      } catch {}

      const now = performance.now()
      dragRef.current = {
        bubbleId: b.id,
        pointerId: e.pointerId,
        targetX: coords.x,
        targetY: coords.y,
        history: [{ x: coords.x, y: coords.y, time: now }],
      }
      b.isDragging = true
      b.squishX = 1.15
      b.squishY = 0.88

      setActiveTooltip({
        name: b.name,
        x: coords.domX,
        y: coords.domY,
      })

      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing'
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e)
    const drag = dragRef.current

    if (drag && drag.pointerId === e.pointerId) {
      const canvas = canvasRef.current
      const width = canvas ? canvas.width : 340
      const height = canvas ? canvas.height : 340
      const cx = width / 2
      const cy = height / 2
      const bucketRadius = width / 2 - 12
      const b = physicsRef.current.bubbles.find((item) => item.id === drag.bubbleId)
      const bRadius = b ? b.radius : 20

      // Strictly clamp drag position inside circular bucket boundary
      const dx = coords.x - cx
      const dy = coords.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.max(1, bucketRadius - bRadius - 2)

      let clampedX = coords.x
      let clampedY = coords.y
      if (dist > maxDist && dist > 0) {
        clampedX = cx + (dx / dist) * maxDist
        clampedY = cy + (dy / dist) * maxDist
      }

      const now = performance.now()
      drag.targetX = clampedX
      drag.targetY = clampedY
      drag.history.push({ x: clampedX, y: clampedY, time: now })
      if (drag.history.length > 8) {
        drag.history.shift()
      }

      // Strictly clamp DOM coordinates for tooltip within container
      const rect = canvas ? canvas.getBoundingClientRect() : null
      const domWidth = rect ? rect.width : 340
      const domHeight = rect ? rect.height : 340
      const domCx = domWidth / 2
      const domCy = domHeight / 2
      const domMaxDist = domWidth / 2 - 25
      const domDx = coords.domX - domCx
      const domDy = coords.domY - domCy
      const domDist = Math.sqrt(domDx * domDx + domDy * domDy)
      let clampedDomX = coords.domX
      let clampedDomY = coords.domY
      if (domDist > domMaxDist && domDist > 0) {
        clampedDomX = domCx + (domDx / domDist) * domMaxDist
        clampedDomY = domCy + (domDy / domDist) * domMaxDist
      }

      const draggedBubble = physicsRef.current.bubbles.find((bubble) => bubble.id === drag.bubbleId)
      if (draggedBubble) {
        setActiveTooltip({
          name: draggedBubble.name,
          x: clampedDomX,
          y: clampedDomY,
        })
      }
    } else {
      // Hover feedback
      const canvas = canvasRef.current
      if (canvas) {
        const hoverB = findBubbleAt(coords.x, coords.y)
        canvas.style.cursor = hoverB ? 'grab' : 'default'
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag && drag.pointerId === e.pointerId) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}

      const b = physicsRef.current.bubbles.find((item) => item.id === drag.bubbleId)
      if (b) {
        b.isDragging = false

        // Calculate throw momentum velocity from recent drag movements
        if (drag.history.length >= 2) {
          const first = drag.history[0]
          const last = drag.history[drag.history.length - 1]
          const dt = Math.max(16, last.time - first.time)
          const vx = ((last.x - first.x) / dt) * 16
          const vy = ((last.y - first.y) / dt) * 16

          // Clamp max fling velocity
          const maxFling = 16
          b.vx = Math.max(-maxFling, Math.min(maxFling, vx * 1.25))
          b.vy = Math.max(-maxFling, Math.min(maxFling, vy * 1.25))
        }
      }

      dragRef.current = null
      setActiveTooltip(null)

      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default'
      }
    }
  }

  // Physics simulation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const bucketRadius = width / 2 - 12

    const GRAVITY = 0.28
    const DAMPING = 0.72
    const FRICTION = 0.985

    const render = () => {
      // Clear canvas with crisp transparent layer
      ctx.clearRect(0, 0, width, height)

      // Draw Circular Glass Bucket Container
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, bucketRadius, 0, Math.PI * 2)

      // Subdued ambient bucket background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, bucketRadius)
      bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
      bgGrad.addColorStop(0.85, 'rgba(248, 249, 250, 0.90)')
      bgGrad.addColorStop(1, 'rgba(232, 234, 237, 0.85)')
      ctx.fillStyle = bgGrad
      ctx.fill()

      // Glass rim border - razor-thin crisp editorial boundary
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#E5E7EB'
      ctx.stroke()
      ctx.restore()

      const bubbles = physicsRef.current.bubbles
      const drag = dragRef.current

      // Empty State when bucket is completely empty
      if (bubbles.length === 0) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, 38, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(66, 133, 244, 0.22)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        ctx.stroke()

        ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillStyle = '#5F6368'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Drop in to connect', cx, cy - 6)

        ctx.font = '400 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillStyle = '#80868B'
        ctx.fillText('Live profile arena', cx, cy + 12)
        ctx.restore()
      }

      // Dynamic Rescaling based on bubble count
      const baseRadius = getBaseRadiusForCount(bubbles.length)
      for (const b of bubbles) {
        b.targetRadius = baseRadius * b.unevenFactor
        b.radius += (b.targetRadius - b.radius) * 0.08
        b.squishX += (1 - b.squishX) * 0.12
        b.squishY += (1 - b.squishY) * 0.12
      }

      // Physics Integration: Gravity, Velocity & Drag
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]

        if (b.isDragging && drag && drag.bubbleId === b.id) {
          b.vx = (drag.targetX - b.x) * 0.4
          b.vy = (drag.targetY - b.y) * 0.4
          b.x = drag.targetX
          b.y = drag.targetY
        } else {
          b.vy += GRAVITY
          b.vx *= FRICTION
          b.vy *= FRICTION
          b.x += b.vx
          b.y += b.vy
        }

        // Circular Boundary Collision with Floor/Wall Response
        const dx = b.x - cx
        const dy = b.y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = bucketRadius - b.radius

        if (dist > maxDist && dist > 0) {
          const nx = dx / dist
          const ny = dy / dist

          b.x = cx + nx * maxDist
          b.y = cy + ny * maxDist

          const dot = b.vx * nx + b.vy * ny
          if (dot > 0) {
            b.vx = (b.vx - 2 * dot * nx) * DAMPING
            b.vy = (b.vy - 2 * dot * ny) * DAMPING

            const impactSpeed = Math.abs(dot)
            if (impactSpeed > 1.2) {
              b.squishX = Math.max(0.75, 1 - impactSpeed * 0.04)
              b.squishY = Math.min(1.35, 1 + impactSpeed * 0.04)
            }
          }
        }
      }

      // Ball-to-Ball Elastic Collisions
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const b1 = bubbles[i]
          const b2 = bubbles[j]

          const dx = b2.x - b1.x
          const dy = b2.y - b1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = b1.radius + b2.radius

          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2
            const nx = dx / dist
            const ny = dy / dist

            if (!b1.isDragging) {
              b1.x -= nx * overlap
              b1.y -= ny * overlap
            }
            if (!b2.isDragging) {
              b2.x += nx * overlap
              b2.y += ny * overlap
            }

            const kx = b1.vx - b2.vx
            const ky = b1.vy - b2.vy
            const p = 2 * (nx * kx + ny * ky) / 2

            if (p > 0) {
              if (!b1.isDragging) {
                b1.vx -= p * nx * DAMPING
                b1.vy -= p * ny * DAMPING
              }
              if (!b2.isDragging) {
                b2.vx += p * nx * DAMPING
                b2.vy += p * ny * DAMPING
              }
            }
          }
        }
      }

      // Render All Bubbles with Circular Clipping
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, bucketRadius, 0, Math.PI * 2)
      ctx.clip()

      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]

        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.scale(b.squishX, b.squishY)

        // Drop shadow for tactile 3D ball sensation
        ctx.save()
        ctx.beginPath()
        ctx.arc(1.5, 3.5, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(32, 33, 36, 0.12)'
        ctx.fill()
        ctx.restore()

        // Ball body fill
        ctx.beginPath()
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = b.color
        ctx.fill()

        // 3D Spherical Specular Highlight
        const specGrad = ctx.createRadialGradient(
          -b.radius * 0.35,
          -b.radius * 0.35,
          1,
          0,
          0,
          b.radius
        )
        specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
        specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)')
        specGrad.addColorStop(1, 'rgba(0, 0, 0, 0.18)')
        ctx.fillStyle = specGrad
        ctx.fill()

        // Avatar Image or Clean Initials Fallback
        if (b.avatar && b.imageObj && b.imageObj.complete && b.imageObj.naturalWidth > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(0, 0, b.radius - 2.5, 0, Math.PI * 2)
          ctx.clip()
          try {
            ctx.drawImage(
              b.imageObj,
              -b.radius + 2.5,
              -b.radius + 2.5,
              (b.radius - 2.5) * 2,
              (b.radius - 2.5) * 2
            )
          } catch {}
          ctx.restore()
        } else {
          // Initials badge
          const initials = b.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
          ctx.font = `bold ${Math.max(10, Math.floor(b.radius * 0.72))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          ctx.fillStyle = '#FFFFFF'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(initials, 0, 0.5)
        }

        // Distinctive User Glowing Ring if it's the current user
        if (b.isUser) {
          ctx.beginPath()
          ctx.arc(0, 0, b.radius + 2.5, 0, Math.PI * 2)
          ctx.lineWidth = 2.5
          ctx.strokeStyle = '#1A73E8'
          ctx.stroke()

          // Active indicator dot on current user's ball
          ctx.beginPath()
          ctx.arc(b.radius - 4, -b.radius + 4, 4.5, 0, Math.PI * 2)
          ctx.fillStyle = '#34A853'
          ctx.fill()
          ctx.lineWidth = 1.5
          ctx.strokeStyle = '#FFFFFF'
          ctx.stroke()
        }

        ctx.restore()
      }
      ctx.restore()

      animFrameIdRef.current = requestAnimationFrame(render)
    }

    animFrameIdRef.current = requestAnimationFrame(render)

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [])

  return (
    <div className="relative flex flex-col items-center select-none touch-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Minimalist Editorial Status & Counter Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3.5 max-w-full px-2">
        {/* Active Count Pill */}
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 font-mono text-[10px] tracking-[0.2em] uppercase text-[#111827] border border-[#E5E7EB] select-none pointer-events-none">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              totalCount > 0 ? 'bg-[#34A853]' : 'bg-[#9CA3AF]'
            }`}
          />
          <span>{totalCount > 0 ? `${totalCount} In Arena` : 'Arena Standby'}</span>
        </span>

        {/* Scatter fling button */}
        {totalCount > 1 && (
          <button
            onClick={handleScatter}
            title="Disperse bubbles"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:border-[#111827] transition-all cursor-pointer"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        )}

        {/* Socket Connection Status */}
        <button
          type="button"
          onClick={reconnect}
          title={connected ? 'Realtime Connected' : 'Disconnected. Click to Reconnect'}
          className={`inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 font-mono text-[10px] tracking-wider uppercase transition-all cursor-pointer ${
            connected ? 'text-[#34A853] hover:border-[#34A853]' : 'text-[#EA4335] hover:border-[#EA4335]'
          }`}
        >
          {connected ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#34A853] animate-pulse" />
              <span>Live Sync</span>
            </>
          ) : (
            <>
              <WifiOff className="h-2.5 w-2.5 text-[#EA4335]" />
              <span>Reconnect</span>
            </>
          )}
        </button>
      </div>

      {/* Live Arrival Notification Toast */}
      {liveArrivalToast && (
        <div className="mb-2.5 animate-in fade-in slide-in-from-top-1 duration-200 rounded-full bg-[#111827] px-3.5 py-1 font-mono text-[10px] tracking-wider uppercase text-white shadow-sm">
          {liveArrivalToast} joined
        </div>
      )}

      {/* Pristine Circular Vessel */}
      <div
        ref={containerRef}
        className="relative mx-auto aspect-square w-full max-w-[280px] xs:max-w-[300px] sm:max-w-[320px] select-none touch-none rounded-full border border-[#E5E7EB] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="relative h-full w-full rounded-full overflow-hidden bg-[#FAFAFA]">
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="h-full w-full touch-none select-none"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none' }}
          />
        </div>

        {/* Minimalist Floating Tooltip */}
        {activeTooltip && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-8 rounded-full bg-[#111827] px-3 py-1 font-mono text-[10px] tracking-wider uppercase text-white shadow-lg transition-all animate-in zoom-in-95"
            style={{
              left: `${Math.max(40, Math.min(280, activeTooltip.x))}px`,
              top: `${Math.max(24, Math.min(290, activeTooltip.y))}px`,
            }}
          >
            {activeTooltip.name}
          </div>
        )}
      </div>
    </div>
  )
}
