"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { salmanAudio } from '@/lib/salmanAudio'
import {
  Volume2,
  VolumeX,
  X,
  Compass,
  Trophy,
  RotateCcw,
  Zap,
} from 'lucide-react'

interface SalmanDrivingGameProps {
  isOpen: boolean
  onClose: () => void
}

interface Deer {
  id: number
  x: number // lateral position relative to road center (-1.0 to 1.0)
  z: number // perspective depth: 0.04 (horizon) to 1.15 (bumper pass)
  speedZ: number // forward movement relative to player
  crossingSpeedX: number // lateral speed crossing road
  species: 'buck' | 'doe' | 'stag'
  isHit: boolean
  tumbleAngle: number
  tumbleVelocityX: number
  tumbleVelocityY: number
}

interface RoadsideTree {
  id: number
  side: -1 | 1 // -1 = left roadside, 1 = right roadside
  lateralOffset: number // offset outside guardrail
  z: number // 0 to 1
  heightScale: number
}

interface RecentStreakNotice {
  pts: number
  combo: number
  key: number
}

export function SalmanDrivingGame({ isOpen, onClose }: SalmanDrivingGameProps) {
  const [mounted, setMounted] = useState(false)
  const [score, setScore] = useState(0)
  const [deersHit, setDeersHit] = useState(0)
  const [combo, setCombo] = useState(1)
  const [speedKmH, setSpeedKmH] = useState(115)
  const [distanceM, setDistanceM] = useState(0)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [steerAngle, setSteerAngle] = useState(0) // Visual wheel angle in degrees
  const [isScreenShaking, setIsScreenShaking] = useState(false)
  const [impactFlash, setImpactFlash] = useState(false)
  const [recentStreak, setRecentStreak] = useState<RecentStreakNotice | null>(null)
  const [showExitScorecard, setShowExitScorecard] = useState(false)
  const [gyroActive, setGyroActive] = useState(false)
  const [gyroSupported, setGyroSupported] = useState(false)
  const [showMobileTouchPrompt, setShowMobileTouchPrompt] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Mutable Game Physics State
  const gameState = useRef({
    playerX: 0, // -0.85 (left lane) to 0.85 (right lane)
    playerSpeed: 1.85, // Base speed factor
    targetSteer: 0,
    currentSteer: 0,
    curveOffset: 0,
    curveTarget: 0,
    curveTimer: 0,
    deers: [] as Deer[],
    nextDeerId: 1,
    spawnTimer: 0,
    trees: [] as RoadsideTree[],
    keys: { left: false, right: false, up: false, down: false },
    touchGas: false,
    touchBrake: false,
    touchSteerLeft: false,
    touchSteerRight: false,
    distanceAccum: 0,
    comboStreak: 0,
    comboTimer: 0,
  })

  // Initialize roadside scenery trees (16 evergreen pines scrolling along highway)
  useEffect(() => {
    setMounted(true)
    const initialTrees: RoadsideTree[] = []
    for (let i = 0; i < 18; i++) {
      initialTrees.push({
        id: i + 1,
        side: i % 2 === 0 ? -1 : 1,
        lateralOffset: 0.12 + Math.random() * 0.35,
        z: (i / 18) + (Math.random() * 0.05),
        heightScale: 0.8 + Math.random() * 0.45,
      })
    }
    gameState.current.trees = initialTrees
  }, [])

  // Check gyroscope availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setGyroSupported(true)
    }
  }, [])

  // Audio lifecycle: start engine sound on open, stop on dismiss
  useEffect(() => {
    if (isOpen) {
      salmanAudio.startEngine()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden'
      }
    } else {
      salmanAudio.stopEngine()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
    return () => {
      salmanAudio.stopEngine()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Gyroscope tilt listener: handles BOTH Portrait and Landscape orientations!
  useEffect(() => {
    if (!isOpen || !gyroActive) return

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return

      const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight
      let rawTilt = 0

      if (!isLandscape) {
        // Portrait: gamma is left-to-right tilt (-90 to +90 degrees)
        rawTilt = e.gamma
      } else {
        // Landscape: beta is left-to-right tilt (-180 to +180 degrees)
        let angle = 90
        if (typeof window !== 'undefined') {
          angle = window.screen?.orientation?.angle ?? (window.orientation as number) ?? 90
        }
        const sign = angle === 270 || angle === -90 ? -1 : 1
        rawTilt = e.beta * sign
      }

      // Apply 2.5-degree deadzone and clamp between -25° and +25°
      const clamped = Math.max(-25, Math.min(25, rawTilt))
      const steer = Math.abs(clamped) < 2.5 ? 0 : clamped / 25
      gameState.current.targetSteer = steer
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [isOpen, gyroActive])

  // Request Gyroscope Permission (required on iOS Safari)
  const enableGyro = useCallback(async () => {
    setShowMobileTouchPrompt(false)
    if (typeof window === 'undefined') return
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DOE?.requestPermission === 'function') {
      try {
        const perm = await DOE.requestPermission()
        if (perm === 'granted') {
          setGyroActive(true)
        }
      } catch {
        setGyroActive(true)
      }
    } else {
      setGyroActive(true)
    }
  }, [])

  // Keyboard controls listener (Desktop Left/Right Arrows or A/D)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        gameState.current.keys.left = true
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        gameState.current.keys.right = true
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        gameState.current.keys.up = true
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') {
        gameState.current.keys.down = true
      }
      if (e.key === 'h' || e.key === 'H') {
        salmanAudio.playHorn()
      }
      if (e.key === 'm' || e.key === 'M') {
        const muted = salmanAudio.toggleMute()
        setIsAudioMuted(muted)
      }
      if (e.key === 'Escape') {
        setShowExitScorecard(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        gameState.current.keys.left = false
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        gameState.current.keys.right = false
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        gameState.current.keys.up = false
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') {
        gameState.current.keys.down = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isOpen])

  // Trigger collision sensory feedback: haptic vibration + audio + screen shake + clean streak banner
  const triggerHitFeedback = useCallback((deer: Deer) => {
    // 1. Mobile Haptic Vibration
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 50, 240])
      } catch {}
    }

    // 2. Audio Engine SFX: Heavy bumper crunch + animal distress cry
    salmanAudio.playHitSound()
    setTimeout(() => {
      salmanAudio.playDeerCrySound()
    }, 40)

    // 3. Screen Camera Shudder & Red Perimeter Impact Flash
    setIsScreenShaking(true)
    setImpactFlash(true)
    setTimeout(() => setImpactFlash(false), 240)
    setTimeout(() => setIsScreenShaking(false), 360)

    // 4. Score increment & Top-Center Streak Banner (Eliminating center-road text smearing)
    const basePts = deer.species === 'stag' ? 300 : deer.species === 'buck' ? 150 : 100
    const currentCombo = gameState.current.comboStreak + 1
    gameState.current.comboStreak = currentCombo
    gameState.current.comboTimer = 220

    const pts = basePts * currentCombo
    setScore((prev) => prev + pts)
    setDeersHit((prev) => prev + 1)
    setCombo(currentCombo)

    const noticeKey = Date.now()
    setRecentStreak({ pts, combo: currentCombo, key: noticeKey })
    setTimeout(() => {
      setRecentStreak((prev) => (prev?.key === noticeKey ? null : prev))
    }, 1400)
  }, [])

  // 60 FPS Infinite Driving Game Loop
  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let isRunning = true
    let roadStripeOffset = 0

    const render = () => {
      if (!isRunning) return

      const width = canvas.width
      const height = canvas.height
      const g = gameState.current

      // -------------------------------------------------------------
      // 1. Controls & Steering Physics
      // -------------------------------------------------------------
      if (!gyroActive) {
        if (g.keys.left || g.touchSteerLeft) g.targetSteer = -1
        else if (g.keys.right || g.touchSteerRight) g.targetSteer = 1
        else g.targetSteer = 0
      }

      // Smooth steering damping
      g.currentSteer += (g.targetSteer - g.currentSteer) * 0.18
      const steerDegrees = g.currentSteer * 28 // Max 28-degree wheel rotation
      setSteerAngle(steerDegrees)

      // Speed physics (Gas / Brake)
      const isAccelerating = g.keys.up || g.touchGas
      const isBraking = g.keys.down || g.touchBrake

      if (isAccelerating) {
        g.playerSpeed = Math.min(2.8, g.playerSpeed + 0.02)
      } else if (isBraking) {
        g.playerSpeed = Math.max(0.7, g.playerSpeed - 0.04)
      } else {
        // Cruising equilibrium speed
        g.playerSpeed += (1.85 - g.playerSpeed) * 0.02
      }

      const currentKmH = Math.round(g.playerSpeed * 65)
      setSpeedKmH(currentKmH)
      salmanAudio.updateSpeed(currentKmH)

      // Distance tracking
      g.distanceAccum += g.playerSpeed * 0.55
      setDistanceM(Math.floor(g.distanceAccum))

      // Move player lateral position along road
      g.playerX += g.currentSteer * (g.playerSpeed * 0.016)
      g.playerX = Math.max(-0.88, Math.min(0.88, g.playerX))

      // Road Curvature Dynamics
      g.curveTimer++
      if (g.curveTimer > 220) {
        g.curveTimer = 0
        g.curveTarget = (Math.random() - 0.5) * 1.2
      }
      g.curveOffset += (g.curveTarget - g.curveOffset) * 0.014

      // Combo Decay Timer
      if (g.comboTimer > 0) {
        g.comboTimer--
        if (g.comboTimer === 0) {
          g.comboStreak = 0
          setCombo(1)
        }
      }

      // Tire screech sound on sharp turns at high speed
      if (Math.abs(g.currentSteer) > 0.85 && g.playerSpeed > 2.0 && Math.random() < 0.08) {
        salmanAudio.playTireScreech()
      }

      // -------------------------------------------------------------
      // 2. High-Visibility Road Canvas Rendering (Unobstructed Upper 74%)
      // -------------------------------------------------------------
      ctx.clearRect(0, 0, width, height)

      // Horizon line placed at 30% of screen height for wide scenic highway
      const horizonY = height * 0.30
      const roadBottomWidth = width * 1.70
      const roadTopWidth = width * 0.22

      // A. Nocturnal Sky & Distant Mountain Ridge
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
      skyGrad.addColorStop(0, '#020617')
      skyGrad.addColorStop(0.7, '#0B1329')
      skyGrad.addColorStop(1, '#1E293B')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, width, horizonY)

      // Stars
      ctx.fillStyle = '#FFFFFF'
      for (let i = 0; i < 35; i++) {
        const starX = (i * 127.3) % width
        const starY = (i * 39.7) % (horizonY * 0.85)
        ctx.fillRect(starX, starY, 1.3, 1.3)
      }

      // Distant mountain silhouette
      ctx.fillStyle = '#060B18'
      ctx.beginPath()
      ctx.moveTo(0, horizonY)
      ctx.lineTo(width * 0.18, horizonY - 32)
      ctx.lineTo(width * 0.38, horizonY - 14)
      ctx.lineTo(width * 0.58, horizonY - 42)
      ctx.lineTo(width * 0.82, horizonY - 20)
      ctx.lineTo(width, horizonY - 36)
      ctx.lineTo(width, horizonY)
      ctx.closePath()
      ctx.fill()

      // B. Forest Grass Flanks
      const grassGrad = ctx.createLinearGradient(0, horizonY, 0, height)
      grassGrad.addColorStop(0, '#052313')
      grassGrad.addColorStop(0.6, '#03170D')
      grassGrad.addColorStop(1, '#010B06')
      ctx.fillStyle = grassGrad
      ctx.fillRect(0, horizonY, width, height - horizonY)

      // C. High-Contrast Asphalt Highway Surface
      const centerBottomX = width * 0.5 - g.playerX * (width * 0.52)
      const centerTopX = width * 0.5 + g.curveOffset * (width * 0.22)

      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.5, horizonY)
      ctx.lineTo(centerTopX + roadTopWidth * 0.5, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.5, height)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.5, height)
      ctx.closePath()

      // Asphalt gradient illuminated by dual headlights
      const asphaltGrad = ctx.createLinearGradient(0, horizonY, 0, height)
      asphaltGrad.addColorStop(0, '#1E2530')
      asphaltGrad.addColorStop(0.45, '#2D3748')
      asphaltGrad.addColorStop(0.85, '#3E4C5F')
      asphaltGrad.addColorStop(1, '#475569')
      ctx.fillStyle = asphaltGrad
      ctx.fill()

      // Metal Highway Guardrails on Edges
      // Left Guardrail Beam
      ctx.lineWidth = 4.5
      ctx.strokeStyle = '#94A3B8'
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.505, horizonY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.505, height)
      ctx.stroke()

      // Right Guardrail Beam
      ctx.beginPath()
      ctx.moveTo(centerTopX + roadTopWidth * 0.505, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.505, height)
      ctx.stroke()

      // Repeating Guardrail Stanchion Posts with Amber Reflectors
      const guardrailPosts = 16
      roadStripeOffset = (roadStripeOffset + g.playerSpeed * 0.10) % 1
      for (let p = 0; p < guardrailPosts; p++) {
        const postP = (p + roadStripeOffset) / guardrailPosts
        if (postP > 1) continue
        const postZ = Math.pow(postP, 1.7)
        const postY = horizonY + postZ * (height - horizonY)
        const postRcx = centerTopX + (centerBottomX - centerTopX) * postZ
        const postRw = roadTopWidth + (roadBottomWidth - roadTopWidth) * postZ

        const leftPostX = postRcx - postRw * 0.505
        const rightPostX = postRcx + postRw * 0.505
        const postH = 6 + postZ * 20

        // Vertical steel post
        ctx.fillStyle = '#64748B'
        ctx.fillRect(leftPostX - 2, postY - postH, 4, postH)
        ctx.fillRect(rightPostX - 2, postY - postH, 4, postH)

        // Amber reflector stud
        ctx.fillStyle = '#F59E0B'
        ctx.fillRect(leftPostX - 1.5, postY - postH + 2, 3, 4)
        ctx.fillRect(rightPostX - 1.5, postY - postH + 2, 3, 4)
      }

      // Solid Luminous Yellow Shoulder Lines
      ctx.lineWidth = 3.5
      ctx.strokeStyle = '#FACC15'
      ctx.shadowColor = '#FACC15'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.47, horizonY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.47, height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerTopX + roadTopWidth * 0.47, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.47, height)
      ctx.stroke()
      ctx.shadowBlur = 0

      // D. Expansive 3-Lane Highway: Dual Dashed Center Lane Dividers
      const numStripes = 14
      for (let s = 0; s < numStripes; s++) {
        const p1 = (s + roadStripeOffset) / numStripes
        const p2 = (s + 0.45 + roadStripeOffset) / numStripes
        if (p1 > 1) continue

        const z1 = Math.pow(p1, 1.8)
        const z2 = Math.pow(Math.min(1, p2), 1.8)

        const sy1 = horizonY + z1 * (height - horizonY)
        const sy2 = horizonY + z2 * (height - horizonY)

        const rcx1 = centerTopX + (centerBottomX - centerTopX) * z1
        const rcx2 = centerTopX + (centerBottomX - centerTopX) * z2
        const rw1 = roadTopWidth + (roadBottomWidth - roadTopWidth) * z1
        const rw2 = roadTopWidth + (roadBottomWidth - roadTopWidth) * z2

        const stripeWidth = 2.5 + z2 * 12

        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = stripeWidth

        // Left Lane Divider (-0.16 lateral)
        ctx.beginPath()
        ctx.moveTo(rcx1 - rw1 * 0.16, sy1)
        ctx.lineTo(rcx2 - rw2 * 0.16, sy2)
        ctx.stroke()

        // Right Lane Divider (+0.16 lateral)
        ctx.beginPath()
        ctx.moveTo(rcx1 + rw1 * 0.16, sy1)
        ctx.lineTo(rcx2 + rw2 * 0.16, sy2)
        ctx.stroke()
      }

      // E. Powerful Dual Headlight Beam Cones
      const headlightGrad = ctx.createRadialGradient(
        centerBottomX,
        height * 0.85,
        40,
        centerBottomX,
        height * 0.50,
        width * 0.75
      )
      headlightGrad.addColorStop(0, 'rgba(255, 255, 230, 0.42)')
      headlightGrad.addColorStop(0.45, 'rgba(255, 255, 210, 0.18)')
      headlightGrad.addColorStop(1, 'rgba(255, 255, 200, 0)')
      ctx.fillStyle = headlightGrad
      ctx.beginPath()
      ctx.moveTo(centerBottomX - width * 0.25, height)
      ctx.lineTo(centerTopX - roadTopWidth * 0.65, horizonY)
      ctx.lineTo(centerTopX + roadTopWidth * 0.65, horizonY)
      ctx.lineTo(centerBottomX + width * 0.25, height)
      ctx.closePath()
      ctx.fill()

      // F. Parallax Roadside Pine Trees (Flanking Highway)
      for (const tree of g.trees) {
        tree.z += 0.0078 * g.playerSpeed
        if (tree.z > 1.05) {
          tree.z = 0.02
          tree.lateralOffset = 0.12 + Math.random() * 0.38
          tree.heightScale = 0.8 + Math.random() * 0.45
        }

        const treeZScale = Math.pow(tree.z, 1.6)
        const treeY = horizonY + treeZScale * (height - horizonY)
        const treeRcx = centerTopX + (centerBottomX - centerTopX) * treeZScale
        const treeRw = roadTopWidth + (roadBottomWidth - roadTopWidth) * treeZScale

        const treeX = treeRcx + tree.side * (treeRw * 0.52 + tree.lateralOffset * width * 0.45 * treeZScale)
        const treeH = 95 * treeZScale * tree.heightScale
        const treeW = treeH * 0.42

        if (treeH > 5) {
          // Tree Trunk
          ctx.fillStyle = '#0F1713'
          ctx.fillRect(treeX - treeW * 0.08, treeY - treeH * 0.2, treeW * 0.16, treeH * 0.2)

          // 3-Tier Evergreen Foliage
          ctx.fillStyle = '#041F10'
          for (let tier = 0; tier < 3; tier++) {
            const tierBaseY = treeY - treeH * (0.2 + tier * 0.26)
            const tierTopY = treeY - treeH * (0.55 + tier * 0.22)
            const tierW = treeW * (1 - tier * 0.22)

            ctx.beginPath()
            ctx.moveTo(treeX - tierW * 0.5, tierBaseY)
            ctx.lineTo(treeX + tierW * 0.5, tierBaseY)
            ctx.lineTo(treeX, tierTopY)
            ctx.closePath()
            ctx.fill()
          }
        }
      }

      // -------------------------------------------------------------
      // 3. High-Visibility Deer Spawning, Crossing AI & Eye-Shine
      // -------------------------------------------------------------
      g.spawnTimer++
      if (g.spawnTimer > 65) {
        g.spawnTimer = 0
        const fromLeft = Math.random() > 0.5
        const randSpecies = Math.random()
        const species: Deer['species'] = randSpecies < 0.2 ? 'stag' : randSpecies < 0.6 ? 'buck' : 'doe'

        g.deers.push({
          id: g.nextDeerId++,
          x: fromLeft ? -0.86 : 0.86, // Spawns right at the guardrail edge!
          z: 0.04,
          speedZ: 0.0058 * g.playerSpeed,
          crossingSpeedX: (fromLeft ? 1 : -1) * (0.0055 + Math.random() * 0.0025), // Slower lateral crossing: 3+ seconds in view!
          species,
          isHit: false,
          tumbleAngle: 0,
          tumbleVelocityX: (Math.random() - 0.5) * 8,
          tumbleVelocityY: -10 - Math.random() * 6,
        })
      }

      // Update & Draw Deers with Linear Scale & Luminous Eye-Shine
      for (let i = g.deers.length - 1; i >= 0; i--) {
        const d = g.deers[i]

        if (!d.isHit) {
          d.z += d.speedZ
          d.x += d.crossingSpeedX

          // Collision detection: right in front of bumper (z >= 0.74 && z <= 0.90)
          const playerRelativeX = g.playerX
          const xDist = Math.abs(d.x - playerRelativeX)

          if (d.z >= 0.74 && d.z <= 0.90 && xDist < 0.32) {
            d.isHit = true
            triggerHitFeedback(d)
          }
        } else {
          // Tumble physics after hit (3D cartwheel across hood)
          d.x += d.tumbleVelocityX * 0.018
          d.z += 0.022
          d.tumbleAngle += 0.32
          d.tumbleVelocityY += 0.6
        }

        // Remove deers that passed or flew off
        if (d.z > 1.25 || d.x < -1.8 || d.x > 1.8) {
          g.deers.splice(i, 1)
          continue
        }

        // Perspective Screen Position
        const deerZScale = Math.pow(d.z, 1.45)
        const deerY = horizonY + deerZScale * (height - horizonY)
        const roadCenterXAtZ = centerTopX + (centerBottomX - centerTopX) * deerZScale
        const roadWidthAtZ = roadTopWidth + (roadBottomWidth - roadTopWidth) * deerZScale
        const deerX = roadCenterXAtZ + (d.x * roadWidthAtZ * 0.48)

        // Linear Scale Model: 0.38 at horizon -> 1.55 at bumper
        const scale = 0.38 + d.z * 1.2
        const deerW = 74 * scale
        const deerH = 68 * scale

        ctx.save()
        ctx.translate(deerX, deerY)
        if (d.isHit) {
          ctx.rotate(d.tumbleAngle)
        }

        // High-Contrast Body Colors
        const bodyColor = d.species === 'stag' ? '#F59E0B' : d.species === 'buck' ? '#D97706' : '#EA580C'
        ctx.fillStyle = bodyColor

        // Torso
        ctx.beginPath()
        ctx.ellipse(0, -deerH * 0.5, deerW * 0.44, deerH * 0.27, 0, 0, Math.PI * 2)
        ctx.fill()

        // High-Beam Rim Light Contour
        ctx.strokeStyle = '#FEF3C7'
        ctx.lineWidth = Math.max(1.2, 2.4 * scale)
        ctx.stroke()

        // Neck & Head
        const headDir = d.crossingSpeedX > 0 ? 1 : -1
        ctx.fillStyle = bodyColor
        ctx.beginPath()
        ctx.ellipse(headDir * deerW * 0.32, -deerH * 0.84, deerW * 0.17, deerH * 0.22, 0.3 * headDir, 0, Math.PI * 2)
        ctx.fill()

        // White Tail & Muzzle
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(-headDir * deerW * 0.42, -deerH * 0.58, deerW * 0.09, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(headDir * deerW * 0.42, -deerH * 0.84, deerW * 0.08, 0, Math.PI * 2)
        ctx.fill()

        // Luminous Headlight Eye-Shine (Bright Chartreuse Glint)
        ctx.fillStyle = '#CCFF00'
        ctx.shadowColor = '#CCFF00'
        ctx.shadowBlur = Math.max(4, 12 * scale)
        ctx.beginPath()
        const eyeX = headDir * deerW * 0.35
        const eyeY = -deerH * 0.88
        ctx.arc(eyeX, eyeY, Math.max(2.0, 3.8 * scale), 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Realistic Branching Antlers for Buck and Stag
        if (d.species === 'buck' || d.species === 'stag') {
          ctx.strokeStyle = d.species === 'stag' ? '#FDE047' : '#D97706'
          ctx.lineWidth = Math.max(1.8, 3.4 * scale)
          ctx.beginPath()
          const antlerBaseX = headDir * deerW * 0.30
          const antlerBaseY = -deerH * 1.0

          // Main Beam
          ctx.moveTo(antlerBaseX, antlerBaseY)
          ctx.lineTo(antlerBaseX - 12 * scale, antlerBaseY - 18 * scale)
          ctx.lineTo(antlerBaseX - 22 * scale, antlerBaseY - 26 * scale)
          // Brow Tine
          ctx.moveTo(antlerBaseX - 6 * scale, antlerBaseY - 10 * scale)
          ctx.lineTo(antlerBaseX + 6 * scale, antlerBaseY - 16 * scale)
          // Trez Tine
          ctx.moveTo(antlerBaseX - 16 * scale, antlerBaseY - 20 * scale)
          ctx.lineTo(antlerBaseX - 10 * scale, antlerBaseY - 28 * scale)

          // Right Beam
          ctx.moveTo(antlerBaseX, antlerBaseY)
          ctx.lineTo(antlerBaseX + 12 * scale, antlerBaseY - 18 * scale)
          ctx.lineTo(antlerBaseX + 22 * scale, antlerBaseY - 26 * scale)
          // Brow Tine Right
          ctx.moveTo(antlerBaseX + 6 * scale, antlerBaseY - 10 * scale)
          ctx.lineTo(antlerBaseX + 14 * scale, antlerBaseY - 16 * scale)

          ctx.stroke()
        }

        // Dynamic 4-Leg Running Trot Cycle
        ctx.strokeStyle = bodyColor
        ctx.lineWidth = Math.max(2.0, 3.8 * scale)
        const legRunCycle1 = Math.sin(Date.now() * 0.016 + d.id * 3) * 16 * scale
        const legRunCycle2 = Math.cos(Date.now() * 0.016 + d.id * 3) * 16 * scale

        ctx.beginPath()
        // Front Lead Leg
        ctx.moveTo(deerW * 0.22, -deerH * 0.32)
        ctx.lineTo(deerW * 0.30 + legRunCycle1, 0)
        // Front Lag Leg
        ctx.moveTo(deerW * 0.16, -deerH * 0.32)
        ctx.lineTo(deerW * 0.20 - legRunCycle1, 0)
        // Rear Lead Leg
        ctx.moveTo(-deerW * 0.22, -deerH * 0.32)
        ctx.lineTo(-deerW * 0.30 - legRunCycle2, 0)
        // Rear Lag Leg
        ctx.moveTo(-deerW * 0.16, -deerH * 0.32)
        ctx.lineTo(-deerW * 0.18 + legRunCycle2, 0)
        ctx.stroke()

        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      isRunning = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, gyroActive, triggerHitFeedback])

  if (!isOpen || !mounted) return null

  const gameContent = (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[99999] overflow-hidden bg-black select-none ${
        isScreenShaking ? 'anim-screen-rumble' : ''
      }`}
    >
      {/* ==================================================================== */}
      {/* LAYER 1: HIGHWAY CANVAS (UNOBSTRUCTED 74% WINDSHIELD VIEW)           */}
      {/* ==================================================================== */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* Red Perimeter Vignette Impact Shock Flash on Collision */}
      {impactFlash && (
        <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(239,68,68,0.5)_100%)] animate-in fade-in duration-75" />
      )}

      {/* Touch-Steer Zones on Mobile Screen: Left half steers left, right half steers right */}
      <div className="absolute inset-0 z-20 flex pointer-events-auto sm:pointer-events-none">
        <div
          onTouchStart={() => (gameState.current.touchSteerLeft = true)}
          onTouchEnd={() => (gameState.current.touchSteerLeft = false)}
          className="w-1/2 h-full opacity-0"
        />
        <div
          onTouchStart={() => (gameState.current.touchSteerRight = true)}
          onTouchEnd={() => (gameState.current.touchSteerRight = false)}
          className="w-1/2 h-full opacity-0"
        />
      </div>

      {/* ==================================================================== */}
      {/* LAYER 2: PHOTOREALISTIC COCKPIT FRAME (A-PILLARS, CEILING & MIRRORS) */}
      {/* Matching user reference photo (media_1794174167536_5ed18a51.jpg)     */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 pointer-events-none z-22">
        {/* Left A-Pillar Structural Window Trim */}
        <div className="absolute top-0 left-0 bottom-0 w-[14vw] sm:w-[11vw] max-w-[140px] bg-gradient-to-r from-[#0A0D14] via-[#151A24] to-transparent pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 1000" preserveAspectRatio="none">
            {/* Molded A-Pillar Body */}
            <path d="M 0 0 L 35 0 L 85 450 L 100 1000 L 0 1000 Z" fill="#0C1019" />
            <path d="M 35 0 L 38 0 L 88 450 L 100 1000 L 96 1000 L 84 450 Z" fill="#242E3E" opacity="0.7" />
            {/* Rubber Weatherstrip Bead */}
            <path d="M 38 0 L 40 0 L 90 450 L 100 1000" stroke="#000000" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Ceiling Header Trim across top of windshield */}
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#080B11] via-[#10141D] to-transparent pointer-events-none" />

        {/* Left Wing Mirror (Structurally Mounted to Door Base behind A-Pillar) */}
        <div className="absolute left-2 sm:left-6 top-[30%] sm:top-[28%] pointer-events-auto">
          {/* Mirror Door Bracket Triangle */}
          <div className="relative w-24 sm:w-32 h-16 sm:h-22 rounded-2xl border-4 border-[#18202F] bg-[#0A0E17] shadow-[0_12px_36px_rgba(0,0,0,0.8)] overflow-hidden -rotate-3">
            {/* Mirror Reflective Glass showing receding highway */}
            <div className="relative w-full h-full bg-gradient-to-r from-[#0C1424] via-[#182234] to-[#0A0E17] flex items-center justify-center overflow-hidden">
              {/* Receding Asphalt Road Line */}
              <div className="absolute w-[140%] h-1 bg-amber-400/90 -rotate-12 shadow-[0_0_6px_#F59E0B]" />
              <div className="absolute w-[140%] h-0.5 bg-white/70 -rotate-12 translate-y-3" />
              {/* Silver Guardrail Reflection */}
              <div className="absolute top-2 inset-x-0 h-1 bg-slate-400/40" />
              <span className="absolute bottom-1 left-2 text-[7px] font-mono tracking-wider text-neutral-400">
                SIDE MIRROR
              </span>
            </div>
          </div>
        </div>

        {/* Upper Windshield Rear-View Mirror (Suspended from Ceiling, Safely Clears Top HUD) */}
        <div className="absolute top-2 left-[58%] -translate-x-1/2 pointer-events-auto flex flex-col items-center">
          {/* Mounting Stem */}
          <div className="w-2.5 h-3.5 bg-gradient-to-b from-[#0B0F19] to-[#1E293B] rounded-t-sm" />
          {/* Mirror Casing */}
          <div className="w-36 sm:w-48 h-11 sm:h-13 rounded-2xl border-3 border-[#1E293B] bg-[#090D16] shadow-[0_10px_30px_rgba(0,0,0,0.7)] overflow-hidden flex items-center justify-center">
            <div className="relative w-full h-full bg-gradient-to-t from-[#1A2333] to-[#0B111D] flex items-center justify-center">
              {/* Receding Highway Reflection */}
              <div className="w-0.5 h-full bg-white/40 rotate-15" />
              <div className="w-0.5 h-full bg-white/40 -rotate-15" />
              <div className="absolute bottom-0.5 text-[7px] font-mono tracking-widest text-neutral-400">
                REAR VIEW
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LAYER 3: SCULPTED LEATHER COCKPIT & ROTATING ANATOMICAL WHEEL        */}
      {/* Molded cowl, turbine AC vents, illuminated dials, anatomical hands   */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end z-25">
        {/* Sculpted Dashboard (26vh preserving 74% road view) */}
        <div className="relative w-full h-[25vh] sm:h-[27vh] bg-gradient-to-t from-[#080B12] via-[#0F1420] to-[#1A2232] rounded-t-[44px] sm:rounded-t-[64px] border-t-4 border-[#2E3B50] shadow-[0_-20px_60px_rgba(0,0,0,0.92)] flex items-center justify-center">

          {/* Double Leather Stitching Highlight Line */}
          <div className="absolute top-2 inset-x-8 sm:inset-x-20 border-t border-dashed border-sky-400/30 h-0.5" />

          {/* Left Turbine AC Vent (Matching Reference Photo) */}
          <div className="hidden sm:flex absolute left-8 top-5 w-12 h-12 rounded-full border-2 border-[#334155] bg-gradient-to-b from-[#1E293B] to-[#0A0F1D] shadow-inner items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-neutral-700 bg-[#0F172A] flex items-center justify-center">
              <div className="w-full h-0.5 bg-neutral-600 rotate-45" />
              <div className="w-full h-0.5 bg-neutral-600 -rotate-45" />
            </div>
          </div>

          {/* Center-Right Turbine AC Vent */}
          <div className="hidden sm:flex absolute right-16 top-5 w-12 h-12 rounded-full border-2 border-[#334155] bg-gradient-to-b from-[#1E293B] to-[#0A0F1D] shadow-inner items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-neutral-700 bg-[#0F172A] flex items-center justify-center">
              <div className="w-full h-0.5 bg-neutral-600 rotate-45" />
              <div className="w-full h-0.5 bg-neutral-600 -rotate-45" />
            </div>
          </div>

          {/* Driver Instrument Cluster Binnacle Cowl */}
          <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 w-72 sm:w-88 h-15 sm:h-18 rounded-2xl bg-[#070A10]/95 border border-neutral-800 p-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] flex items-center justify-around">
            {/* RPM Tachometer Dial Face */}
            <div className="flex flex-col items-center">
              <div className="relative w-11 sm:w-13 h-11 sm:h-13 rounded-full border border-neutral-700/80 bg-neutral-950 flex items-center justify-center shadow-inner">
                <span className="text-[7px] font-mono text-cyan-400">RPM</span>
                {/* Dynamic Cyan Needle */}
                <div
                  className="absolute w-0.5 h-4 sm:h-5 bg-cyan-400 origin-bottom shadow-[0_0_6px_#22D3EE]"
                  style={{
                    transform: `rotate(${Math.min(135, (speedKmH / 180) * 140 - 70)}deg)`,
                    bottom: '50%',
                  }}
                />
              </div>
            </div>

            {/* Digital Speedometer Center Display */}
            <div className="flex flex-col items-center justify-center px-2">
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-wider drop-shadow-[0_0_10px_#F59E0B]">
                {speedKmH}
              </span>
              <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                KM / H
              </span>
              <span className="text-[7px] font-mono text-neutral-500">
                {distanceM} M
              </span>
            </div>

            {/* Speed Gauge Dial Face */}
            <div className="flex flex-col items-center">
              <div className="relative w-11 sm:w-13 h-11 sm:h-13 rounded-full border border-neutral-700/80 bg-neutral-950 flex items-center justify-center shadow-inner">
                <span className="text-[7px] font-mono text-red-500">SPD</span>
                {/* Dynamic Red Needle */}
                <div
                  className="absolute w-0.5 h-4 sm:h-5 bg-red-500 origin-bottom shadow-[0_0_6px_#EF4444]"
                  style={{
                    transform: `rotate(${Math.min(135, (speedKmH / 180) * 140 - 70)}deg)`,
                    bottom: '50%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Steering Wheel with Anatomically Shaded Human Hands Gripping at 9-and-3 */}
          <div
            className="absolute bottom-[-35px] sm:bottom-[-48px] left-1/2 w-[310px] sm:w-[410px] h-[310px] sm:h-[410px] pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-75"
            style={{
              transform: `translateX(-50%) rotate(${steerAngle}deg)`,
              transformOrigin: '50% 58%',
            }}
            onClick={() => salmanAudio.playHorn()}
            title="Click or Tap to Honk Horn!"
          >
            <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)]" fill="none">
              <defs>
                {/* Perforated Charcoal Leather Steering Rim Gradient */}
                <linearGradient id="salman-rim-grad" x1="40" y1="40" x2="360" y2="360" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2D3748" />
                  <stop offset="30%" stopColor="#1A202C" />
                  <stop offset="70%" stopColor="#111827" />
                  <stop offset="100%" stopColor="#0B0F17" />
                </linearGradient>

                {/* Brushed Aluminum Spoke Gradient */}
                <linearGradient id="salman-spoke-grad" x1="140" y1="180" x2="260" y2="280" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="50%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>

                {/* Anatomical Human Skin Warm Lighting Gradient */}
                <linearGradient id="salman-hand-skin" x1="0" y1="150" x2="200" y2="400" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F7CEBD" />
                  <stop offset="35%" stopColor="#E2A08A" />
                  <stop offset="70%" stopColor="#B66B56" />
                  <stop offset="100%" stopColor="#7E3A28" />
                </linearGradient>
                <linearGradient id="salman-hand-skin-r" x1="400" y1="150" x2="200" y2="400" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F7CEBD" />
                  <stop offset="35%" stopColor="#E2A08A" />
                  <stop offset="70%" stopColor="#B66B56" />
                  <stop offset="100%" stopColor="#7E3A28" />
                </linearGradient>
              </defs>

              {/* Outer Leather Steering Wheel Rim */}
              <circle cx="200" cy="200" r="150" stroke="url(#salman-rim-grad)" strokeWidth="32" />
              <circle cx="200" cy="200" r="134" stroke="#475569" strokeWidth="2.5" opacity="0.65" />
              <circle cx="200" cy="200" r="166" stroke="#0F172A" strokeWidth="2" opacity="0.85" />

              {/* Ergonomic Molded Thumb Rests at 10 and 2 */}
              <ellipse cx="98" cy="118" rx="16" ry="10" fill="#1E293B" transform="rotate(-35 98 118)" />
              <ellipse cx="302" cy="118" rx="16" ry="10" fill="#1E293B" transform="rotate(35 302 118)" />

              {/* 3-Spoke Brushed Metal Steering Architecture */}
              {/* Left Spoke */}
              <path d="M 52 196 L 148 196 L 148 232 L 54 220 Z" fill="url(#salman-spoke-grad)" />
              {/* Left Steering Wheel Control Buttons */}
              <rect x="96" y="200" width="14" height="10" rx="3" fill="#1E293B" stroke="#64748B" strokeWidth="1" />
              <rect x="114" y="200" width="14" height="10" rx="3" fill="#1E293B" stroke="#64748B" strokeWidth="1" />

              {/* Right Spoke */}
              <path d="M 348 196 L 252 196 L 252 232 L 346 220 Z" fill="url(#salman-spoke-grad)" />
              {/* Right Steering Wheel Control Buttons */}
              <rect x="272" y="200" width="14" height="10" rx="3" fill="#1E293B" stroke="#64748B" strokeWidth="1" />
              <rect x="290" y="200" width="14" height="10" rx="3" fill="#1E293B" stroke="#64748B" strokeWidth="1" />

              {/* Bottom Center Spoke */}
              <path d="M 184 240 L 216 240 L 210 334 L 190 334 Z" fill="url(#salman-spoke-grad)" />

              {/* Center Airbag Hub & Horn Pad */}
              <rect x="144" y="156" width="112" height="92" rx="26" fill="#0F172A" stroke="#334155" strokeWidth="3" />
              <ellipse cx="200" cy="202" rx="25" ry="15" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
              <text x="200" y="206" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold" letterSpacing="0.1em">
                SALMAN
              </text>

              {/* ============================================================= */}
              {/* ANATOMICAL LEFT DRIVER HAND & FOREARM (Gripping at 9 o'clock) */}
              {/* ============================================================= */}
              <g id="anatomical-left-hand">
                {/* Realistic Forearm entering from bottom-left corner with natural contour */}
                <path
                  d="M -10 400 C 18 350, 42 270, 52 208 L 86 214 C 76 276, 50 365, 24 415 Z"
                  fill="url(#salman-hand-skin)"
                />
                {/* Forearm Muscle Highlight */}
                <path d="M 12 375 C 32 320, 52 250, 60 216" stroke="#FDE8E0" strokeWidth="3" opacity="0.4" fill="none" strokeLinecap="round" />

                {/* 4 Shaded Curled Fingers Wrapped over Wheel Rim */}
                {/* Index Finger */}
                <rect x="42" y="174" width="30" height="15" rx="7" fill="#F4BAA7" stroke="#873F2D" strokeWidth="1.2" />
                <line x1="58" y1="175" x2="58" y2="188" stroke="#873F2D" strokeWidth="0.8" opacity="0.6" />
                {/* Middle Finger */}
                <rect x="39" y="190" width="32" height="15" rx="7" fill="#ECA996" stroke="#873F2D" strokeWidth="1.2" />
                <line x1="57" y1="191" x2="57" y2="204" stroke="#873F2D" strokeWidth="0.8" opacity="0.6" />
                {/* Ring Finger */}
                <rect x="41" y="206" width="30" height="15" rx="7" fill="#DF9783" stroke="#873F2D" strokeWidth="1.2" />
                <line x1="57" y1="207" x2="57" y2="220" stroke="#873F2D" strokeWidth="0.8" opacity="0.6" />
                {/* Pinky Finger */}
                <rect x="45" y="222" width="26" height="14" rx="7" fill="#D28470" stroke="#873F2D" strokeWidth="1.2" />

                {/* Thumb resting naturally over front spoke */}
                <ellipse cx="80" cy="190" rx="15" ry="9" fill="#F5C0AE" transform="rotate(-30 80 190)" stroke="#873F2D" strokeWidth="1.2" />
                {/* Thumb Nail */}
                <ellipse cx="87" cy="186" rx="4" ry="2.5" fill="#FFEFEA" transform="rotate(-30 87 186)" opacity="0.7" />
              </g>

              {/* ============================================================== */}
              {/* ANATOMICAL RIGHT DRIVER HAND & FOREARM (Gripping at 3 o'clock) */}
              {/* ============================================================== */}
              <g id="anatomical-right-hand">
                {/* Realistic Forearm entering from bottom-right corner */}
                <path
                  d="M 410 400 C 382 350, 358 270, 348 208 L 314 214 C 324 276, 350 365, 376 415 Z"
                  fill="url(#salman-hand-skin-r)"
                />
                {/* Forearm Muscle Highlight */}
                <path d="M 388 375 C 368 320, 348 250, 340 216" stroke="#FDE8E0" strokeWidth="3" opacity="0.4" fill="none" strokeLinecap="round" />

                {/* 4 Shaded Curled Fingers Wrapped over Wheel Rim */}
                {/* Index Finger */}
                <rect x="328" y="174" width="30" height="15" rx="7" fill="#F4BAA7" stroke="#873F2D" strokeWidth="1.2" />
                <line x1="342" y1="175" x2="342" y2="188" stroke="#873F2D" strokeWidth="0.8" opacity="0.6" />
                {/* Middle Finger */}
                <rect x="329" y="190" width="32" height="15" rx="7" fill="#ECA996" stroke="#873F2D" strokeWidth="1.2" />
                <line x1="343" y1="191" x2="343" y2="204" stroke="#873F2D" strokeWidth="0.8" opacity="0.6" />
                {/* Ring Finger */}
                <rect x="329" y="206" width="30" height="15" rx="7" fill="#DF9783" stroke="#873F2D" strokeWidth="1.2" />
                <line x1="343" y1="207" x2="343" y2="220" stroke="#873F2D" strokeWidth="0.8" opacity="0.6" />
                {/* Pinky Finger */}
                <rect x="329" y="222" width="26" height="14" rx="7" fill="#D28470" stroke="#873F2D" strokeWidth="1.2" />

                {/* Thumb resting naturally over front spoke */}
                <ellipse cx="320" cy="190" rx="15" ry="9" fill="#F5C0AE" transform="rotate(30 320 190)" stroke="#873F2D" strokeWidth="1.2" />
                {/* Thumb Nail */}
                <ellipse cx="313" cy="186" rx="4" ry="2.5" fill="#FFEFEA" transform="rotate(30 313 186)" opacity="0.7" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LAYER 4: TOP HUD, ARCADE STREAK BANNER & CONTROLS                    */}
      {/* ==================================================================== */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-center justify-between z-30 pointer-events-auto">
        {/* Score & Deer Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-black/80 backdrop-blur-md border border-neutral-700/80 rounded-2xl px-3 sm:px-4 py-2 flex items-center gap-3 text-white shadow-xl">
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-neutral-400">DEERS HIT</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-red-500">{deersHit}</span>
            </div>
            <div className="h-7 w-px bg-neutral-700" />
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-neutral-400">SCORE</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-400">{score}</span>
            </div>
            {combo > 1 && (
              <span className="bg-gradient-to-r from-red-600 to-amber-600 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold animate-pulse">
                {combo}X STREAK
              </span>
            )}
          </div>
        </div>

        {/* Center Title Badge & Arcade Streak Ribbon (Isolated from road horizon) */}
        <div className="flex flex-col items-center">
          <div className="hidden md:flex flex-col items-center bg-black/60 backdrop-blur-sm border border-neutral-700 px-4 py-1.5 rounded-full">
            <span className="text-xs font-mono font-extrabold tracking-[0.25em] text-white">
              SALMAN DRIVING SCHOOL
            </span>
            <span className="text-[9px] font-mono text-neutral-400">INFINITE NOCTURNAL HIGHWAY</span>
          </div>

          {/* Dedicated Arcade Streak Ribbon */}
          {recentStreak && (
            <div
              key={recentStreak.key}
              className="mt-1 px-3.5 py-1 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-mono font-black text-xs sm:text-sm tracking-wider shadow-[0_0_16px_#F59E0B] border border-amber-300 animate-in zoom-in-90 fade-in duration-150"
            >
              +{recentStreak.pts} {recentStreak.combo > 1 ? `(${recentStreak.combo}X STREAK!)` : 'CLEARED!'}
            </div>
          )}
        </div>

        {/* Audio, Gyro & Exit Controls (Cleanly positioned with ample clearance) */}
        <div className="flex items-center gap-2">
          {gyroSupported && (
            <button
              onClick={() => {
                if (!gyroActive) enableGyro()
                else setGyroActive(false)
              }}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border text-[10px] sm:text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                gyroActive
                  ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_12px_#059669]'
                  : 'bg-black/60 border-neutral-700 text-neutral-300 hover:text-white'
              }`}
              title="Toggle Gyroscope Steering"
            >
              <Compass className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${gyroActive ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              <span>{gyroActive ? 'Gyro ON' : 'Gyro OFF'}</span>
            </button>
          )}

          <button
            onClick={() => {
              const muted = salmanAudio.toggleMute()
              setIsAudioMuted(muted)
            }}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-neutral-700 bg-black/60 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-neutral-800 transition-colors"
            title="Toggle Engine & Sound SFX"
          >
            {isAudioMuted ? <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-400" /> : <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => setShowExitScorecard(true)}
            className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <X className="h-3.5 w-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Mobile Tap-To-Engage-Gyro Overlay (Shown initially on touch devices) */}
      {showMobileTouchPrompt && gyroSupported && !gyroActive && (
        <div
          onClick={enableGyro}
          className="sm:hidden absolute top-16 inset-x-4 z-40 bg-gradient-to-r from-amber-600/90 to-amber-700/90 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 animate-spin text-amber-200" style={{ animationDuration: '4s' }} />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight">Tap to Enable Gyroscope Steering</span>
              <span className="text-[10px] text-amber-200">Tilt your phone left and right to steer</span>
            </div>
          </div>
          <span className="text-xs font-mono font-black bg-white/20 px-2.5 py-1 rounded-full uppercase">START</span>
        </div>
      )}

      {/* Mobile On-Screen Touch Controls (Gas & Brake Pedals) */}
      <div className="sm:hidden absolute bottom-3 inset-x-3 z-40 flex items-center justify-between pointer-events-none">
        {/* Brake Pedal (Left Thumb) */}
        <button
          onTouchStart={() => (gameState.current.touchBrake = true)}
          onTouchEnd={() => (gameState.current.touchBrake = false)}
          onMouseDown={() => (gameState.current.touchBrake = true)}
          onMouseUp={() => (gameState.current.touchBrake = false)}
          className="pointer-events-auto h-14 w-18 rounded-2xl border-2 border-red-500/80 bg-red-950/80 active:bg-red-600 text-white font-mono font-bold text-xs flex flex-col items-center justify-center shadow-2xl active:scale-95"
        >
          <span>BRAKE</span>
        </button>

        {/* Gas Pedal (Right Thumb) */}
        <button
          onTouchStart={() => (gameState.current.touchGas = true)}
          onTouchEnd={() => (gameState.current.touchGas = false)}
          onMouseDown={() => (gameState.current.touchGas = true)}
          onMouseUp={() => (gameState.current.touchGas = false)}
          className="pointer-events-auto h-16 w-20 rounded-2xl border-2 border-emerald-500/80 bg-emerald-950/80 active:bg-emerald-600 text-white font-mono font-bold text-sm flex flex-col items-center justify-center shadow-2xl active:scale-95"
        >
          <span>GAS</span>
          <span className="text-[9px] text-emerald-300">BOOST</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* EXIT / REPORT CARD MODAL: SALMAN DRIVING SCHOOL OFFICIAL LICENSE     */}
      {/* ==================================================================== */}
      {showExitScorecard && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-amber-400/60 bg-gradient-to-b from-[#13192B] via-[#0D1322] to-[#080D1A] p-6 text-center text-white shadow-[0_25px_80px_rgba(245,158,11,0.3)] animate-in zoom-in-95 duration-200">
            {/* Academy Gold Seal */}
            <div className="mx-auto mb-3 flex items-center justify-center h-16 w-16 rounded-full border-2 border-amber-400 bg-amber-950/70 text-amber-400 shadow-[0_0_20px_#F59E0B]">
              <Trophy className="h-8 w-8" />
            </div>

            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-amber-300">
              SALMAN DRIVING ACADEMY • OFFICIAL LICENSE
            </span>
            <h2 className="text-2xl font-serif font-black tracking-tight mt-1 text-white">
              Highway Clearance Report
            </h2>

            {/* Performance Stats */}
            <div className="my-5 grid grid-cols-3 gap-2.5 rounded-2xl bg-black/50 border border-neutral-800 p-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-neutral-400">DEERS CLEARED</span>
                <span className="text-xl font-mono font-bold text-red-500">{deersHit}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-neutral-400">TOTAL SCORE</span>
                <span className="text-xl font-mono font-bold text-amber-400">{score}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-neutral-400">TOP SPEED</span>
                <span className="text-xl font-mono font-bold text-emerald-400">{speedKmH} KM/H</span>
              </div>
            </div>

            {/* Rank Designation */}
            <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3">
              <span className="text-xs font-mono text-amber-200 block">
                {deersHit >= 15
                  ? 'RANK S • HONORARY MIDNIGHT CHINKARA PILOT 🏆'
                  : deersHit >= 8
                  ? 'RANK A • CERTIFIED HIGHWAY SWERVER 🥇'
                  : deersHit >= 3
                  ? 'RANK B • ROOKIE BUMPER APPRENTICE 🥈'
                  : 'RANK C • BICYCLE LANE PROBATIONER 🥉'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setShowExitScorecard(false)}
                className="w-full sm:w-1/2 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-white py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Keep Driving</span>
              </button>

              <button
                onClick={() => {
                  setShowExitScorecard(false)
                  onClose()
                }}
                className="w-full sm:w-1/2 rounded-full border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 py-3 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
              >
                <span>Return to Campus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(gameContent, document.body)
}
