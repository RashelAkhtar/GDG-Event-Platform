'use client'

/**
 * Universal Game Sound Engine
 * Provides dual-layer playback:
 * 1. Web Audio API synthesized tones (zero network delay, instant feedback, no 404s)
 * 2. Static audio element preloaded fallback (/sound/*.wav)
 * 3. Mobile Web Audio auto-unlocking for iOS Safari & Android Chrome
 */
class SoundEngine {
  private ctx: AudioContext | null = null
  private muted = false
  private isUnlocked = false
  private audioElements: Record<string, HTMLAudioElement> = {}
  private listeners: Set<(unlocked: boolean, muted: boolean) => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto-unlock on the very first user interaction anywhere on the screen
      const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click']
      const autoUnlockHandler = () => {
        void this.unlock()
      }

      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, autoUnlockHandler, { capture: true, passive: true })
      })

      // Read initial mute preference from localStorage if available
      try {
        const savedMute = localStorage.getItem('gdg_sound_muted')
        if (savedMute !== null) {
          this.muted = savedMute === 'true'
        }
      } catch {}
    }
  }

  /**
   * Lazily initialize AudioContext with cross-browser prefixes
   */
  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    return this.ctx
  }

  /**
   * Physically unlock the mobile audio pipeline on iOS / Android.
   * Requires execution during a user gesture event stack.
   */
  public async unlock(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      const ctx = this.getAudioContext()
      if (ctx) {
        if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
          await ctx.resume()
        }

        // Play 1-sample silent buffer to activate the audio hardware output stream on iOS
        const buffer = ctx.createBuffer(1, 1, 22050)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.start(0)
      }

      // Pre-warm HTML5 audio element cache
      this.primeAudioElements()

      this.isUnlocked = true
      this.notifyListeners()
      return true
    } catch {
      return false
    }
  }

  /**
   * Preload HTML5 audio tags for reliable dual-layer playback
   */
  private primeAudioElements() {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return

    const soundKeys = ['quiz-option', 'wend-correct', 'winner', 'countdown-tick']
    soundKeys.forEach((key) => {
      if (!this.audioElements[key]) {
        try {
          const audio = new Audio(`/sound/${key}.wav`)
          audio.preload = 'auto'
          audio.volume = 0.4
          this.audioElements[key] = audio
        } catch {}
      }
    })
  }

  /**
   * Fallback to HTML5 audio element
   */
  private playHtml5Fallback(key: string, volume = 0.4) {
    if (typeof window === 'undefined' || this.muted) return
    try {
      let audio = this.audioElements[key]
      if (!audio && typeof Audio !== 'undefined') {
        audio = new Audio(`/sound/${key}.wav`)
        audio.preload = 'auto'
        this.audioElements[key] = audio
      }
      if (audio) {
        audio.volume = volume
        audio.currentTime = 0
        const p = audio.play()
        if (p && typeof p.then === 'function') {
          p.catch(() => {})
        }
      }
    } catch {}
  }

  /**
   * Robust Web Audio synth executor with suspended-state auto-resume and HTML5 fallback
   */
  private playSynth(
    renderFn: (ctx: AudioContext) => void,
    fallbackKey?: string,
    fallbackVolume?: number
  ) {
    if (this.muted) return

    try {
      const ctx = this.getAudioContext()
      if (ctx) {
        if (ctx.state === 'running') {
          renderFn(ctx)
          return
        }

        // Context is suspended or interrupted — attempt async resume
        ctx.resume()
          .then(() => {
            if (ctx.state === 'running') {
              renderFn(ctx)
            } else if (fallbackKey) {
              this.playHtml5Fallback(fallbackKey, fallbackVolume)
            }
          })
          .catch(() => {
            if (fallbackKey) {
              this.playHtml5Fallback(fallbackKey, fallbackVolume)
            }
          })
        return
      }
    } catch {}

    if (fallbackKey) {
      this.playHtml5Fallback(fallbackKey, fallbackVolume)
    }
  }

  /**
   * Sound 1: Quiz Option Click (Soft mechanical/bubble pop)
   */
  public playQuizOption() {
    this.playSynth(
      (ctx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        const now = ctx.currentTime
        osc.frequency.setValueAtTime(620, now)
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08)

        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.08)
      },
      'quiz-option',
      0.4
    )
  }

  /**
   * Sound 2: Wend Correct Word / Correct Answer (Bright harmonic chime chord)
   */
  public playWendCorrect() {
    this.playSynth(
      (ctx) => {
        const now = ctx.currentTime
        const freqs = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'

          const startTime = now + idx * 0.06
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0.25, startTime)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.35)
        })
      },
      'wend-correct',
      0.45
    )
  }

  /**
   * Sound 3: Winner Announcement Fanfare
   */
  public playWinner() {
    this.playSynth(
      (ctx) => {
        const now = ctx.currentTime
        const notes = [
          { f: 523.25, t: 0, d: 0.16 },
          { f: 659.25, t: 0.18, d: 0.16 },
          { f: 783.99, t: 0.36, d: 0.18 },
          { f: 1046.5, t: 0.56, d: 0.6 },
        ]

        notes.forEach(({ f, t, d }) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'

          const startTime = now + t
          osc.frequency.setValueAtTime(f, startTime)

          gain.gain.setValueAtTime(0.3, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + d)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + d)
        })
      },
      'winner',
      0.55
    )
  }

  /**
   * Sound 4: Radar countdown tick for 5-4-3-2-1
   */
  public playCountdownTick(count?: number) {
    this.playSynth(
      (ctx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'

        const now = ctx.currentTime
        const freq = count === 1 ? 1046.5 : count === 0 ? 1318.5 : 880
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0.28, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.08)
      },
      'countdown-tick',
      0.4
    )
  }

  /**
   * Sound 5: Error / Security Violation Buzzer (Low dissonant buzz)
   */
  public playError() {
    this.playSynth((ctx) => {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(160, now)
      osc.frequency.setValueAtTime(120, now + 0.1)

      gain.gain.setValueAtTime(0.35, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.25)
    })
  }

  /**
   * Sound 6: Test audio chime for audio activation feedback
   */
  public playTestSound() {
    void this.unlock().then(() => {
      this.playSynth((ctx) => {
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(783.99, now) // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.1) // C6
        gain.gain.setValueAtTime(0.28, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.28)
      }, 'quiz-option', 0.4)
    })
  }

  public setMuted(muted: boolean) {
    this.muted = muted
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('gdg_sound_muted', String(muted))
      }
    } catch {}
    this.notifyListeners()
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted)
    if (!this.muted) {
      this.playTestSound()
    }
    return this.muted
  }

  public isMuted(): boolean {
    return this.muted
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked && this.ctx?.state === 'running'
  }

  public subscribe(callback: (unlocked: boolean, muted: boolean) => void): () => void {
    this.listeners.add(callback)
    callback(this.isUnlocked, this.muted)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.isUnlocked, this.muted)
      } catch {}
    })
  }
}

export const soundManager = new SoundEngine()
