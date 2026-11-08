'use client'

import React, { useState } from 'react'
import { WendTargetWord, WEND_PASTEL_PALETTE } from '@/lib/api'
import { Lightbulb, Check } from 'lucide-react'

interface WendWordBankProps {
  targetWords: WendTargetWord[]
  foundWordIds: Set<string>
  wordColorMap?: Map<string, number>
  activeHintClue?: string | null
  onWordHintRequest?: (word: WendTargetWord) => void
}

export function WendWordBank({
  targetWords,
  foundWordIds,
  wordColorMap,
  activeHintClue,
  onWordHintRequest,
}: WendWordBankProps) {
  const [selectedWordHint, setSelectedWordHint] = useState<string | null>(null)

  // Sort target words by length for structured visual progression
  const sortedWords = [...targetWords].sort((a, b) => a.word.length - b.word.length)
  const foundCount = sortedWords.filter((w) => foundWordIds.has(w.id)).length

  return (
    <div className="flex flex-col gap-2 w-full max-w-[340px] xs:max-w-[365px] sm:max-w-[420px] mx-auto select-none">
      {/* Target Words & Hints Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#6B7280]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
          <span>TARGET WORDS // {foundCount}/{sortedWords.length} SOLVED</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1">
          <Lightbulb className="h-2.5 w-2.5 text-[#FBBC04]" />
          <span>Tap for Clue</span>
        </span>
      </div>

      {/* Prominent Active Clue Banner (Shown when user requests a hint) */}
      {(activeHintClue || selectedWordHint) && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#FBBC04] bg-[#FEF9C3] px-3.5 py-2 text-xs font-semibold text-[#854D0E] shadow-sm anim-sheet-unfold">
          <div className="flex items-center gap-2 min-w-0">
            <Lightbulb className="h-4 w-4 text-[#B45309] shrink-0" />
            <span className="font-mono text-[11px] leading-tight truncate">
              {activeHintClue || selectedWordHint}
            </span>
          </div>
          <span className="font-mono text-[8.5px] uppercase tracking-wider text-[#A16207] bg-white/80 px-2 py-0.5 rounded-full border border-[#FDE047] shrink-0 font-bold">
            Clue
          </span>
        </div>
      )}

      {/* 2-Column Responsive Matrix on Mobile, Clean Grid on Desktop */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full">
        {sortedWords.map((tw) => {
          const isFound = foundWordIds.has(tw.id)
          const letters = tw.word.toUpperCase().split('')
          const colorIdx = wordColorMap?.get(tw.id) ?? 0
          const color = WEND_PASTEL_PALETTE[colorIdx % WEND_PASTEL_PALETTE.length]
          const isHintActive =
            Boolean(activeHintClue && (activeHintClue.includes(tw.word) || activeHintClue.includes(`"${tw.word[0]}"`))) ||
            selectedWordHint === tw.hint

          const handleCardClick = () => {
            if (isFound) return
            if (onWordHintRequest) {
              onWordHintRequest(tw)
            } else if (tw.hint) {
              setSelectedWordHint((prev) => (prev === tw.hint ? null : tw.hint || null))
            }
          }

          return (
            <div
              key={tw.id}
              onClick={handleCardClick}
              className={`group/word relative flex flex-col justify-center rounded-xl p-2 transition-all duration-200 cursor-pointer ${
                isFound
                  ? `${color.bg} ${color.border} border shadow-2xs`
                  : isHintActive
                  ? 'border border-[#FBBC04] bg-[#FEFDF0] shadow-[0_0_12px_rgba(251,188,4,0.3)] ring-2 ring-[#FBBC04]'
                  : 'border border-[#E5E7EB] bg-white hover:border-[#9CA3AF] shadow-2xs hover:shadow-xs'
              }`}
              title={isFound ? 'Discovered!' : tw.hint ? `Hint: ${tw.hint}` : 'Click for clue'}
            >
              {/* Header Label: Letter count & Status */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`font-mono text-[8.5px] uppercase tracking-wider font-bold ${
                  isFound ? color.text : 'text-[#6B7280]'
                }`}>
                  {letters.length} Letters
                </span>
                {isFound ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#16A34A] text-white">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </span>
                ) : (
                  <Lightbulb className={`h-2.5 w-2.5 transition-colors ${isHintActive ? 'text-[#B45309]' : 'text-[#D1D5DB] group-hover/word:text-[#FBBC04]'}`} />
                )}
              </div>

              {/* Letter Trays */}
              <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar py-0.5">
                {letters.map((char, idx) => (
                  <div
                    key={idx}
                    className={`flex h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px] xs:text-xs font-black transition-all ${
                      isFound
                        ? `${color.bg} border ${color.border} ${color.text} shadow-2xs`
                        : 'bg-[#F4F4F5] border border-[#E5E7EB] text-transparent'
                    }`}
                  >
                    {isFound ? char : ''}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
