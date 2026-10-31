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
      {/* Floating Active Word Pill (Shown in screenshot: [ I ] [ N ] [ H ] [ I ]) */}
      <div className="min-h-9 flex items-center justify-center">
        {letters.length > 0 ? (
          <div
            className={`flex items-center gap-1 animate-in zoom-in-90 ${
              shakeInvalid ? 'animate-shake' : ''
            }`}
          >
            {letters.map((char, idx) => (
              <span
                key={idx}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[#7CB342] text-xs font-black text-white shadow-xs"
              >
                {char}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs font-medium text-[#80868B]">
            Drag across adjacent letters to trace
          </span>
        )}
      </div>

      {/* Bottom Action Buttons: Undo & Hint (Pill buttons matching screenshot) */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <button
          onClick={onUndo}
          className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#DADCE0] bg-white text-sm font-semibold text-[#3C4043] shadow-2xs hover:bg-[#F8F9FA] active:scale-95 transition-all"
        >
          <RotateCcw className="h-4 w-4 text-[#5F6368]" />
          <span>Undo</span>
        </button>

        <button
          onClick={onHint}
          disabled={hintDisabled}
          className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#DADCE0] bg-white text-sm font-semibold text-[#3C4043] shadow-2xs hover:bg-[#FEF7E0] hover:border-[#FBBC04]/60 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lightbulb className="h-4 w-4 text-[#FBBC04]" />
          <span>Hint</span>
        </button>
      </div>
    </div>
  )
}
