'use client'

import React from 'react'
import { WendTargetWord, WEND_PASTEL_PALETTE } from '@/lib/api'

interface WendWordBankProps {
  targetWords: WendTargetWord[]
  foundWordIds: Set<string>
  wordColorMap?: Map<string, number>
}

export function WendWordBank({ targetWords, foundWordIds, wordColorMap }: WendWordBankProps) {
  // Sort target words by length for visual progression matching reference screenshot
  const sortedWords = [...targetWords].sort((a, b) => a.word.length - b.word.length)

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-[340px] sm:max-w-[380px] mx-auto select-none">
      {sortedWords.map((tw) => {
        const isFound = foundWordIds.has(tw.id)
        const letters = tw.word.toUpperCase().split('')
        const colorIdx = wordColorMap?.get(tw.id) ?? 0
        const color = WEND_PASTEL_PALETTE[colorIdx % WEND_PASTEL_PALETTE.length]

        return (
          <div key={tw.id} className="flex items-center gap-0.5 sm:gap-1 max-w-full overflow-x-auto py-0.5">
            {letters.map((char, idx) => (
              <div
                key={idx}
                className={`flex h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-[11px] xs:text-xs sm:text-sm font-black transition-all duration-300 ${
                  isFound
                    ? `${color.bg} ${color.border} ${color.text} border-2 shadow-xs animate-in zoom-in-75`
                    : 'bg-[#F1F3F4] border border-[#DADCE0] text-transparent'
                }`}
              >
                {isFound ? char : ''}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
