"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
// Module-level preloads for instantaneous texture rendering
let cachedDeerImg: HTMLImageElement | null = null
let cachedWheelImg: HTMLImageElement | null = null
let cachedAsphaltImg: HTMLImageElement | null = null
if (typeof window !== 'undefined') {
  cachedDeerImg = new Image()
  cachedDeerImg.src = '/game/deer_stag.png'
  cachedWheelImg = new Image()
  cachedWheelImg.src = '/game/steering_wheel_hands.png'
  cachedAsphaltImg = new Image()
  cachedAsphaltImg.src = '/game/asphalt_texture.jpg'
}

import { salmanAudio } from '@/lib/salmanAudio'
import {
  Volume2,
  VolumeX,
  X,
  Compass,
  Trophy,
  RotateCcw,
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
  const deerImageRef = useRef<HTMLImageElement | null>(null)
  const asphaltImageRef = useRef<HTMLImageElement | null>(null)

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

  // Preload photorealistic stag sprite for high-performance canvas rendering
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const img = new Image()
      img.src = '/game/deer_stag.png'
      deerImageRef.current = img

      const aImg = new Image()
      aImg.src = '/game/asphalt_texture.jpg'
      asphaltImageRef.current = aImg
    }

    const initialTrees: RoadsideTree[] = []
    for (let i = 0; i < 20; i++) {
      initialTrees.push({
        id: i + 1,
        side: i % 2 === 0 ? -1 : 1,
        lateralOffset: 0.14 + Math.random() * 0.4,
        z: (i / 20) + (Math.random() * 0.04),
        heightScale: 0.85 + Math.random() * 0.4,
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
      // Road bottom is clipped before screen bottom to ensure zero bleed under dashboard
      const roadCowlY = height * 0.88
      const roadBottomWidth = width * 1.60
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

      // C. Hyper-Realistic Multi-Layer Highway Roadway & Infrastructure
      const centerBottomX = width * 0.5 - g.playerX * (width * 0.52)
      const centerTopX = width * 0.5 + g.curveOffset * (width * 0.22)

      const activeAsphaltImg = asphaltImageRef.current || cachedAsphaltImg

      // --- 1. ASPHALT ROADBED WITH REAL AGGREGATE TEXTURE PATTERN ---
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.505, horizonY)
      ctx.lineTo(centerTopX + roadTopWidth * 0.505, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.505, roadCowlY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.505, roadCowlY)
      ctx.closePath()
      ctx.clip()

      // Fill with authentic granular asphalt texture pattern
      if (activeAsphaltImg && activeAsphaltImg.complete && activeAsphaltImg.naturalWidth > 0) {
        const pattern = ctx.createPattern(activeAsphaltImg, 'repeat')
        if (pattern) {
          ctx.fillStyle = pattern
          ctx.fillRect(0, horizonY, width, roadCowlY - horizonY)
        }
      } else {
        const asphaltGrad = ctx.createLinearGradient(0, horizonY, 0, roadCowlY)
        asphaltGrad.addColorStop(0, '#151A22')
        asphaltGrad.addColorStop(0.45, '#1E2530')
        asphaltGrad.addColorStop(0.85, '#2D3748')
        asphaltGrad.addColorStop(1, '#3A4659')
        ctx.fillStyle = asphaltGrad
        ctx.fillRect(0, horizonY, width, roadCowlY - horizonY)
      }

      // Nocturnal Atmospheric Falloff & Depth Gradient
      const depthGrad = ctx.createLinearGradient(0, horizonY, 0, roadCowlY)
      depthGrad.addColorStop(0, 'rgba(4, 8, 16, 0.88)')
      depthGrad.addColorStop(0.35, 'rgba(11, 16, 26, 0.65)')
      depthGrad.addColorStop(0.75, 'rgba(15, 23, 42, 0.35)')
      depthGrad.addColorStop(1, 'rgba(15, 23, 42, 0.15)')
      ctx.fillStyle = depthGrad
      ctx.fillRect(0, horizonY, width, roadCowlY - horizonY)

      // Dual Polished Tire Wear Tracks down each of the 3 highway lanes
      for (const laneOffset of [-0.33, 0, 0.33]) {
        for (const wheelOffset of [-0.07, 0.07]) {
          const twGrad = ctx.createLinearGradient(0, horizonY, 0, roadCowlY)
          twGrad.addColorStop(0, 'rgba(10, 14, 22, 0.20)')
          twGrad.addColorStop(1, 'rgba(4, 7, 12, 0.52)')
          ctx.fillStyle = twGrad
          ctx.beginPath()
          ctx.moveTo(centerTopX + roadTopWidth * (laneOffset + wheelOffset) - 1.5, horizonY)
          ctx.lineTo(centerTopX + roadTopWidth * (laneOffset + wheelOffset) + 1.5, horizonY)
          ctx.lineTo(centerBottomX + roadBottomWidth * (laneOffset + wheelOffset) + 14, roadCowlY)
          ctx.lineTo(centerBottomX + roadBottomWidth * (laneOffset + wheelOffset) - 14, roadCowlY)
          ctx.closePath()
          ctx.fill()
        }
      }

      // Crushed-Stone Gravel Shoulder Bands (Macadam berm outside yellow lines)
      const gravelGrad = ctx.createLinearGradient(0, horizonY, 0, roadCowlY)
      gravelGrad.addColorStop(0, '#1A1816')
      gravelGrad.addColorStop(1, '#2B2622')
      // Left Gravel Shoulder
      ctx.fillStyle = gravelGrad
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.505, horizonY)
      ctx.lineTo(centerTopX - roadTopWidth * 0.465, horizonY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.465, roadCowlY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.505, roadCowlY)
      ctx.closePath()
      ctx.fill()

      // Right Gravel Shoulder
      ctx.beginPath()
      ctx.moveTo(centerTopX + roadTopWidth * 0.465, horizonY)
      ctx.lineTo(centerTopX + roadTopWidth * 0.505, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.505, roadCowlY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.465, roadCowlY)
      ctx.closePath()
      ctx.fill()

      ctx.restore() // End roadbed clip

      // --- 2. NOTCHED SHOULDER RUMBLE STRIPS ---
      const numRumble = 28
      for (let r = 0; r < numRumble; r++) {
        const rp = (r + roadStripeOffset * 2) / numRumble
        if (rp > 1) continue
        const rz = Math.pow(rp, 1.8)
        const ry = horizonY + rz * (roadCowlY - horizonY)
        const rcx = centerTopX + (centerBottomX - centerTopX) * rz
        const rw = roadTopWidth + (roadBottomWidth - roadTopWidth) * rz
        const rH = 2 + rz * 5
        const rW = 3 + rz * 12

        ctx.fillStyle = r % 2 === 0 ? 'rgba(15, 12, 10, 0.75)' : 'rgba(75, 70, 65, 0.65)'
        // Left rumble notch
        ctx.fillRect(rcx - rw * 0.468, ry - rH * 0.5, rW, rH)
        // Right rumble notch
        ctx.fillRect(rcx + rw * 0.468 - rW, ry - rH * 0.5, rW, rH)
      }

      // --- 3. LUMINOUS YELLOW SHOULDER MARKINGS ---
      ctx.lineWidth = 3.5
      ctx.strokeStyle = '#FACC15'
      ctx.shadowColor = '#FACC15'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.465, horizonY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.465, roadCowlY)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerTopX + roadTopWidth * 0.465, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.465, roadCowlY)
      ctx.stroke()
      ctx.shadowBlur = 0

      // --- 4. 3D THERMOPLASTIC DASHED LANE MARKINGS WITH RETROREFLECTIVE CAT'S EYES ---
      const numStripes = 14
      for (let s = 0; s < numStripes; s++) {
        const p1 = (s + roadStripeOffset) / numStripes
        const p2 = (s + 0.42 + roadStripeOffset) / numStripes
        if (p1 > 1) continue

        const z1 = Math.pow(p1, 1.8)
        const z2 = Math.pow(Math.min(1, p2), 1.8)

        const sy1 = horizonY + z1 * (roadCowlY - horizonY)
        const sy2 = horizonY + z2 * (roadCowlY - horizonY)

        const rcx1 = centerTopX + (centerBottomX - centerTopX) * z1
        const rcx2 = centerTopX + (centerBottomX - centerTopX) * z2
        const rw1 = roadTopWidth + (roadBottomWidth - roadTopWidth) * z1
        const rw2 = roadTopWidth + (roadBottomWidth - roadTopWidth) * z2

        const stripeWidth = 2.5 + z2 * 14

        // Thermoplastic raised paint drop shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
        ctx.lineWidth = stripeWidth + 2.5
        ctx.beginPath()
        ctx.moveTo(rcx1 - rw1 * 0.16 + 1, sy1 + 1)
        ctx.lineTo(rcx2 - rw2 * 0.16 + 1, sy2 + 1)
        ctx.moveTo(rcx1 + rw1 * 0.16 + 1, sy1 + 1)
        ctx.lineTo(rcx2 + rw2 * 0.16 + 1, sy2 + 1)
        ctx.stroke()

        // Crisp white thermoplastic reflective paint body
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = stripeWidth
        ctx.beginPath()
        ctx.moveTo(rcx1 - rw1 * 0.16, sy1)
        ctx.lineTo(rcx2 - rw2 * 0.16, sy2)
        ctx.moveTo(rcx1 + rw1 * 0.16, sy1)
        ctx.lineTo(rcx2 + rw2 * 0.16, sy2)
        ctx.stroke()

        // Retroreflective Cat's Eyes (Raised Pavement Markers) glinting under headlights
        if (z2 > 0.10) {
          const studSize = 2.5 + z2 * 7.5
          ctx.fillStyle = '#FFFFFF'
          ctx.shadowColor = '#FEF08A'
          ctx.shadowBlur = Math.max(3, 11 * z2)
          // Left lane marker stud
          ctx.fillRect(rcx2 - rw2 * 0.16 - studSize * 0.5, sy2 - studSize * 0.5, studSize, studSize)
          // Right lane marker stud
          ctx.fillRect(rcx2 + rw2 * 0.16 - studSize * 0.5, sy2 - studSize * 0.5, studSize, studSize)
          ctx.shadowBlur = 0
        }
      }

      // --- 5. 3D CORRUGATED GALVANIZED STEEL W-BEAM GUARDRAILS ---
      // Vertical Steel I-Beam Stanchions
      const guardrailPosts = 18
      for (let p = 0; p < guardrailPosts; p++) {
        const postP = (p + roadStripeOffset) / guardrailPosts
        if (postP > 1) continue
        const postZ = Math.pow(postP, 1.7)
        const postY = horizonY + postZ * (roadCowlY - horizonY)
        const postRcx = centerTopX + (centerBottomX - centerTopX) * postZ
        const postRw = roadTopWidth + (roadBottomWidth - roadTopWidth) * postZ

        const leftPostX = postRcx - postRw * 0.505
        const rightPostX = postRcx + postRw * 0.505
        const postW = 3 + postZ * 8
        const postH = 8 + postZ * 26

        // Galvanized steel vertical post
        ctx.fillStyle = '#64748B'
        ctx.fillRect(leftPostX - postW * 0.5, postY - postH, postW, postH)
        ctx.fillRect(rightPostX - postW * 0.5, postY - postH, postW, postH)

        // Amber retroreflective trapezoid tab on each post
        ctx.fillStyle = '#F59E0B'
        ctx.shadowColor = '#F59E0B'
        ctx.shadowBlur = Math.max(2, 9 * postZ)
        ctx.fillRect(leftPostX - 1.5, postY - postH + 2, 3 + postZ * 3, 4 + postZ * 4)
        ctx.fillRect(rightPostX - 1.5, postY - postH + 2, 3 + postZ * 3, 4 + postZ * 4)
        ctx.shadowBlur = 0
      }

      // Corrugated W-Beam Ribbon: Top Specular Crown, Center Shadow Valley, Bottom Lip
      // Top Specular Crown
      ctx.lineWidth = 3.5
      ctx.strokeStyle = '#CBD5E1'
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.505, horizonY - 4)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.505, roadCowlY - 14)
      ctx.moveTo(centerTopX + roadTopWidth * 0.505, horizonY - 4)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.505, roadCowlY - 14)
      ctx.stroke()

      // Center Recessed Shadow Valley
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#334155'
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.505, horizonY - 1)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.505, roadCowlY - 6)
      ctx.moveTo(centerTopX + roadTopWidth * 0.505, horizonY - 1)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.505, roadCowlY - 6)
      ctx.stroke()

      // Bottom Structural Lip
      ctx.lineWidth = 3.0
      ctx.strokeStyle = '#94A3B8'
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.505, horizonY + 2)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.505, roadCowlY + 2)
      ctx.moveTo(centerTopX + roadTopWidth * 0.505, horizonY + 2)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.505, roadCowlY + 2)
      ctx.stroke()

      // --- 6. POWERFUL DUAL HIGH-BEAM HEADLIGHT SPOTLIGHT CONES ---
      const headlightGrad = ctx.createRadialGradient(
        centerBottomX,
        height * 0.85,
        50,
        centerBottomX,
        height * 0.45,
        width * 0.80
      )
      headlightGrad.addColorStop(0, 'rgba(255, 255, 230, 0.46)')
      headlightGrad.addColorStop(0.35, 'rgba(255, 250, 215, 0.24)')
      headlightGrad.addColorStop(0.70, 'rgba(240, 245, 255, 0.08)')
      headlightGrad.addColorStop(1, 'rgba(240, 245, 255, 0)')
      ctx.fillStyle = headlightGrad
      ctx.beginPath()
      ctx.moveTo(centerBottomX - width * 0.28, roadCowlY)
      ctx.lineTo(centerTopX - roadTopWidth * 0.70, horizonY)
      ctx.lineTo(centerTopX + roadTopWidth * 0.70, horizonY)
      ctx.lineTo(centerBottomX + width * 0.28, roadCowlY)
      ctx.closePath()
      ctx.fill()

      // Horizon Ground Fog & Atmospheric Night Mist
      const mistGrad = ctx.createLinearGradient(0, horizonY - 12, 0, horizonY + 32)
      mistGrad.addColorStop(0, 'rgba(15, 23, 42, 0)')
      mistGrad.addColorStop(0.5, 'rgba(30, 41, 59, 0.35)')
      mistGrad.addColorStop(1, 'rgba(15, 23, 42, 0)')
      ctx.fillStyle = mistGrad
      ctx.fillRect(0, horizonY - 12, width, 44)

      // F. Parallax Roadside Pine Trees (Flanking Highway)
      for (const tree of g.trees) {
        tree.z += 0.0078 * g.playerSpeed
        if (tree.z > 1.05) {
          tree.z = 0.02
          tree.lateralOffset = 0.14 + Math.random() * 0.4
          tree.heightScale = 0.85 + Math.random() * 0.4
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

      // Update & Draw Deers with Photorealistic Stag Sprite & Luminous Eye-Shine
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
        const deerY = horizonY + deerZScale * (roadCowlY - horizonY)
        const roadCenterXAtZ = centerTopX + (centerBottomX - centerTopX) * deerZScale
        const roadWidthAtZ = roadTopWidth + (roadBottomWidth - roadTopWidth) * deerZScale
        const deerX = roadCenterXAtZ + (d.x * roadWidthAtZ * 0.48)

        // True-to-life majestic stag proportions: 65px at horizon to 285px at car bumper
        const scale = 0.35 + d.z * 1.55
        const deerW = 165 * scale
        const deerH = deerW * (697 / 954) // Exact 1:1 aspect ratio of cropped high-res stag sprite

        ctx.save()
        // Subtle realistic gallop stride bobbing
        const gallopBob = !d.isHit ? Math.sin(Date.now() * 0.015 + d.id * 3) * (4 * scale) : 0
        ctx.translate(deerX, deerY + gallopBob)

        if (d.isHit) {
          ctx.rotate(d.tumbleAngle)
        }

        // Direction flip: if crossing from right to left, flip horizontally (sprite naturally faces right)
        const headDir = d.crossingSpeedX > 0 ? 1 : -1
        ctx.scale(headDir, 1)

        const activeDeerImg = deerImageRef.current || cachedDeerImg

        // Draw photorealistic stag sprite image with high-beam illumination
        if (activeDeerImg && activeDeerImg.complete && activeDeerImg.naturalWidth > 0) {
          ctx.drawImage(
            activeDeerImg,
            -deerW * 0.5,
            -deerH,
            deerW,
            deerH
          )

          // Soft golden rim-light highlight catching fur from high-beam headlights
          if (d.z > 0.45) {
            ctx.save()
            ctx.globalCompositeOperation = 'source-atop'
            const headlightGlow = ctx.createLinearGradient(0, -deerH, 0, 0)
            headlightGlow.addColorStop(0, 'rgba(255, 255, 230, 0.28)')
            headlightGlow.addColorStop(1, 'rgba(255, 240, 200, 0.05)')
            ctx.fillStyle = headlightGlow
            ctx.fillRect(-deerW * 0.5, -deerH, deerW, deerH)
            ctx.restore()
          }
        } else {
          // Anatomical wild deer silhouette fallback with antlers (zero cartoon shapes)
          ctx.fillStyle = '#D97706'
          ctx.beginPath()
          ctx.ellipse(0, -deerH * 0.45, deerW * 0.42, deerH * 0.28, 0, 0, Math.PI * 2)
          ctx.fill()
          // Antlers
          ctx.strokeStyle = '#FDE047'
          ctx.lineWidth = Math.max(1.5, 3 * scale)
          ctx.beginPath()
          ctx.moveTo(deerW * 0.24, -deerH * 0.8)
          ctx.lineTo(deerW * 0.35, -deerH * 1.05)
          ctx.stroke()
        }

        // Luminous Headlight Eye-Shine (Chartreuse glint precisely on the anatomical eye position: x=73.8%, y=21.5%)
        ctx.fillStyle = '#CCFF00'
        ctx.shadowColor = '#CCFF00'
        ctx.shadowBlur = Math.max(4, 14 * scale)
        ctx.beginPath()
        const eyeX = deerW * 0.238
        const eyeY = -deerH * 0.785
        ctx.arc(eyeX, eyeY, Math.max(2.0, 3.8 * scale), 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

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

        {/* Left Driver Door Sill & Armrest Panel (Matching Reference Photo) */}
        <div className="absolute bottom-0 left-0 w-24 sm:w-36 h-[34vh] bg-gradient-to-t from-[#080B12] via-[#0E131E] to-[#182130] border-r-2 border-[#242E40] shadow-[10px_0_30px_rgba(0,0,0,0.85)] flex flex-col justify-between p-3 pointer-events-none z-24">
          <div className="w-full h-1 bg-[#2C384D] rounded-full opacity-50" />
          {/* Silver Door Handle Release */}
          <div className="w-12 h-4 rounded-md bg-gradient-to-r from-slate-400 to-slate-200 border border-slate-500 shadow-md" />
          {/* Power Window Switch Console */}
          <div className="w-16 h-8 rounded-lg bg-black/60 border border-neutral-700 p-1 flex gap-1">
            <div className="w-3 h-5 bg-neutral-800 rounded-sm" />
            <div className="w-3 h-5 bg-neutral-800 rounded-sm" />
          </div>
        </div>

        {/* Ceiling Header Trim across top of windshield */}
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#080B11] via-[#10141D] to-transparent pointer-events-none" />

        {/* Left Wing Mirror (Structurally Mounted to Door Base behind A-Pillar) */}
        <div className="absolute left-2 sm:left-6 top-[30%] sm:top-[28%] pointer-events-auto z-23">
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

        {/* Upper Windshield Rear-View Mirror (Positioned in Top-Right Windshield Area, Matching Reference Photo) */}
        <div className="absolute top-3 right-28 sm:right-36 pointer-events-auto flex flex-col items-center z-25">
          {/* Mounting Stem */}
          <div className="w-2.5 h-3.5 bg-gradient-to-b from-[#0B0F19] to-[#1E293B] rounded-t-sm" />
          {/* Mirror Casing */}
          <div className="w-36 sm:w-44 h-11 sm:h-13 rounded-2xl border-3 border-[#1E293B] bg-[#090D16] shadow-[0_10px_30px_rgba(0,0,0,0.7)] overflow-hidden flex items-center justify-center -rotate-2">
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
      {/* LAYER 3: SOLID WALL-TO-WALL DASHBOARD & PHOTOREALISTIC WHEEL/HANDS   */}
      {/* Zero rounded corners at screen edges: completely eliminates cutouts  */}
      {/* ==================================================================== */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none flex flex-col justify-end z-25">
        {/* Solid Automotive Deck: Full Width, Edge to Edge */}
        <div className="relative w-full h-[25vh] sm:h-[27vh] bg-gradient-to-t from-[#080B12] via-[#0E1420] to-[#172030] border-t-4 border-[#2E3B50] shadow-[0_-20px_60px_rgba(0,0,0,0.95)] flex items-center justify-center">

          {/* Double Leather Stitching Highlight Line */}
          <div className="absolute top-2 inset-x-0 border-t border-dashed border-sky-400/25 h-0.5" />

          {/* Left Turbine AC Vent (Matching Reference Photo) */}
          <div className="hidden sm:flex absolute left-32 top-4 w-12 h-12 rounded-full border-2 border-[#334155] bg-gradient-to-b from-[#1E293B] to-[#0A0F1D] shadow-inner items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-neutral-700 bg-[#0F172A] flex items-center justify-center">
              <div className="w-full h-0.5 bg-neutral-600 rotate-45" />
              <div className="w-full h-0.5 bg-neutral-600 -rotate-45" />
            </div>
          </div>

          {/* Center-Right Turbine AC Vents (Matching Reference Photo) */}
          <div className="hidden sm:flex absolute right-24 top-4 gap-3 items-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#334155] bg-gradient-to-b from-[#1E293B] to-[#0A0F1D] shadow-inner flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-neutral-700 bg-[#0F172A] flex items-center justify-center">
                <div className="w-full h-0.5 bg-neutral-600 rotate-45" />
                <div className="w-full h-0.5 bg-neutral-600 -rotate-45" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-[#334155] bg-gradient-to-b from-[#1E293B] to-[#0A0F1D] shadow-inner flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-neutral-700 bg-[#0F172A] flex items-center justify-center">
                <div className="w-full h-0.5 bg-neutral-600 rotate-45" />
                <div className="w-full h-0.5 bg-neutral-600 -rotate-45" />
              </div>
            </div>
          </div>

          {/* Driver Instrument Binnacle Hood Arcing over Steering Wheel */}
          <div className="absolute top-[-18px] sm:top-[-24px] left-1/2 -translate-x-1/2 w-80 sm:w-96 h-12 rounded-t-3xl bg-gradient-to-b from-[#1E293B] to-[#0E1420] border-t-2 border-x-2 border-[#3B4961] shadow-lg" />

          {/* Illuminated Digital Instrument Cluster */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-72 sm:w-88 h-14 sm:h-16 rounded-2xl bg-[#06090F]/95 border border-neutral-800 p-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)] flex items-center justify-around z-26">
            {/* RPM Tachometer Dial */}
            <div className="flex flex-col items-center">
              <div className="relative w-10 sm:w-12 h-10 sm:h-12 rounded-full border border-neutral-700/80 bg-neutral-950 flex items-center justify-center shadow-inner">
                <span className="text-[7px] font-mono text-cyan-400">RPM</span>
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

            {/* Speed Gauge Dial */}
            <div className="flex flex-col items-center">
              <div className="relative w-10 sm:w-12 h-10 sm:h-12 rounded-full border border-neutral-700/80 bg-neutral-950 flex items-center justify-center shadow-inner">
                <span className="text-[7px] font-mono text-red-500">SPD</span>
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

          {/* ============================================================== */}
          {/* PHOTOREALISTIC STEERING WHEEL WITH REAL HUMAN HANDS AT 9 & 3   */}
          {/* Smooth Real-time CSS Rotation (-28° to +28°) on Steering Input  */}
          {/* ============================================================== */}
          <div
            className="absolute bottom-[-14px] sm:bottom-[-20px] left-1/2 w-[340px] sm:w-[440px] md:w-[480px] aspect-square pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-75 select-none z-28"
            style={{
              transform: `translateX(-50%) rotate(${steerAngle}deg)`,
              transformOrigin: '50% 50%',
            }}
            onClick={() => salmanAudio.playHorn()}
            title="Click or Tap to Honk Horn!"
          >
            <img
              src="/game/steering_wheel_hands.png"
              alt="Steering Wheel & Real Hands"
              className="w-full h-full object-contain pointer-events-none drop-shadow-[0_24px_50px_rgba(0,0,0,0.98)]"
            />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LAYER 4: TOP HUD, ARCADE STREAK BANNER & CONTROLS                    */}
      {/* Completely non-conflicting layout with 0 mirror overlap              */}
      {/* ==================================================================== */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-center justify-between z-30 pointer-events-auto">
        {/* Top-Left: Score & Deer Counter */}
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

        {/* Top-Center: Title Badge & Dynamic Streak Ribbon */}
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

        {/* Top-Right: Audio, Gyro & Exit Controls */}
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
