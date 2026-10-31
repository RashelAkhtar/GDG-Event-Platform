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

function isUserAdmin(name?: string, id?: string, role?: string, email?: string): boolean {
  if (role === 'ADMIN') return true
  const str = `${name || ''} ${id || ''} ${email || ''}`.toLowerCase()
  return str.includes('admin') || str.includes('aryan.crores@gmail.com')
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
  const { connected, sendUserJoin, subscribeToUserJoin, subscribeToUserLeave } = useWebSocket()
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
    // Strictly guard: never drop admin into the participant bucket
    if (isUserAdmin(name, customId)) return

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

    physicsRef.current.bubbles = [
      newBubble,
      ...physicsRef.current.bubbles.filter((b) => !isUserAdmin(b.name, b.id)),
    ]
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
    }))
  }

  // Broadcast current authenticated participant via WebSocket (strictly exclude admin)
  useEffect(() => {
    // Clean any admin bubbles from memory immediately
    physicsRef.current.bubbles = physicsRef.current.bubbles.filter((b) => !isUserAdmin(b.name, b.id))

    const isAdmin = isUserAdmin(user?.name, user?._id, user?.role, user?.email)

    if (user && !isAdmin) {
      dropBubble(user.name + ' (You)', user.avatar, true, `user-${user._id}`)
      sendUserJoin({
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      })
    } else {
      // If logged out or if logged in as Admin: do not show in participant bucket
      physicsRef.current.bubbles = physicsRef.current.bubbles.filter(
        (b) => !b.isUser && !isUserAdmin(b.name, b.id)
      )
    }
    setTotalCount(physicsRef.current.bubbles.length)
  }, [user, dropBubble, sendUserJoin])

  // Listen for real participants joining via WebSocket or BroadcastChannel
  useEffect(() => {
    const unsubscribeJoin = subscribeToUserJoin((newUser) => {
      // Strictly exclude admin profiles from participant bucket
      if (isUserAdmin(newUser.name, newUser.id, newUser.role)) return

      const isSelf = user && newUser.id === user._id
      if (!isSelf) {
        dropBubble(newUser.name, newUser.avatar, false, `user-${newUser.id}`)
        setLiveArrivalToast(`${newUser.name} dropped into the bucket!`)
        setTimeout(() => setLiveArrivalToast(null), 3000)
      }
    })

    const unsubscribeLeave = subscribeToUserLeave((leftUserId) => {
      physicsRef.current.bubbles = physicsRef.current.bubbles.filter(
        (b) => b.id !== `user-${leftUserId}` && !isUserAdmin(b.name, b.id)
      )
      setTotalCount(physicsRef.current.bubbles.length)
    })

    return () => {
      unsubscribeJoin()
      unsubscribeLeave()
    }
  }, [subscribeToUserJoin, subscribeToUserLeave, user, dropBubble])

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
    // Check in reverse order so top-drawn bubble is picked
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]
      if (isUserAdmin(b.name, b.id)) continue
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
    if (b && !isUserAdmin(b.name, b.id)) {
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
      if (draggedBubble && !isUserAdmin(draggedBubble.name, draggedBubble.id)) {
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
        const h = drag.history
        if (h.length >= 2) {
          const oldest = h[0]
          const newest = h[h.length - 1]
          const dt = Math.max(12, newest.time - oldest.time)
          // Compute velocity in pixels per frame (~60fps standard)
          const rawVx = ((newest.x - oldest.x) / dt) * 16.67
          const rawVy = ((newest.y - oldest.y) / dt) * 16.67

          // Responsive throw multiplier capped to prevent wall penetration
          const throwMultiplier = 1.3
          const maxVelocity = 16
          b.vx = Math.max(-maxVelocity, Math.min(maxVelocity, rawVx * throwMultiplier))
          b.vy = Math.max(-maxVelocity, Math.min(maxVelocity, rawVy * throwMultiplier))

          // Squish response to throw force
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
          if (speed > 5) {
            b.squishX = 0.8
            b.squishY = 1.25
          }
        }
      }

      dragRef.current = null
      setTimeout(() => setActiveTooltip(null), 1600)

      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab'
      }
    }
  }

  // Main Physics Simulation & Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      const cx = width / 2
      const cy = height / 2
      const bucketRadius = width / 2 - 12

      ctx.clearRect(0, 0, width, height)

      // 1. Draw Circular Glass Bucket Background
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, bucketRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()

      // Radial interior gradient
      const grad = ctx.createRadialGradient(cx, cy - 25, 25, cx, cy, bucketRadius)
      grad.addColorStop(0, '#FFFFFF')
      grad.addColorStop(0.8, '#F8F9FA')
      grad.addColorStop(1, '#ECEFF1')
      ctx.fillStyle = grad
      ctx.fill()

      // Frosted glass rim border
      ctx.lineWidth = 3
      ctx.strokeStyle = '#DADCE0'
      ctx.stroke()
      ctx.restore()

      // Strictly purge any admin bubbles immediately
      physicsRef.current.bubbles = physicsRef.current.bubbles.filter((b) => !isUserAdmin(b.name, b.id))
      const bubbles = physicsRef.current.bubbles
      const drag = dragRef.current

      // Aesthetic Minimal Empty State when bucket is completely empty
      if (bubbles.length === 0) {
        ctx.save()

        // 1. Orbital delicate dashed ring centered in bucket
        ctx.beginPath()
        ctx.arc(cx, cy, 38, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(66, 133, 244, 0.22)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])

        // 2. Translucent center orb with Google 4-color dots
        ctx.beginPath()
        ctx.arc(cx, cy, 20, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(232, 240, 254, 0.55)'
        ctx.fill()

        const dotColors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853']
        const dotOffsets = [
          { x: -6, y: -6 },
          { x: 6, y: -6 },
          { x: 6, y: 6 },
          { x: -6, y: 6 },
        ]
        dotOffsets.forEach((pos, idx) => {
          ctx.beginPath()
          ctx.arc(cx + pos.x, cy + pos.y, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = dotColors[idx]
          ctx.fill()
        })

        ctx.restore()
      }

      // Physics Constants
      const gravity = 0.19
      const damping = 0.982
      const wallBounce = 0.74 // Elastic wall bouncing
      const baseRadius = getBaseRadiusForCount(bubbles.length)

      // 2. Smooth Radius Scaling & Movement Update
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]

        // Smoothly adjust bubble radius towards target based on total population & uneven factor
        b.targetRadius = baseRadius * b.unevenFactor
        b.radius += (b.targetRadius - b.radius) * 0.07

        // Smooth restitution for squish/stretch
        b.squishX += (1 - b.squishX) * 0.14
        b.squishY += (1 - b.squishY) * 0.14

        // Maximum distance from center to bubble center inside bucket
        const maxDist = Math.max(1, bucketRadius - b.radius)

        // If bubble is being dragged, spring toward pointer position
        if (drag && drag.bubbleId === b.id) {
          b.x += (drag.targetX - b.x) * 0.75
          b.y += (drag.targetY - b.y) * 0.75
          b.vx = 0
          b.vy = 0

          // Strictly clamp dragged bubble inside bucket boundary
          const dragDx = b.x - cx
          const dragDy = b.y - cy
          const dragDist = Math.sqrt(dragDx * dragDx + dragDy * dragDy)
          if (dragDist > maxDist && dragDist > 0) {
            b.x = cx + (dragDx / dragDist) * maxDist
            b.y = cy + (dragDy / dragDist) * maxDist
          }
        } else {
          // Normal physics: apply gravity and velocity
          b.vy += gravity
          b.vx *= damping
          b.vy *= damping

          // Brownian gentle float
          b.vx += (Math.random() - 0.5) * 0.06
          b.vy += (Math.random() - 0.5) * 0.03

          // Velocity clamp to avoid physics tunneling through circle
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
          if (speed > 16) {
            b.vx = (b.vx / speed) * 16
            b.vy = (b.vy / speed) * 16
          }

          b.x += b.vx
          b.y += b.vy
        }

        // Absolute 360-degree Circular Bucket Containment & Bouncing (Balls NEVER leave the bucket)
        const dx = b.x - cx
        const dy = b.y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > maxDist && dist > 0) {
          const normalX = dx / dist
          const normalY = dy / dist

          // Clamp firmly inside bucket boundary
          b.x = cx + normalX * maxDist
          b.y = cy + normalY * maxDist

          const normalVelocity = b.vx * normalX + b.vy * normalY
          if (normalVelocity > 0) {
            b.vx -= (1 + wallBounce) * normalVelocity * normalX
            b.vy -= (1 + wallBounce) * normalVelocity * normalY

            // Dynamic squish on wall collision
            if (normalVelocity > 2.5) {
              b.squishX = 1.15
              b.squishY = 0.85
            }
          }
        }
      }

      // 3. Bubble-to-Bubble Elastic Collision Resolution
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const b1 = bubbles[i]
          const b2 = bubbles[j]

          const dx = b2.x - b1.x
          const dy = b2.y - b1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = b1.radius + b2.radius

          if (dist < minDist && dist > 0.001) {
            const overlap = (minDist - dist) * 0.5
            const nx = dx / dist
            const ny = dy / dist

            // Separate overlapping balls
            if (!b1.isDragging && !b2.isDragging) {
              b1.x -= nx * overlap
              b1.y -= ny * overlap
              b2.x += nx * overlap
              b2.y += ny * overlap
            } else if (b1.isDragging) {
              b2.x += nx * overlap * 2
              b2.y += ny * overlap * 2
            } else if (b2.isDragging) {
              b1.x -= nx * overlap * 2
              b1.y -= ny * overlap * 2
            }

            // Elastic velocity transfer (ball-pit scatter)
            const kx = b1.vx - b2.vx
            const ky = b1.vy - b2.vy
            const p = nx * kx + ny * ky

            if (p > 0) {
              const impulse = p * 0.82
              b1.vx -= impulse * nx
              b1.vy -= impulse * ny
              b2.vx += impulse * nx
              b2.vy += impulse * ny
            }
          }
        }
      }

      // 4. Render All Bubbles with Specular Reflection & Tactile Highlights (Clipped inside circular bucket)
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, bucketRadius, 0, Math.PI * 2)
      ctx.clip()

      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        if (isUserAdmin(b.name, b.id)) continue

        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.scale(b.squishX, b.squishY)

        // Drop shadow for tactile 3D ball sensation
        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2)
        ctx.shadowColor = b.isDragging ? 'rgba(26, 115, 232, 0.4)' : 'rgba(60, 64, 67, 0.18)'
        ctx.shadowBlur = b.isDragging ? 12 : 6
        ctx.shadowOffsetY = b.isDragging ? 4 : 2
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.restore()

        // Clip avatar within circular profile ball
        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, b.radius - 2, 0, Math.PI * 2)
        ctx.clip()

        if (b.imageObj && b.imageObj.complete && b.imageObj.naturalWidth !== 0) {
          ctx.drawImage(
            b.imageObj,
            -b.radius + 2,
            -b.radius + 2,
            (b.radius - 2) * 2,
            (b.radius - 2) * 2
          )
        } else {
          const bgGrad = ctx.createLinearGradient(-b.radius, -b.radius, b.radius, b.radius)
          if (b.isUser) {
            bgGrad.addColorStop(0, '#4285F4')
            bgGrad.addColorStop(1, '#1A73E8')
          } else {
            bgGrad.addColorStop(0, b.color)
            bgGrad.addColorStop(1, b.color)
          }
          ctx.fillStyle = bgGrad
          ctx.fillRect(-b.radius, -b.radius, b.radius * 2, b.radius * 2)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = `bold ${Math.max(10, Math.round(b.radius * 0.72))}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(b.name.charAt(0).toUpperCase(), 0, 1)
        }
        ctx.restore()

        // Border ring
        ctx.beginPath()
        ctx.arc(0, 0, b.radius - 1, 0, Math.PI * 2)
        ctx.lineWidth = b.isUser ? 3 : 2
        ctx.strokeStyle = b.isUser ? '#1A73E8' : b.color
        ctx.stroke()

        // 3D Glass Specular Crescent Reflection
        ctx.beginPath()
        ctx.ellipse(-b.radius * 0.28, -b.radius * 0.32, b.radius * 0.36, b.radius * 0.18, -Math.PI / 4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.fill()

        // Dragging halo indicator
        if (b.isDragging) {
          ctx.beginPath()
          ctx.arc(0, 0, b.radius + 4, 0, Math.PI * 2)
          ctx.lineWidth = 2
          ctx.strokeStyle = '#1A73E8'
          ctx.setLineDash([4, 3])
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Green Online Status Badge for Authenticated User
        if (b.isUser) {
          ctx.beginPath()
          ctx.arc(0, 0, b.radius + 3, 0, Math.PI * 2)
          ctx.lineWidth = 1.5
          ctx.strokeStyle = 'rgba(26, 115, 232, 0.45)'
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(b.radius - 5, -b.radius + 5, 5, 0, Math.PI * 2)
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
    <div className="relative flex flex-col items-center">
      {/* Bucket Heading & Counter Pill */}
      <div className="flex items-center gap-2 mb-3">
        {/* Active Count Pill */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-[#3C4043] border border-[#DADCE0] shadow-2xs">
          <span
            className={`h-2 w-2 rounded-full ${
              totalCount > 0 ? 'bg-[#34A853] animate-pulse' : 'bg-[#9AA0A6]'
            }`}
          />
          <span>{totalCount > 0 ? `${totalCount} Active in Bucket` : 'Bucket Empty'}</span>
        </span>

        {/* Scatter fling button */}
        {totalCount > 1 && (
          <button
            onClick={handleScatter}
            title="Scatter balls with explosive fling"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-[#5F6368] shadow-2xs hover:bg-[#F8F9FA] active:scale-95 transition-all"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}

        {/* WebSocket Realtime Indicator */}
        <span
          title={connected ? 'WebSocket connected' : 'Local sync mode'}
          className={`flex h-7 w-7 items-center justify-center rounded-full border border-[#DADCE0] bg-white transition-colors ${
            connected ? 'text-[#34A853]' : 'text-[#80868B]'
          }`}
        >
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        </span>
      </div>

      {/* Live Arrival Notification Toast */}
      {liveArrivalToast && (
        <div className="mb-2 animate-in slide-in-from-top-2 duration-300 rounded-full bg-[#E6F4EA] border border-[#34A853]/40 px-3.5 py-1 text-xs font-medium text-[#137333] shadow-xs">
          ✨ {liveArrivalToast}
        </div>
      )}

      {/* Circular Bucket Visual Container with Ambient Google Glow */}
      <div
        ref={containerRef}
        className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[340px]"
      >
        {/* Ambient Google Aurora Glow */}
        <div className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-tr from-[#4285F4]/25 via-[#FBBC04]/20 to-[#34A853]/25 blur-xl animate-aurora" />

        <div className="relative h-full w-full rounded-full border border-white/80 shadow-md overflow-hidden bg-transparent">
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="h-full w-full touch-none select-none"
          />
        </div>

        {/* Floating Tooltip Pill following dragged/tapped ball */}
        {activeTooltip && !isUserAdmin(activeTooltip.name) && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-9 rounded-full bg-[#202124] px-3 py-1 text-[11px] font-medium text-white shadow-lg transition-all animate-in zoom-in-90"
            style={{
              left: `${Math.max(40, Math.min(300, activeTooltip.x))}px`,
              top: `${Math.max(30, Math.min(310, activeTooltip.y))}px`,
            }}
          >
            {activeTooltip.name}
          </div>
        )}
      </div>
    </div>
  )
}

