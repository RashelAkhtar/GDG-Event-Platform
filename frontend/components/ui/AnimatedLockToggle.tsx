'use client'

import React from 'react'

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
  size?: 'sm' | 'md' | 'lg' | 'xl'
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
  size = 'lg',
  title,
  className = '',
  showBadge = false,
  badgeLiveText = 'Live Now',
  badgeLockedText = 'Locked',
}: AnimatedLockToggleProps) {
  // Canonical live state (true = Live & Unlocked, false = Locked)
  const live =
    isLive !== undefined
      ? isLive
      : isLocked !== undefined
      ? !isLocked
      : (checked ?? false)

  const sizeConfig = {
    sm: { box: 'h-10 w-10', svg: 26 },
    md: { box: 'h-12 w-12', svg: 32 },
    lg: { box: 'h-16 w-16', svg: 42 },
    xl: { box: 'h-20 w-20', svg: 50 },
  }

  const currentSize = sizeConfig[size] || sizeConfig.lg

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
        ? 'Click to switch to LOCKED'
        : 'Click to switch to UNLOCKED & GO LIVE'
      : live
      ? 'Arena Status: LIVE & Accepting Submissions'
      : 'Arena Status: LOCKED by Host')

  return (
    <div className={`inline-flex flex-col items-center gap-2 select-none ${className}`}>
      <button
        type="button"
        id={id}
        onClick={handleClick}
        disabled={disabled || !isAdmin}
        title={tooltipText}
        aria-label={live ? 'Challenge Arena Live (Click to Lock)' : 'Challenge Arena Locked (Click to Unlock)'}
        aria-pressed={live}
        className={`relative flex items-center justify-center transition-all duration-300 ${currentSize.box} ${
          live
            ? 'bg-[#1E8E3E] border border-[#34A853]/60 shadow-[0_4px_16px_rgba(30,142,62,0.35)]'
            : 'bg-[#EA4335] border border-[#D93025]/60 shadow-[0_4px_16px_rgba(234,67,53,0.35)]'
        } ${
          isAdmin && !disabled
            ? 'cursor-pointer hover:scale-105 active:scale-95 hover:shadow-lg'
            : 'cursor-default'
        }`}
      >
        <svg
          width={currentSize.svg}
          height={currentSize.svg}
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible block"
          aria-hidden="true"
        >
          {live ? (
            /* ========================================================= */
            /* UNLOCKED / LIVE STATE: AUTHENTIC OPEN PADLOCK (🔓)        */
            /* ========================================================= */
            <g className="transition-all duration-300">
              {/* Sparkle Energy Rays (Google Green Arena Live) */}
              <path
                d="M33 13L37 15"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="animate-pulse"
              />
              <path
                d="M35 8H39"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="animate-pulse"
              />
              <path
                d="M33 3L36 1"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="animate-pulse"
              />

              {/* Shackle: Visibly UNLATCHED and OPEN (Right leg stops at y=11 above body socket at y=19) */}
              <path
                d="M15 19V11C15 7.134 18.134 4 22 4C25.866 4 29 7.134 29 11V12"
                stroke="#FFFFFF"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Solid Padlock Body (x: 10 to 34, y: 19 to 37) */}
              <rect
                x="10"
                y="19"
                width="24"
                height="18"
                rx="2"
                fill="#FFFFFF"
              />

              {/* Clean Keyhole Cutout (Green contrast) */}
              <circle cx="22" cy="26" r="2.2" fill="#1E8E3E" />
              <path
                d="M20.9 26.5L19.8 32H24.2L23.1 26.5Z"
                fill="#1E8E3E"
              />
            </g>
          ) : (
            /* ========================================================= */
            /* LOCKED STATE: AUTHENTIC 100% CLOSED PADLOCK (🔒)          */
            /* ========================================================= */
            <g className="transition-all duration-300">
              {/* Shackle: Solidly CLOSED into BOTH left (x=15) and right (x=29) sockets at y=19 */}
              <path
                d="M15 19V12C15 8.134 18.134 5 22 5C25.866 5 29 8.134 29 12V19"
                stroke="#FFFFFF"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Solid Padlock Body (x: 10 to 34, y: 19 to 37) */}
              <rect
                x="10"
                y="19"
                width="24"
                height="18"
                rx="2"
                fill="#FFFFFF"
              />

              {/* Clean Keyhole Cutout (Red contrast) */}
              <circle cx="22" cy="26" r="2.2" fill="#EA4335" />
              <path
                d="M20.9 26.5L19.8 32H24.2L23.1 26.5Z"
                fill="#EA4335"
              />
            </g>
          )}
        </svg>
      </button>

      {showBadge && (
        <span
          className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-mono text-xs font-bold transition-colors ${
            live
              ? 'bg-[#E6F4EA] border-[#34A853]/40 text-[#137333]'
              : 'bg-[#FCE8E6] border-[#EA4335]/40 text-[#C5221F]'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 ${
              live ? 'bg-[#34A853] animate-pulse' : 'bg-[#EA4335]'
            }`}
          />
          <span>{live ? badgeLiveText : badgeLockedText}</span>
        </span>
      )}
    </div>
  )
}
