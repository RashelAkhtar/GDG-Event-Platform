'use client'

/**
 * Universal Game Sound Engine
 * Provides dual-layer playback:
 * 1. Web Audio API synthesized tones (zero network delay, instant feedback, no 404s)
 * 2. Static audio element playback (/sound/*.wav)
 */
class SoundEngine {
  private ctx: AudioContext | null = null
  private muted = false

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  /**
   * Sound 1: Quiz Option Click (Soft mechanical/bubble pop)
   */
  public playQuizOption() {
    if (this.muted) return

    // Primary: Web Audio Synth (instantaneous, 0ms latency)
    try {
      const ctx = this.getAudioContext()
      if (ctx) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        const now = ctx.currentTime
        osc.frequency.setValueAtTime(620, now)
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08)

        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.08)
        return
      }
    } catch {}

    // Fallback: Static audio tag
    try {
      const audio = new Audio('/sound/quiz-option.wav')
      audio.volume = 0.35
      void audio.play()
    } catch {}
  }

  /**
   * Sound 2: Wend Correct Word / Correct Answer (Bright harmonic chime chord)
   */
  public playWendCorrect() {
    if (this.muted) return

    try {
      const ctx = this.getAudioContext()
      if (ctx) {
        const now = ctx.currentTime
        const freqs = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'

          const startTime = now + idx * 0.06
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0.2, startTime)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.35)
        })
        return
      }
    } catch {}

    try {
      const audio = new Audio('/sound/wend-correct.wav')
      audio.volume = 0.4
      void audio.play()
    } catch {}
  }

  /**
   * Sound 3: Winner Announcement Fanfare
   */
  public playWinner() {
    if (this.muted) return

    try {
      const ctx = this.getAudioContext()
      if (ctx) {
        const now = ctx.currentTime
        // Fanfare melody notes: C5, E5, G5, C6 triumph
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

          gain.gain.setValueAtTime(0.25, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + d)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + d)
        })
        return
      }
    } catch {}

    try {
      const audio = new Audio('/sound/winner.wav')
      audio.volume = 0.5
      void audio.play()
    } catch {}
  }

  /**
   * Sound 4: Radar countdown tick for 5-4-3-2-1
   */
  public playCountdownTick(count?: number) {
    if (this.muted) return

    try {
      const ctx = this.getAudioContext()
      if (ctx) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'

        const now = ctx.currentTime
        // Higher pitch for 1 or GO
        const freq = count === 1 ? 1046.5 : count === 0 ? 1318.5 : 880
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.08)
        return
      }
    } catch {}

    try {
      const audio = new Audio('/sound/countdown-tick.wav')
      audio.volume = 0.35
      void audio.play()
    } catch {}
  }

  public setMuted(muted: boolean) {
    this.muted = muted
  }

  public isMuted() {
    return this.muted
  }
}

export const soundManager = new SoundEngine()
