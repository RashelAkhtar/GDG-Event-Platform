'use client'

import React, { useEffect, useState } from 'react'
import { soundManager } from '@/lib/sound'
import { Volume2, VolumeX } from 'lucide-react'

interface SoundToggleProps {
  className?: string
  compact?: boolean
}

export function SoundToggle({ className = '', compact = false }: SoundToggleProps) {
  const [muted, setMuted] = useState(soundManager.isMuted())

  useEffect(() => {
    const unsubscribe = soundManager.subscribe((_, isMuted) => {
      setMuted(isMuted)
    })
    return () => unsubscribe()
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    // Explicit user gesture unlocks audio pipeline
    void soundManager.unlock().then(() => {
      soundManager.toggleMute()
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={
        muted
          ? 'Sound is muted. Tap to enable audio'
          : 'Sound is on. Tap to mute (Ensure phone silent switch is OFF on iOS)'
      }
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all active:scale-95 cursor-pointer select-none backdrop-blur-md ${
        muted
          ? 'border-[#DADCE0] bg-white/80 text-[#5F6368] hover:bg-[#F1F3F4]'
          : 'border-[#34A853]/40 bg-[#E6F4EA]/90 text-[#137333] hover:bg-[#CEEAD6]'
      } ${
        compact
          ? 'p-1.5 text-xs'
          : 'px-2.5 py-1 text-xs font-semibold shadow-2xs'
      } ${className}`}
    >
      {muted ? (
        <VolumeX className="h-3.5 w-3.5 text-[#EA4335]" />
      ) : (
        <Volume2 className="h-3.5 w-3.5 text-[#34A853] animate-pulse" />
      )}
      {!compact && (
        <span className="hidden xs:inline text-[11px]">
          {muted ? 'Sound Muted' : 'Sound On'}
        </span>
      )}
    </button>
  )
}
