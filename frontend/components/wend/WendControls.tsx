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
    <div className="flex flex-col items-center gap-2.5 w-full max-w-[340px] xs:max-w-[365px] sm:max-w-[420px] mx-auto select-none">
      {/* Active Word Capsule */}
      <div className="min-h-9 flex items-center justify-center">
        {letters.length > 0 ? (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border-2 border-[#34A853] shadow-[0_4px_16px_rgba(52,168,83,0.18)] animate-in zoom-in-90 ${
              shakeInvalid ? 'animate-shake' : ''
            }`}
          >
            {letters.map((char, idx) => (
              <span
                key={idx}
                className="flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[#34A853] font-mono text-xs font-black text-white shadow-2xs"
              >
                {char}
              </span>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-[#E5E7EB] font-mono text-[10.5px] font-medium text-[#4B5563] shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E8] animate-pulse" />
            <span>Trace adjacent letters to form technical words</span>
          </span>
        )}
      </div>

      {/* Action Buttons: Undo & Hint */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <button
          type="button"
          onClick={onUndo}
          className="flex h-10 sm:h-11 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white font-mono text-xs font-bold text-[#111827] shadow-2xs hover:border-[#111827] active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#6B7280]" />
          <span>Undo Move</span>
        </button>

        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          className="flex h-10 sm:h-11 items-center justify-center gap-2 rounded-full border border-[#FBBC04] bg-[#FEFDF0] font-mono text-xs font-bold text-[#B45309] shadow-2xs hover:border-[#B45309] hover:bg-[#FEF9C3] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Lightbulb className="h-3.5 w-3.5 text-[#FBBC04] fill-[#FBBC04]" />
          <span>Clue Hint</span>
        </button>
      </div>
    </div>
  )
}
