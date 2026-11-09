// ============================================================================
// SALMAN DRIVING SCHOOL - PROCEDURAL WEB AUDIO ENGINE
// 100% Client-Side & Static: zero external audio assets, zero network latency
// ============================================================================

class SalmanAudioEngine {
  private ctx: AudioContext | null = null
  private engineGain: GainNode | null = null
  private engineOsc1: OscillatorNode | null = null
  private engineOsc2: OscillatorNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  private isEngineRunning: boolean = false
  private isMuted: boolean = false
  private bgmAudio: HTMLAudioElement | null = null
  private isBgmPlaying: boolean = false
  private bgmTargetVolume: number = 0.55

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private initBgm(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (!this.bgmAudio) {
      try {
        const audio = new Audio()
        audio.loop = true
        audio.preload = 'auto'
        audio.volume = this.isMuted ? 0 : this.bgmTargetVolume

        // Primary source: /sound/salman-bgm.mp4, fallback: /sound/salman-bgm.m4a
        audio.src = '/sound/salman-bgm.mp4'
        audio.onerror = () => {
          if (audio.src.includes('.mp4')) {
            audio.src = '/sound/salman-bgm.m4a'
            if (this.isBgmPlaying && !this.isMuted) {
              audio.play().catch(() => {})
            }
          }
        }

        this.bgmAudio = audio
      } catch {
        return null
      }
    }
    return this.bgmAudio
  }

  public startBgm() {
    if (typeof window === 'undefined') return
    const audio = this.initBgm()
    if (!audio) return

    this.isBgmPlaying = true
    audio.muted = this.isMuted
    audio.volume = this.isMuted ? 0 : this.bgmTargetVolume

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy: unlock playback on first user gesture
        const unlockAudio = () => {
          if (this.isBgmPlaying && this.bgmAudio) {
            this.bgmAudio.play().catch(() => {})
          }
          window.removeEventListener('pointerdown', unlockAudio)
          window.removeEventListener('keydown', unlockAudio)
        }
        window.addEventListener('pointerdown', unlockAudio, { once: true })
        window.addEventListener('keydown', unlockAudio, { once: true })
      })
    }
  }

  public stopBgm() {
    this.isBgmPlaying = false
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause()
        this.bgmAudio.currentTime = 0
      } catch {}
    }
  }

  public pauseBgm() {
    if (this.bgmAudio && !this.bgmAudio.paused) {
      try {
        this.bgmAudio.pause()
      } catch {}
    }
  }

  public resumeBgm() {
    if (this.isBgmPlaying && this.bgmAudio && this.bgmAudio.paused && !this.isMuted) {
      this.bgmAudio.play().catch(() => {})
    }
  }

  public setBgmVolume(volume: number) {
    this.bgmTargetVolume = Math.max(0, Math.min(1, volume))
    if (this.bgmAudio && !this.isMuted) {
      this.bgmAudio.volume = this.bgmTargetVolume
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted
    if (this.engineGain && this.ctx) {
      const now = this.ctx.currentTime
      this.engineGain.gain.setValueAtTime(muted ? 0 : 0.15, now)
    }
    if (this.bgmAudio) {
      this.bgmAudio.muted = muted
      this.bgmAudio.volume = muted ? 0 : this.bgmTargetVolume
      if (!muted && this.isBgmPlaying && this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {})
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted)
    return this.isMuted
  }

  public getIsMuted(): boolean {
    return this.isMuted
  }

  // --------------------------------------------------------------------------
  // ENGINE SOUND: Continuous pitch-tracked V8 engine rumble
  // --------------------------------------------------------------------------
  public startEngine() {
    this.startBgm()
    if (this.isEngineRunning) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      this.isEngineRunning = true

      // Master engine gain
      this.engineGain = ctx.createGain()
      this.engineGain.gain.setValueAtTime(0.001, now)
      this.engineGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.14, now + 0.3)
      this.engineGain.connect(ctx.destination)

      // Filter for deep automotive rumble
      this.engineFilter = ctx.createBiquadFilter()
      this.engineFilter.type = 'lowpass'
      this.engineFilter.frequency.setValueAtTime(140, now)
      this.engineFilter.Q.setValueAtTime(2.0, now)
      this.engineFilter.connect(this.engineGain)

      // Primary Cylinder Oscillator (Sawtooth)
      this.engineOsc1 = ctx.createOscillator()
      this.engineOsc1.type = 'sawtooth'
      this.engineOsc1.frequency.setValueAtTime(55, now)
      this.engineOsc1.connect(this.engineFilter)
      this.engineOsc1.start(now)

      // Secondary Rumble Oscillator (Triangle / Sub-harmonic)
      this.engineOsc2 = ctx.createOscillator()
      this.engineOsc2.type = 'triangle'
      this.engineOsc2.frequency.setValueAtTime(28, now)
      this.engineOsc2.connect(this.engineFilter)
      this.engineOsc2.start(now)
    } catch {}
  }

  public updateSpeed(speedKmH: number) {
    if (!this.isEngineRunning || !this.ctx) return
    try {
      const now = this.ctx.currentTime
      const clampedSpeed = Math.max(0, Math.min(180, speedKmH))
      const ratio = clampedSpeed / 180

      // Dynamic frequency: 55Hz idle -> 240Hz high speed
      const targetFreq = 55 + ratio * 185
      const filterFreq = 140 + ratio * 480

      if (this.engineOsc1) {
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.08)
      }
      if (this.engineOsc2) {
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08)
      }
      if (this.engineFilter) {
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08)
      }
    } catch {}
  }

  public stopEngine() {
    this.stopBgm()
    if (!this.isEngineRunning) return
    this.isEngineRunning = false
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      if (this.engineGain) {
        this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now)
        this.engineGain.gain.linearRampToValueAtTime(0.0001, now + 0.3)
      }
      setTimeout(() => {
        try {
          this.engineOsc1?.stop()
          this.engineOsc1?.disconnect()
          this.engineOsc2?.stop()
          this.engineOsc2?.disconnect()
          this.engineFilter?.disconnect()
          this.engineGain?.disconnect()
        } catch {}
        this.engineOsc1 = null
        this.engineOsc2 = null
        this.engineFilter = null
        this.engineGain = null
      }, 350)
    } catch {}
  }

  // --------------------------------------------------------------------------
  // COLLISION SOUND: Heavy metal bumper crunch & windshield thud
  // --------------------------------------------------------------------------
  public playHitSound() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // 1. Heavy low-frequency punch
      const subOsc = ctx.createOscillator()
      const subGain = ctx.createGain()
      subOsc.type = 'triangle'
      subOsc.frequency.setValueAtTime(95, now)
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.28)

      subGain.gain.setValueAtTime(0.65, now)
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32)

      subOsc.connect(subGain)
      subGain.connect(ctx.destination)
      subOsc.start(now)
      subOsc.stop(now + 0.35)

      // 2. Visceral metal crunch noise burst
      const bufferSize = ctx.sampleRate * 0.22
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer

      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.setValueAtTime(1100, now)
      noiseFilter.Q.setValueAtTime(3.0, now)

      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.5, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      whiteNoise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(ctx.destination)

      whiteNoise.start(now)
      whiteNoise.stop(now + 0.24)
    } catch {}
  }

  // --------------------------------------------------------------------------
  // ANIMAL SOUND: Startled deer bleat / distress cry
  // --------------------------------------------------------------------------
  public playDeerCrySound() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // Modulated distress vocalization (deer bleat / squeal)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      // Vibrato modulation for animal throat tremor
      const vibrato = ctx.createOscillator()
      const vibratoGain = ctx.createGain()

      vibrato.frequency.setValueAtTime(18, now) // rapid vocal flutter
      vibratoGain.gain.setValueAtTime(35, now)
      vibrato.connect(osc.frequency)

      osc.type = 'sawtooth'
      // Starts high in panic (720Hz), drops sharply (290Hz)
      osc.frequency.setValueAtTime(720, now)
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.42)

      // Formant bandpass shaping for organic nasal bleat
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(950, now)
      filter.Q.setValueAtTime(4.2, now)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.42, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      vibrato.start(now)
      osc.start(now)

      vibrato.stop(now + 0.46)
      osc.stop(now + 0.46)
    } catch {}
  }

  // --------------------------------------------------------------------------
  // TIRE SCREECH: High-speed swerve sound
  // --------------------------------------------------------------------------
  public playTireScreech() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const bufferSize = ctx.sampleRate * 0.28
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(2400, now)
      filter.Q.setValueAtTime(6.0, now)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start(now)
      noise.stop(now + 0.28)
    } catch {}
  }

  // --------------------------------------------------------------------------
  // CAR HORN: Dual-tone fanfare
  // --------------------------------------------------------------------------
  public playHorn() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'triangle'
      osc2.type = 'triangle'
      osc1.frequency.setValueAtTime(415, now) // G#4
      osc2.frequency.setValueAtTime(510, now) // C5

      gain.gain.setValueAtTime(0.35, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.4)
      osc2.stop(now + 0.4)
    } catch {}
  }

  // --------------------------------------------------------------------------
  // GOLDEN APPLE DISCOVERY CHIME: Pentatonic harp glissando
  // --------------------------------------------------------------------------
  public playGoldenAppleChime() {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51] // C5, E5, G5, C6, E6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.07)

        gain.gain.setValueAtTime(0.001, now + idx * 0.07)
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.07 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.6)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + idx * 0.07)
        osc.stop(now + idx * 0.07 + 0.65)
      })
    } catch {}
  }

  // --------------------------------------------------------------------------
  // SALMAN KHAN TURQUOISE KEYCHAIN CHIME: Sterling silver link clink
  // --------------------------------------------------------------------------
  public playKeychainChime() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const harmonics = [2180, 3420, 5140, 6890]
      harmonics.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq + (Math.random() * 80 - 40), now + i * 0.015)

        gain.gain.setValueAtTime(0.09 / (i + 1), now + i * 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.015 + 0.28)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + i * 0.015)
        osc.stop(now + i * 0.015 + 0.3)
      })
    } catch {}
  }

  // --------------------------------------------------------------------------
  // ENGINE PUSH-TO-START REV: Starter crank & aggressive V8 throttle blip
  // --------------------------------------------------------------------------
  public playStarterRev() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // Starter electric whine
      const starter = ctx.createOscillator()
      const starterGain = ctx.createGain()
      starter.type = 'sawtooth'
      starter.frequency.setValueAtTime(160, now)
      starter.frequency.exponentialRampToValueAtTime(320, now + 0.25)
      starterGain.gain.setValueAtTime(0.18, now)
      starterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      starter.connect(starterGain)
      starterGain.connect(ctx.destination)
      starter.start(now)
      starter.stop(now + 0.32)

      // V8 Throttle Blip
      const v8 = ctx.createOscillator()
      const v8Gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      v8.type = 'sawtooth'
      v8.frequency.setValueAtTime(75, now + 0.2)
      v8.frequency.exponentialRampToValueAtTime(260, now + 0.5)
      v8.frequency.exponentialRampToValueAtTime(110, now + 0.95)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(380, now + 0.2)
      filter.frequency.linearRampToValueAtTime(950, now + 0.5)
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.95)

      v8Gain.gain.setValueAtTime(0.001, now + 0.2)
      v8Gain.gain.linearRampToValueAtTime(0.38, now + 0.42)
      v8Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)

      v8.connect(filter)
      filter.connect(v8Gain)
      v8Gain.connect(ctx.destination)
      v8.start(now + 0.2)
      v8.stop(now + 1.05)
    } catch {}
  }

  // --------------------------------------------------------------------------
  // HAZARD WARNING RELAY CLICK: Realistic automotive flasher tick
  // --------------------------------------------------------------------------
  public playHazardClick() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(980, now)
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.025)

      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.035)
    } catch {}
  }
}

export const salmanAudio = new SalmanAudioEngine()
