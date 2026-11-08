'use client'

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
  Sparkles,
  Zap,
} from 'lucide-react'

interface SalmanDrivingGameProps {
  isOpen: boolean
  onClose: () => void
}

interface Deer {
  id: number
  x: number // -1 (far left guardrail) to 1 (far right guardrail)
  z: number // 0 (at horizon) to 1 (at car bumper)
  speedZ: number // forward speed relative to player
  crossingSpeedX: number // lateral speed crossing road
  species: 'buck' | 'doe' | 'stag'
  isHit: boolean
  tumbleAngle: number
  tumbleVelocityX: number
  tumbleVelocityY: number
}

interface FloatingScore {
  id: number
  x: number
  y: number
  text: string
  opacity: number
}

export function SalmanDrivingGame({ isOpen, onClose }: SalmanDrivingGameProps) {
  const [mounted, setMounted] = useState(false)
  const [score, setScore] = useState(0)
  const [deersHit, setDeersHit] = useState(0)
  const [combo, setCombo] = useState(1)
  const [speedKmH, setSpeedKmH] = useState(110)
  const [distanceM, setDistanceM] = useState(0)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [steerAngle, setSteerAngle] = useState(0) // Visual wheel angle in degrees
  const [isScreenShaking, setIsScreenShaking] = useState(false)
  const [windshieldCracks, setWindshieldCracks] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([])
  const [showExitScorecard, setShowExitScorecard] = useState(false)
  const [gyroActive, setGyroActive] = useState(false)
  const [gyroSupported, setGyroSupported] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Mutable Game Physics State
  const gameState = useRef({
    playerX: 0, // -0.85 (left lane) to 0.85 (right lane)
    playerSpeed: 1.8, // Base speed factor
    targetSteer: 0,
    currentSteer: 0,
    curveOffset: 0,
    curveTarget: 0,
    curveTimer: 0,
    deers: [] as Deer[],
    nextDeerId: 1,
    spawnTimer: 0,
    keys: { left: false, right: false, up: false, down: false },
    touchGas: false,
    touchBrake: false,
    distanceAccum: 0,
    comboStreak: 0,
    comboTimer: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check gyroscope availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setGyroSupported(true)
    }
  }, [])

  // Audio lifecycle
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

  // Gyroscope tilt listener
  useEffect(() => {
    if (!isOpen || !gyroActive) return

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null) return
      // Gamma is phone left/right tilt in degrees (-90 to +90)
      // Normal driving tilt: -28° (left) to +28° (right)
      const clamped = Math.max(-28, Math.min(28, e.gamma))
      const norm = clamped / 28
      gameState.current.targetSteer = norm
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [isOpen, gyroActive])

  // Request Gyroscope Permission (especially required for iOS Safari)
  const enableGyro = useCallback(async () => {
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
      } catch {}
    } else {
      setGyroActive(true)
    }
  }, [])

  // Keyboard controls listener
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

  // Trigger collision sensory feedback
  const triggerHitFeedback = useCallback((deer: Deer) => {
    // 1. Mobile Haptic Vibration
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 50, 240])
      } catch {}
    }

    // 2. Audio Engine SFX
    salmanAudio.playHitSound()
    setTimeout(() => {
      salmanAudio.playDeerCrySound()
    }, 45)

    // 3. Screen Camera Shudder
    setIsScreenShaking(true)
    setTimeout(() => setIsScreenShaking(false), 380)

    // 4. Windshield Crack Decal
    const crackX = 40 + Math.random() * 20
    const crackY = 30 + Math.random() * 20
    const crackId = Date.now() + Math.random()
    setWindshieldCracks((prev) => [...prev.slice(-4), { id: crackId, x: crackX, y: crackY }])
    setTimeout(() => {
      setWindshieldCracks((prev) => prev.filter((c) => c.id !== crackId))
    }, 4500)

    // 5. Score increment and floating text
    const basePts = deer.species === 'stag' ? 300 : deer.species === 'buck' ? 150 : 100
    const currentCombo = gameState.current.comboStreak + 1
    gameState.current.comboStreak = currentCombo
    gameState.current.comboTimer = 180 // ~3 seconds of combo window

    const pts = basePts * currentCombo
    setScore((prev) => prev + pts)
    setDeersHit((prev) => prev + 1)
    setCombo(currentCombo)

    const scoreId = Date.now() + Math.random()
    const floatX = 45 + (deer.x * 25)
    setFloatingScores((prev) => [
      ...prev,
      {
        id: scoreId,
        x: floatX,
        y: 42,
        text: currentCombo > 1 ? `+${pts} (${currentCombo}X COMBO!)` : `+${pts}`,
        opacity: 1,
      },
    ])
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((s) => s.id !== scoreId))
    }, 1100)
  }, [])

  // Main 60 FPS Infinite Driving Game Loop
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
        if (g.keys.left) g.targetSteer = -1
        else if (g.keys.right) g.targetSteer = 1
        else g.targetSteer = 0
      }

      // Smooth steering damping
      g.currentSteer += (g.targetSteer - g.currentSteer) * 0.16
      const steerDegrees = g.currentSteer * 28 // Max 28 degree wheel rotation
      setSteerAngle(steerDegrees)

      // Speed physics (Gas / Brake)
      const isAccelerating = g.keys.up || g.touchGas
      const isBraking = g.keys.down || g.touchBrake

      if (isAccelerating) {
        g.playerSpeed = Math.min(2.8, g.playerSpeed + 0.02)
      } else if (isBraking) {
        g.playerSpeed = Math.max(0.7, g.playerSpeed - 0.04)
      } else {
        // Natural cruising decay toward 1.8
        g.playerSpeed += (1.8 - g.playerSpeed) * 0.02
      }

      const currentKmH = Math.round(g.playerSpeed * 65)
      setSpeedKmH(currentKmH)
      salmanAudio.updateSpeed(currentKmH)

      // Update distance traveled
      g.distanceAccum += g.playerSpeed * 0.55
      setDistanceM(Math.floor(g.distanceAccum))

      // Move player lateral position on road
      g.playerX += g.currentSteer * (g.playerSpeed * 0.015)
      // Clamp player within road guardrails (-0.88 to +0.88)
      g.playerX = Math.max(-0.88, Math.min(0.88, g.playerX))

      // Road Curvature Dynamics
      g.curveTimer++
      if (g.curveTimer > 240) {
        g.curveTimer = 0
        g.curveTarget = (Math.random() - 0.5) * 1.4 // New gentle curve
      }
      g.curveOffset += (g.curveTarget - g.curveOffset) * 0.012

      // Combo Decay Timer
      if (g.comboTimer > 0) {
        g.comboTimer--
        if (g.comboTimer === 0) {
          g.comboStreak = 0
          setCombo(1)
        }
      }

      // Tire screech on hard turns at high speed
      if (Math.abs(g.currentSteer) > 0.85 && g.playerSpeed > 2.0 && Math.random() < 0.08) {
        salmanAudio.playTireScreech()
      }

      // -------------------------------------------------------------
      // 2. Road Canvas Graphics Rendering
      // -------------------------------------------------------------
      ctx.clearRect(0, 0, width, height)

      // Horizon line is located at 42% height of the screen
      const horizonY = height * 0.42
      const roadBottomWidth = width * 1.5
      const roadTopWidth = width * 0.08

      // A. Sky & Distant Mountain Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
      skyGrad.addColorStop(0, '#020617')
      skyGrad.addColorStop(0.65, '#0B1329')
      skyGrad.addColorStop(1, '#1A2744')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, width, horizonY)

      // Stars in the night sky
      ctx.fillStyle = '#FFFFFF'
      for (let i = 0; i < 28; i++) {
        const starX = (i * 137.5) % width
        const starY = (i * 47.3) % (horizonY * 0.75)
        ctx.fillRect(starX, starY, 1.2, 1.2)
      }

      // Distant mountain silhouettes
      ctx.fillStyle = '#060B18'
      ctx.beginPath()
      ctx.moveTo(0, horizonY)
      ctx.lineTo(width * 0.15, horizonY - 35)
      ctx.lineTo(width * 0.35, horizonY - 18)
      ctx.lineTo(width * 0.55, horizonY - 45)
      ctx.lineTo(width * 0.8, horizonY - 22)
      ctx.lineTo(width, horizonY - 38)
      ctx.lineTo(width, horizonY)
      ctx.closePath()
      ctx.fill()

      // B. Ground / Forest Grass Flanks
      const grassGrad = ctx.createLinearGradient(0, horizonY, 0, height)
      grassGrad.addColorStop(0, '#062B17')
      grassGrad.addColorStop(1, '#02120A')
      ctx.fillStyle = grassGrad
      ctx.fillRect(0, horizonY, width, height - horizonY)

      // C. Curving Asphalt Highway Surface
      const centerBottomX = width * 0.5 - g.playerX * (width * 0.45)
      const centerTopX = width * 0.5 + g.curveOffset * (width * 0.25)

      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.5, horizonY)
      ctx.lineTo(centerTopX + roadTopWidth * 0.5, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.5, height)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.5, height)
      ctx.closePath()

      // Asphalt texture gradient illuminated by headlights
      const asphaltGrad = ctx.createLinearGradient(0, horizonY, 0, height)
      asphaltGrad.addColorStop(0, '#1E2430')
      asphaltGrad.addColorStop(0.5, '#2D3748')
      asphaltGrad.addColorStop(1, '#3A4556')
      ctx.fillStyle = asphaltGrad
      ctx.fill()

      // Metal Guardrails on Highway Edges
      ctx.lineWidth = 3
      ctx.strokeStyle = '#94A3B8'
      // Left Guardrail
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.5, horizonY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.5, height)
      ctx.stroke()
      // Right Guardrail
      ctx.beginPath()
      ctx.moveTo(centerTopX + roadTopWidth * 0.5, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.5, height)
      ctx.stroke()

      // Yellow Shoulder Lines
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#FACC15'
      ctx.beginPath()
      ctx.moveTo(centerTopX - roadTopWidth * 0.46, horizonY)
      ctx.lineTo(centerBottomX - roadBottomWidth * 0.46, height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerTopX + roadTopWidth * 0.46, horizonY)
      ctx.lineTo(centerBottomX + roadBottomWidth * 0.46, height)
      ctx.stroke()

      // D. Animated Dashed White Center Lane Dividers
      roadStripeOffset = (roadStripeOffset + g.playerSpeed * 0.12) % 1
      const numStripes = 14
      for (let s = 0; s < numStripes; s++) {
        const p1 = (s + roadStripeOffset) / numStripes
        const p2 = (s + 0.45 + roadStripeOffset) / numStripes
        if (p1 > 1) continue

        // Perspective exponential curve (stripes get longer as they near bumper)
        const z1 = Math.pow(p1, 2.2)
        const z2 = Math.pow(Math.min(1, p2), 2.2)

        const sy1 = horizonY + z1 * (height - horizonY)
        const sy2 = horizonY + z2 * (height - horizonY)

        const sx1 = centerTopX + (centerBottomX - centerTopX) * z1
        const sx2 = centerTopX + (centerBottomX - centerTopX) * z2

        const stripeWidth = 2 + z2 * 12

        ctx.strokeStyle = '#F8FAFC'
        ctx.lineWidth = stripeWidth
        ctx.beginPath()
        ctx.moveTo(sx1, sy1)
        ctx.lineTo(sx2, sy2)
        ctx.stroke()
      }

      // E. Headlight Beam Cones
      const lightGrad = ctx.createRadialGradient(
        centerBottomX,
        height * 0.95,
        20,
        centerBottomX,
        height * 0.7,
        width * 0.65
      )
      lightGrad.addColorStop(0, 'rgba(255, 255, 230, 0.28)')
      lightGrad.addColorStop(0.6, 'rgba(255, 255, 200, 0.12)')
      lightGrad.addColorStop(1, 'rgba(255, 255, 200, 0)')
      ctx.fillStyle = lightGrad
      ctx.beginPath()
      ctx.moveTo(centerBottomX - width * 0.15, height)
      ctx.lineTo(centerTopX - roadTopWidth * 0.6, horizonY)
      ctx.lineTo(centerTopX + roadTopWidth * 0.6, horizonY)
      ctx.lineTo(centerBottomX + width * 0.15, height)
      ctx.closePath()
      ctx.fill()

      // -------------------------------------------------------------
      // 3. Crossing Deer Entity Physics & Rendering
      // -------------------------------------------------------------
      // Spawn new deers periodically
      g.spawnTimer++
      if (g.spawnTimer > 75) {
        g.spawnTimer = 0
        const fromLeft = Math.random() > 0.5
        const randSpecies = Math.random()
        const species: Deer['species'] = randSpecies < 0.15 ? 'stag' : randSpecies < 0.55 ? 'buck' : 'doe'

        g.deers.push({
          id: g.nextDeerId++,
          x: fromLeft ? -1.1 : 1.1, // Start off-road
          z: 0.05, // Spawn near horizon
          speedZ: 0.008 * g.playerSpeed,
          crossingSpeedX: (fromLeft ? 1 : -1) * (0.012 + Math.random() * 0.008),
          species,
          isHit: false,
          tumbleAngle: 0,
          tumbleVelocityX: (Math.random() - 0.5) * 8,
          tumbleVelocityY: -10 - Math.random() * 6,
        })
      }

      // Update and draw deers
      for (let i = g.deers.length - 1; i >= 0; i--) {
        const d = g.deers[i]

        if (!d.isHit) {
          d.z += d.speedZ
          d.x += d.crossingSpeedX

          // Collision Check with Player Bumper
          // Player covers approx [-0.35, +0.35] relative width at z > 0.82
          const playerRelativeX = g.playerX
          const xDist = Math.abs(d.x - playerRelativeX)

          if (d.z >= 0.82 && d.z <= 0.98 && xDist < 0.28) {
            d.isHit = true
            triggerHitFeedback(d)
          }
        } else {
          // Tumble physics after hit
          d.x += d.tumbleVelocityX * 0.015
          d.z += 0.02
          d.tumbleAngle += 0.25
        }

        // Remove deers that passed the bumper or flew off
        if (d.z > 1.25 || d.x < -1.8 || d.x > 1.8) {
          g.deers.splice(i, 1)
          continue
        }

        // Perspective screen coordinates
        const deerZScale = Math.pow(d.z, 2.0)
        const deerY = horizonY + deerZScale * (height - horizonY)
        const roadCenterXAtZ = centerTopX + (centerBottomX - centerTopX) * deerZScale
        const roadWidthAtZ = roadTopWidth + (roadBottomWidth - roadTopWidth) * deerZScale
        const deerX = roadCenterXAtZ + (d.x * roadWidthAtZ * 0.45)

        // Draw Deer Sprite with Perspective Scale
        const scale = 0.15 + deerZScale * 1.05
        const deerW = 64 * scale
        const deerH = 58 * scale

        ctx.save()
        ctx.translate(deerX, deerY)
        if (d.isHit) {
          ctx.rotate(d.tumbleAngle)
        }

        // Deer Body Color
        const bodyColor = d.species === 'stag' ? '#F59E0B' : d.species === 'buck' ? '#92400E' : '#B45309'
        ctx.fillStyle = bodyColor

        // Torso
        ctx.beginPath()
        ctx.ellipse(0, -deerH * 0.5, deerW * 0.42, deerH * 0.26, 0, 0, Math.PI * 2)
        ctx.fill()

        // Neck & Head
        ctx.beginPath()
        const headDir = d.crossingSpeedX > 0 ? 1 : -1
        ctx.ellipse(headDir * deerW * 0.32, -deerH * 0.8, deerW * 0.16, deerH * 0.2, 0.3 * headDir, 0, Math.PI * 2)
        ctx.fill()

        // White Tail & Muzzle highlight
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(-headDir * deerW * 0.4, -deerH * 0.58, deerW * 0.08, 0, Math.PI * 2)
        ctx.fill()

        // Antlers for Buck and Stag
        if (d.species === 'buck' || d.species === 'stag') {
          ctx.strokeStyle = d.species === 'stag' ? '#FDE047' : '#D97706'
          ctx.lineWidth = Math.max(1.2, 2.5 * scale)
          ctx.beginPath()
          const antlerBaseX = headDir * deerW * 0.34
          const antlerBaseY = -deerH * 0.95
          // Left antler
          ctx.moveTo(antlerBaseX, antlerBaseY)
          ctx.lineTo(antlerBaseX - 8 * scale, antlerBaseY - 14 * scale)
          ctx.lineTo(antlerBaseX - 14 * scale, antlerBaseY - 18 * scale)
          // Right antler
          ctx.moveTo(antlerBaseX, antlerBaseY)
          ctx.lineTo(antlerBaseX + 8 * scale, antlerBaseY - 14 * scale)
          ctx.lineTo(antlerBaseX + 14 * scale, antlerBaseY - 18 * scale)
          ctx.stroke()
        }

        // Running Legs
        ctx.strokeStyle = bodyColor
        ctx.lineWidth = Math.max(1.5, 3 * scale)
        const legRunCycle = Math.sin(Date.now() * 0.018 + d.id) * 12 * scale
        ctx.beginPath()
        // Front leg
        ctx.moveTo(deerW * 0.22, -deerH * 0.3)
        ctx.lineTo(deerW * 0.28 + legRunCycle, 0)
        // Back leg
        ctx.moveTo(-deerW * 0.22, -deerH * 0.3)
        ctx.lineTo(-deerW * 0.28 - legRunCycle, 0)
        ctx.stroke()

        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    // Set canvas dimensions
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
      {/* LAYER 1: 3D/2.5D CANVAS ROAD & DEER ENGINE                           */}
      {/* ==================================================================== */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* ==================================================================== */}
      {/* LAYER 2 & 3: COCKPIT FRAME, DASHBOARD & STEERING WHEEL WITH DUAL HANDS*/}
      {/* Replicating the exact POV from the user's reference photo            */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end">
        {/* Windshield Radial Vignette & Glass Header Tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent pointer-events-none" />

        {/* Top-Right Rear-View Mirror */}
        <div className="absolute top-4 right-8 sm:right-24 w-36 sm:w-52 h-14 sm:h-18 rounded-2xl border-4 border-[#1E293B] bg-[#0A101D] shadow-[0_8px_30px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center pointer-events-auto">
          <div className="relative w-full h-full bg-gradient-to-t from-[#1E293B] to-[#0A101D] flex items-center justify-center">
            {/* Mirrored Receding Highway Lines */}
            <div className="w-1.5 h-full bg-white/40 rotate-12" />
            <div className="w-1.5 h-full bg-white/40 -rotate-12" />
            <div className="absolute bottom-1 text-[9px] font-mono text-neutral-400">REAR VIEW</div>
          </div>
        </div>

        {/* Left Side Wing Mirror */}
        <div className="absolute left-2 sm:left-6 top-[34%] sm:top-[30%] w-24 sm:w-36 h-16 sm:h-24 rounded-2xl border-4 border-[#1E293B] bg-[#0F172A] shadow-2xl overflow-hidden -rotate-6 pointer-events-auto">
          <div className="w-full h-full bg-gradient-to-r from-[#0F172A] to-[#1E293B] flex items-center justify-center">
            <div className="h-0.5 w-full bg-amber-400/80 -rotate-12" />
            <span className="absolute bottom-1 left-2 text-[8px] font-mono text-neutral-400">SIDE MIRROR</span>
          </div>
        </div>

        {/* Dynamic Windshield Crack Decals on Impact */}
        {windshieldCracks.map((crack) => (
          <div
            key={crack.id}
            style={{ left: `${crack.x}%`, top: `${crack.y}%` }}
            className="absolute w-28 h-28 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-50 duration-150"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" fill="none">
              <path d="M 50 50 L 30 20 M 50 50 L 75 15 M 50 50 L 85 60 M 50 50 L 60 85 M 50 50 L 25 75 M 50 50 L 15 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="2" fill="rgba(255,255,255,0.3)" />
            </svg>
          </div>
        ))}

        {/* Floating Golden Score Floaters */}
        {floatingScores.map((fs) => (
          <div
            key={fs.id}
            style={{ left: `${fs.x}%`, top: `${fs.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 font-mono font-black text-xl sm:text-2xl text-amber-400 drop-shadow-[0_0_12px_#F59E0B] pointer-events-none animate-in fade-in slide-in-from-bottom-6 duration-300"
          >
            {fs.text}
          </div>
        ))}

        {/* Dashboard Surface (Dark Textured Interior Cockpit) */}
        <div className="relative w-full h-[44vh] sm:h-[48vh] bg-gradient-to-t from-[#0B0F19] via-[#111827] to-[#1E293B]/90 rounded-t-[50px] sm:rounded-t-[80px] border-t-4 border-[#334155] shadow-[0_-20px_60px_rgba(0,0,0,0.85)] flex items-center justify-center">

          {/* Instrument Cluster Dial (Behind Steering Wheel) */}
          <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-28 sm:h-32 rounded-2xl bg-black/90 border border-neutral-800 p-3 shadow-inner flex items-center justify-around">
            {/* RPM Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center">
                <span className="text-[10px] font-mono text-cyan-400">RPM</span>
                <div
                  className="absolute w-0.5 h-7 bg-cyan-400 origin-bottom"
                  style={{
                    transform: `rotate(${Math.min(140, (speedKmH / 180) * 140 - 70)}deg)`,
                    bottom: '50%',
                  }}
                />
              </div>
              <span className="text-[9px] font-mono text-neutral-400 mt-1">x1000</span>
            </div>

            {/* Digital Speedometer Center Display */}
            <div className="flex flex-col items-center justify-center px-4">
              <span className="text-3xl sm:text-4xl font-mono font-black text-amber-400 tracking-wider drop-shadow-[0_0_10px_#F59E0B]">
                {speedKmH}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                KM / H
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <Zap className="h-3 w-3" />
                <span>{distanceM} M</span>
              </div>
            </div>

            {/* Fuel / Temp Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center">
                <span className="text-[10px] font-mono text-red-500">SPEED</span>
                <div
                  className="absolute w-0.5 h-7 bg-red-500 origin-bottom"
                  style={{
                    transform: `rotate(${Math.min(140, (speedKmH / 180) * 140 - 70)}deg)`,
                    bottom: '50%',
                  }}
                />
              </div>
              <span className="text-[9px] font-mono text-neutral-400 mt-1">ANALOG</span>
            </div>
          </div>

          {/* Steering Wheel with Two Human Hands Gripping (Rotates with Steer Input) */}
          <div
            className="absolute bottom-[-15px] sm:bottom-[-25px] left-1/2 w-[340px] sm:w-[460px] h-[340px] sm:h-[460px] pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-75"
            style={{
              transform: `translateX(-50%) rotate(${steerAngle}deg)`,
              transformOrigin: '50% 60%',
            }}
            onClick={() => salmanAudio.playHorn()}
            title="Click to Honk Horn!"
          >
            <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_18px_35px_rgba(0,0,0,0.9)]" fill="none">
              <defs>
                <linearGradient id="leather-rim" x1="50" y1="50" x2="350" y2="350" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2A303C" />
                  <stop offset="50%" stopColor="#151A24" />
                  <stop offset="100%" stopColor="#0B0D13" />
                </linearGradient>
                <linearGradient id="hand-skin-grad" x1="0" y1="200" x2="200" y2="400" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F5D0C5" />
                  <stop offset="50%" stopColor="#E09F88" />
                  <stop offset="100%" stopColor="#B36650" />
                </linearGradient>
                <linearGradient id="metal-spoke" x1="150" y1="180" x2="250" y2="280" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="50%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
              </defs>

              {/* Outer Steering Rim */}
              <circle cx="200" cy="200" r="150" stroke="url(#leather-rim)" strokeWidth="32" />
              {/* Inner Rim Highlight */}
              <circle cx="200" cy="200" r="134" stroke="#475569" strokeWidth="2.5" opacity="0.6" />

              {/* Metallic Spokes */}
              {/* Left horizontal spoke */}
              <path d="M 60 200 L 150 200 L 150 230 L 60 220 Z" fill="url(#metal-spoke)" />
              {/* Right horizontal spoke */}
              <path d="M 340 200 L 250 200 L 250 230 L 340 220 Z" fill="url(#metal-spoke)" />
              {/* Center bottom vertical spoke */}
              <path d="M 185 240 L 215 240 L 210 330 L 190 330 Z" fill="url(#metal-spoke)" />

              {/* Center Airbag Hub */}
              <rect x="145" y="160" width="110" height="90" rx="24" fill="#111827" stroke="#334155" strokeWidth="3" />
              <ellipse cx="200" cy="205" rx="22" ry="14" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
              <text x="200" y="209" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">
                SALMAN
              </text>

              {/* LEFT DRIVER HAND (Gripping at 9 o'clock) */}
              <g id="left-hand">
                {/* Arm / Wrist entering from bottom left */}
                <path d="M 0 380 C 20 340, 45 250, 56 210 L 86 215 C 80 270, 50 360, 30 400 Z" fill="url(#hand-skin-grad)" />
                {/* Clenched Fingers Wrapping Rim */}
                <rect x="44" y="178" width="28" height="15" rx="6" fill="#F0C2B4" stroke="#8D4C3A" strokeWidth="1" />
                <rect x="42" y="193" width="30" height="15" rx="6" fill="#E8B5A7" stroke="#8D4C3A" strokeWidth="1" />
                <rect x="44" y="208" width="28" height="15" rx="6" fill="#DE9F90" stroke="#8D4C3A" strokeWidth="1" />
                <rect x="48" y="223" width="24" height="14" rx="6" fill="#D48E7E" stroke="#8D4C3A" strokeWidth="1" />
                {/* Thumb resting along inner spoke */}
                <ellipse cx="78" cy="192" rx="14" ry="8" fill="#F0C2B4" transform="rotate(-35 78 192)" stroke="#8D4C3A" strokeWidth="1" />
              </g>

              {/* RIGHT DRIVER HAND (Gripping at 3 o'clock) */}
              <g id="right-hand">
                {/* Arm / Wrist entering from bottom right */}
                <path d="M 400 380 C 380 340, 355 250, 344 210 L 314 215 C 320 270, 350 360, 370 400 Z" fill="url(#hand-skin-grad)" />
                {/* Clenched Fingers Wrapping Rim */}
                <rect x="328" y="178" width="28" height="15" rx="6" fill="#F0C2B4" stroke="#8D4C3A" strokeWidth="1" />
                <rect x="328" y="193" width="30" height="15" rx="6" fill="#E8B5A7" stroke="#8D4C3A" strokeWidth="1" />
                <rect x="328" y="208" width="28" height="15" rx="6" fill="#DE9F90" stroke="#8D4C3A" strokeWidth="1" />
                <rect x="328" y="223" width="24" height="14" rx="6" fill="#D48E7E" stroke="#8D4C3A" strokeWidth="1" />
                {/* Thumb resting along inner spoke */}
                <ellipse cx="322" cy="192" rx="14" ry="8" fill="#F0C2B4" transform="rotate(35 322 192)" stroke="#8D4C3A" strokeWidth="1" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LAYER 4: TOP HUD, CONTROLS & SCORE COUNTER                          */}
      {/* ==================================================================== */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-center justify-between z-30 pointer-events-auto">
        {/* Score & Deer Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-black/75 backdrop-blur-md border border-neutral-700/80 rounded-2xl px-3.5 py-2 flex items-center gap-3 text-white shadow-xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">DEERS HIT</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-red-500">{deersHit}</span>
            </div>
            <div className="h-7 w-px bg-neutral-700" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">SCORE</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-400">{score}</span>
            </div>
            {combo > 1 && (
              <span className="bg-gradient-to-r from-red-600 to-amber-600 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold animate-pulse">
                {combo}X STREAK
              </span>
            )}
          </div>
        </div>

        {/* Title Badge */}
        <div className="hidden md:flex flex-col items-center bg-black/60 backdrop-blur-sm border border-neutral-700 px-4 py-1.5 rounded-full">
          <span className="text-xs font-mono font-extrabold tracking-[0.25em] text-white">
            SALMAN DRIVING SCHOOL
          </span>
          <span className="text-[9px] font-mono text-neutral-400">INFINITE NOCTURNAL HIGHWAY</span>
        </div>

        {/* Audio, Gyro & Exit Controls */}
        <div className="flex items-center gap-2">
          {gyroSupported && (
            <button
              onClick={() => {
                if (!gyroActive) enableGyro()
                else setGyroActive(false)
              }}
              className={`h-9 px-3 rounded-full border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                gyroActive
                  ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_12px_#059669]'
                  : 'bg-black/60 border-neutral-700 text-neutral-300 hover:text-white'
              }`}
              title="Toggle Gyroscope Steering"
            >
              <Compass className={`h-3.5 w-3.5 ${gyroActive ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              <span>{gyroActive ? 'Gyro ON' : 'Gyro OFF'}</span>
            </button>
          )}

          <button
            onClick={() => {
              const muted = salmanAudio.toggleMute()
              setIsAudioMuted(muted)
            }}
            className="h-9 w-9 rounded-full border border-neutral-700 bg-black/60 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-neutral-800 transition-colors"
            title="Toggle Engine & Sound SFX"
          >
            {isAudioMuted ? <VolumeX className="h-4 w-4 text-neutral-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => setShowExitScorecard(true)}
            className="h-9 px-3.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <X className="h-3.5 w-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Mobile On-Screen Touch Controls (Gas & Brake Pedals + Steer) */}
      <div className="sm:hidden absolute bottom-4 inset-x-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Brake Pedal (Left Thumb) */}
        <button
          onTouchStart={() => (gameState.current.touchBrake = true)}
          onTouchEnd={() => (gameState.current.touchBrake = false)}
          onMouseDown={() => (gameState.current.touchBrake = true)}
          onMouseUp={() => (gameState.current.touchBrake = false)}
          className="pointer-events-auto h-16 w-20 rounded-2xl border-2 border-red-500/80 bg-red-950/80 active:bg-red-600 text-white font-mono font-bold text-xs flex flex-col items-center justify-center shadow-2xl active:scale-95"
        >
          <span>BRAKE</span>
        </button>

        {/* Gas Pedal (Right Thumb) */}
        <button
          onTouchStart={() => (gameState.current.touchGas = true)}
          onTouchEnd={() => (gameState.current.touchGas = false)}
          onMouseDown={() => (gameState.current.touchGas = true)}
          onMouseUp={() => (gameState.current.touchGas = false)}
          className="pointer-events-auto h-20 w-22 rounded-2xl border-2 border-emerald-500/80 bg-emerald-950/80 active:bg-emerald-600 text-white font-mono font-bold text-sm flex flex-col items-center justify-center shadow-2xl active:scale-95"
        >
          <span>GAS</span>
          <span className="text-[10px] text-emerald-300">BOOST</span>
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
