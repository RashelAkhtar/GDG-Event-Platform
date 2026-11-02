'use client'

import React from 'react'
import { RotateCcw, Lightbulb } from 'lucide-react'

interface WendControlsProps {
  currentWord: string
  onUndo: () => void
  onHint: () => void
  hintDisabled?: boolean
  shakeInvalid?: boolean
}

export function WendControls({
  currentWord,
  onUndo,
  onHint,
  hintDisabled = false,
  shakeInvalid = false,
}: WendControlsProps) {
  const letters = currentWord.toUpperCase().split('')

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[340px] sm:max-w-[380px] mx-auto select-none">
      {/* Floating Active Word Capsule (Google Green Halo & Tactile Blocks) */}
      <div className="min-h-10 flex items-center justify-center">
        {letters.length > 0 ? (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-[#34A853]/40 shadow-[0_4px_20px_rgba(52,168,83,0.2)] backdrop-blur-md animate-in zoom-in-90 ${
              shakeInvalid ? 'animate-shake' : ''
            }`}
          >
            {letters.map((char, idx) => (
              <span
                key={idx}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-[#34A853] to-[#1E8E3E] text-xs font-black text-white shadow-xs"
              >
                {char}
              </span>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/80 border border-[#DADCE0] text-xs font-semibold text-[#5F6368] shadow-2xs backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4] animate-pulse" />
            <span>Trace adjacent letters to form technical words</span>
          </span>
        )}
      </div>

      {/* Bottom Action Buttons: Undo & Hint (Frosted Pill Buttons) */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <button
          onClick={onUndo}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/90 bg-white/90 text-xs sm:text-sm font-semibold text-[#3C4043] shadow-sm hover:bg-white hover:border-[#DADCE0] hover:shadow-md active:scale-95 transition-all backdrop-blur-sm"
        >
          <RotateCcw className="h-4 w-4 text-[#5F6368]" />
          <span>Undo Move</span>
        </button>

        <button
          onClick={onHint}
          disabled={hintDisabled}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#FBBC04]/50 bg-gradient-to-r from-white/90 to-[#FEF7E0]/90 text-xs sm:text-sm font-semibold text-[#B06000] shadow-sm hover:from-white hover:to-[#FEF7E0] hover:border-[#FBBC04] hover:shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm"
        >
          <Lightbulb className="h-4 w-4 text-[#FBBC04]" />
          <span>Clue Hint</span>
        </button>
      </div>
    </div>
  )
}
