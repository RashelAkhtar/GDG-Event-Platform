'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { salmanAudio } from '@/lib/salmanAudio'
import { X, Compass, ArrowRight, Sparkles } from 'lucide-react'

interface GoldenAppleModalProps {
  isOpen: boolean
  onClose: () => void
  onEnterGame: () => void
}

export function GoldenAppleModal({
  isOpen,
  onClose,
  onEnterGame,
}: GoldenAppleModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      salmanAudio.playGoldenAppleChime()
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden'
      }
    } else {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[99998] flex items-center justify-center p-4 sm:p-6 bg-black/70 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-300 select-none overflow-y-auto"
    >
      {/* Editorial Discovery Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[28px] border border-[#E7E2DA] dark:border-[#22242A] bg-[#FCFAF7] dark:bg-[#0E0F12] p-7 sm:p-9 shadow-[0_30px_90px_rgba(0,0,0,0.18)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85)] text-center animate-in zoom-in-95 duration-300 flex flex-col my-auto overflow-hidden"
      >
        {/* Subtle Ambient Golden Halo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#F3E5AB]/25 dark:bg-[#D4AF37]/10 blur-3xl pointer-events-none" />

        {/* Minimalist Corner Registration Crosshairs */}
        <span className="absolute top-3.5 left-4 font-mono text-[9px] text-[#A8A29E]/60 dark:text-[#57534E]/60 select-none">+</span>
        <span className="absolute top-3.5 right-4 font-mono text-[9px] text-[#A8A29E]/60 dark:text-[#57534E]/60 select-none">+</span>
        <span className="absolute bottom-3.5 left-4 font-mono text-[9px] text-[#A8A29E]/60 dark:text-[#57534E]/60 select-none">+</span>
        <span className="absolute bottom-3.5 right-4 font-mono text-[9px] text-[#A8A29E]/60 dark:text-[#57534E]/60 select-none">+</span>

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-[#E7E2DA]/80 dark:border-[#22242A]">
          <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#78716C] dark:text-[#A8A29E]">
            ARCHIVE // N° 01
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-full border border-[#E7E2DA] dark:border-[#262626] bg-transparent text-[#78716C] dark:text-[#A8A29E] hover:text-[#111827] dark:hover:text-white hover:border-[#111827] dark:hover:border-white transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Classification Pill */}
        <div className="mt-4 mb-2 inline-flex items-center gap-1.5 self-center rounded-full border border-[#D4AF37]/40 bg-[#FAF5E6] dark:bg-[#78350F]/20 px-3.5 py-1 text-[9.5px] font-mono tracking-[0.24em] uppercase text-[#8C6D37] dark:text-[#F3E5AB]">
          <Sparkles className="h-3 w-3 text-[#B38F4D]" />
          <span>SECRET EASTER EGG UNLOCKED</span>
        </div>

        {/* Sculptural Gilded Apple Emblem */}
        <div className="relative mx-auto my-4 flex items-center justify-center">
          <div className="absolute h-28 w-28 rounded-full bg-[#D4AF37]/15 blur-2xl pointer-events-none" />
          <svg
            viewBox="0 0 120 120"
            className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_12px_28px_rgba(180,83,9,0.22)] transition-transform duration-700 ease-out hover:scale-105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Rich 24K Brushed Gold Gradient */}
              <radialGradient id="gold-satin-core" cx="42%" cy="38%" r="62%">
                <stop offset="0%" stopColor="#FFFDF7" />
                <stop offset="18%" stopColor="#F9EDB8" />
                <stop offset="45%" stopColor="#E5C158" />
                <stop offset="72%" stopColor="#B8860B" />
                <stop offset="92%" stopColor="#8A5A00" />
                <stop offset="100%" stopColor="#5E3A00" />
              </radialGradient>

              {/* Sculpted Leaf Gradient */}
              <linearGradient id="gold-leaf-lux" x1="58" y1="12" x2="88" y2="34" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFF9E6" />
                <stop offset="35%" stopColor="#E5C158" />
                <stop offset="75%" stopColor="#997010" />
                <stop offset="100%" stopColor="#543A05" />
              </linearGradient>

              {/* Elegant Stem Gradient */}
              <linearGradient id="gold-stem-lux" x1="58" y1="30" x2="72" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#694605" />
                <stop offset="50%" stopColor="#B38F4D" />
                <stop offset="100%" stopColor="#402800" />
              </linearGradient>

              {/* Specular Rim Light */}
              <linearGradient id="gold-rim-light" x1="24" y1="36" x2="96" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFEAA7" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#8A5A00" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Ambient Base Shadow */}
            <ellipse cx="60" cy="110" rx="34" ry="6" fill="#000000" fillOpacity="0.08" />

            {/* Apple Stem */}
            <path
              d="M 60 30 C 60 17, 68 11, 74 7"
              stroke="url(#gold-stem-lux)"
              strokeWidth="3.6"
              strokeLinecap="round"
            />

            {/* Sculpted Emerald-Infused Gold Leaf */}
            <path
              d="M 63 20 C 72 12, 90 14, 87 25 C 77 30, 66 26, 63 20 Z"
              fill="url(#gold-leaf-lux)"
              stroke="#D4AF37"
              strokeWidth="0.75"
            />
            {/* Delicate Leaf Central Vein */}
            <path
              d="M 64 21 C 73 18, 82 19, 86 24"
              stroke="#543A05"
              strokeWidth="0.6"
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* Sculptural Apple Body */}
            <path
              d="M 60 34 C 42 34, 18 46, 21 78 C 23 104, 45 113, 60 106 C 75 113, 97 104, 99 78 C 102 46, 78 34, 60 34 Z"
              fill="url(#gold-satin-core)"
              stroke="url(#gold-rim-light)"
              strokeWidth="1.2"
            />

            {/* Refined Specular Reflection Curves */}
            <path
              d="M 38 48 C 34 56, 33 69, 36 78"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.45"
            />
            <ellipse cx="40" cy="52" rx="4.5" ry="9" fill="#FFFFFF" opacity="0.35" transform="rotate(-28 40 52)" />
            <circle cx="37" cy="80" r="2.2" fill="#FFFFFF" opacity="0.4" />
          </svg>
        </div>

        {/* Narrative Title */}
        <h2 className="font-serif text-2xl sm:text-3xl font-normal tracking-[-0.025em] text-[#111827] dark:text-[#FAFAFA] mt-1 mb-1 leading-snug">
          The Golden Apple
          <span className="block font-serif italic font-light text-[#78716C] dark:text-[#A8A29E] text-base sm:text-lg mt-0.5">
            has been unearthed.
          </span>
        </h2>

        {/* Delicate Hairline Accent */}
        <div className="flex items-center justify-center gap-2.5 my-3">
          <span className="h-px w-8 bg-[#E7E2DA] dark:bg-[#262626]" />
          <span className="h-1 w-1 rounded-full bg-[#B38F4D]" />
          <span className="h-px w-8 bg-[#E7E2DA] dark:bg-[#262626]" />
        </div>

        {/* Description Body */}
        <p className="text-xs sm:text-[13px] text-[#57534E] dark:text-[#A8A29E] leading-relaxed mb-6 px-2 font-normal">
          Through the shaken branches of the sacred oak, the fabled fruit reveals its secret. The corridor to{' '}
          <strong className="font-semibold text-[#111827] dark:text-white uppercase tracking-wider text-[11px]">
            SALMAN DRIVING SCHOOL
          </strong>{' '}
          is now unsealed. Take the wheel and command the nocturnal highway.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              salmanAudio.unlock()
              salmanAudio.startBgm()
              salmanAudio.startEngine()
              onClose()
              onEnterGame()
            }}
            onTouchEnd={() => {
              salmanAudio.unlock()
              salmanAudio.startBgm()
            }}
            className="group w-full flex items-center justify-between rounded-full bg-[#111827] hover:bg-black dark:bg-[#FAFAFA] dark:hover:bg-white text-white dark:text-[#111827] px-6 py-3.5 text-xs font-mono uppercase tracking-[0.18em] font-semibold transition-all duration-300 shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <span>Enter Salman Driving School</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-[#E7E2DA] dark:border-[#262626] bg-transparent text-[#78716C] dark:text-[#A8A29E] hover:text-[#111827] dark:hover:text-white hover:border-[#111827] dark:hover:border-white px-5 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] transition-all duration-300 cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Keep Exploring Meadow</span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
