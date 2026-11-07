'use client'

import React, { useState } from 'react'

export interface AnimatedLockToggleProps {
  id?: string
  /**
   * Status: true when the challenge arena is LIVE (unlocked), false when LOCKED.
   * Can also be controlled via checked, isLive, or isLocked.
   */
  checked?: boolean
  isLive?: boolean
  isLocked?: boolean
  onChange?: (nextLive: boolean) => void
  disabled?: boolean
  isAdmin?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  title?: string
  className?: string
  showBadge?: boolean
  badgeLiveText?: string
  badgeLockedText?: string
}

export function AnimatedLockToggle({
  id = 'lock-toggle',
  checked,
  isLive,
  isLocked,
  onChange,
  disabled = false,
  isAdmin = true,
  size = 'sm',
  title,
  className = '',
  showBadge = false,
  badgeLiveText = 'Live',
  badgeLockedText = 'Locked',
}: AnimatedLockToggleProps) {
  // Canonical live state (true = Live & Unlocked, false = Locked)
  const live =
    isLive !== undefined
      ? isLive
      : isLocked !== undefined
      ? !isLocked
      : (checked ?? false)

  const [isPressing, setIsPressing] = useState(false)

  const sizeConfig = {
    xs: { box: 'h-6 w-6', svg: 16, stroke: 2.2, badge: 'text-[9px] px-2 py-0.5' },
    sm: { box: 'h-8 w-8', svg: 18, stroke: 2.4, badge: 'text-[10px] px-2.5 py-0.5' },
    md: { box: 'h-9 w-9 sm:h-10 sm:w-10', svg: 22, stroke: 2.6, badge: 'text-xs px-3 py-1' },
    lg: { box: 'h-11 w-11 sm:h-12 sm:w-12', svg: 26, stroke: 2.8, badge: 'text-xs px-3.5 py-1' },
    xl: { box: 'h-13 w-13 sm:h-14 sm:w-14', svg: 32, stroke: 3.2, badge: 'text-sm px-4 py-1.5' },
  }

  const currentSize = sizeConfig[size] || sizeConfig.sm

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin || disabled) return
    if (onChange) {
      onChange(!live)
    }
  }

  const tooltipText =
    title ||
    (isAdmin
      ? live
        ? 'Click to lock arena (Restricted)'
        : 'Click to unlock arena (Go Live)'
      : live
      ? 'Arena Status: LIVE & Accepting Submissions'
      : 'Arena Status: LOCKED by Host')

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <button
        type="button"
        id={id}
        onClick={handleClick}
        onMouseDown={() => setIsPressing(true)}
        onMouseUp={() => setIsPressing(false)}
        onMouseLeave={() => setIsPressing(false)}
        onTouchStart={() => setIsPressing(true)}
        onTouchEnd={() => setIsPressing(false)}
        disabled={disabled || !isAdmin}
        title={tooltipText}
        aria-label={live ? 'Challenge Arena Live (Click to Lock)' : 'Challenge Arena Locked (Click to Unlock)'}
        aria-pressed={live}
        className={`relative group flex items-center justify-center rounded-xl transition-all duration-300 border ${currentSize.box} ${
          live
            ? 'bg-[#15803D] hover:bg-[#166534] border-[#166534] text-white shadow-xs shadow-[#15803D]/25'
            : 'bg-[#DC2626] hover:bg-[#B91C1C] border-[#B91C1C] text-white shadow-xs shadow-[#DC2626]/25'
        } ${
          isAdmin && !disabled
            ? 'cursor-pointer active:scale-90 hover:scale-105'
            : 'cursor-default opacity-90'
        } ${isPressing ? 'scale-90' : ''}`}
      >
        {/* Subtle radial pulse ring behind lock toggle */}
        <span
          className={`absolute -inset-0.5 rounded-xl transition-opacity duration-500 pointer-events-none ${
            live
              ? 'bg-[#22C55E]/30 animate-pulse'
              : 'bg-[#EF4444]/20'
          } opacity-0 group-hover:opacity-100`}
        />

        {/* Dynamic SVG Lock Icon with Smooth Keyframe Shackle Action */}
        <svg
          width={currentSize.svg}
          height={currentSize.svg}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 overflow-visible transition-transform duration-300"
          aria-hidden="true"
        >
          {live ? (
            /* ========================================================= */
            /* UNLOCKED / LIVE STATE: AUTHENTIC SPRING-OPEN PADLOCK      */
            /* ========================================================= */
            <g className="transition-all duration-300">
              {/* Animated Open Shackle: pops up and pivots open */}
              <path
                d="M10 14V9.5C10 6.186 12.686 3.5 16 3.5C19.314 3.5 22 6.186 22 9.5V10.5"
                stroke="#FFFFFF"
                strokeWidth={currentSize.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="anim-shackle-open"
              />

              {/* Padlock Body Chassis */}
              <rect
                x="6"
                y="13.5"
                width="20"
                height="15"
                rx="3.5"
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeWidth="0.5"
                className="transition-transform duration-200"
              />

              {/* Precision Keyhole Cutout */}
              <circle cx="16" cy="19.5" r="1.8" fill="#15803D" />
              <path
                d="M15.1 19.8L14.2 24.5H17.8L16.9 19.8Z"
                fill="#15803D"
              />

              {/* Twinkling Celebration Sparkles */}
              <circle cx="26" cy="6" r="1.2" fill="#FFFFFF" className="anim-sparkle" />
              <circle cx="6" cy="7" r="0.9" fill="#FFFFFF" className="anim-sparkle" />
            </g>
          ) : (
            /* ========================================================= */
            /* LOCKED STATE: SOLID SHACKLE SECURED FIRMLY                */
            /* ========================================================= */
            <g className="transition-all duration-300">
              {/* Animated Closed Shackle: securely grounded in both sockets */}
              <path
                d="M10 14.5V9.5C10 6.186 12.686 3.5 16 3.5C19.314 3.5 22 6.186 22 9.5V14.5"
                stroke="#FFFFFF"
                strokeWidth={currentSize.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="anim-shackle-close"
              />

              {/* Padlock Body Chassis */}
              <rect
                x="6"
                y="13.5"
                width="20"
                height="15"
                rx="3.5"
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeWidth="0.5"
              />

              {/* Precision Keyhole Cutout */}
              <circle cx="16" cy="19.5" r="1.8" fill="#DC2626" />
              <path
                d="M15.1 19.8L14.2 24.5H17.8L16.9 19.8Z"
                fill="#DC2626"
              />
            </g>
          )}
        </svg>
      </button>

      {showBadge && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wider font-semibold border transition-all duration-200 ${currentSize.badge} ${
            live
              ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#15803D]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              live ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'
            }`}
          />
          <span>{live ? badgeLiveText : badgeLockedText}</span>
        </span>
      )}
    </div>
  )
}
