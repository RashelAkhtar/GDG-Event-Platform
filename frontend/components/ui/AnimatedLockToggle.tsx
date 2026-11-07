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

  const sizeConfig = {
    xs: { box: 'h-6 w-6', svg: 14 },
    sm: { box: 'h-7 w-7 sm:h-8 sm:w-8', svg: 16 },
    md: { box: 'h-8 w-8 sm:h-9 sm:w-9', svg: 18 },
    lg: { box: 'h-9 w-9 sm:h-10 sm:w-10', svg: 20 },
    xl: { box: 'h-11 w-11 sm:h-12 sm:w-12', svg: 24 },
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
        ? 'Click to switch to LOCKED'
        : 'Click to switch to UNLOCKED & GO LIVE'
      : live
      ? 'Arena Status: LIVE & Accepting Submissions'
      : 'Arena Status: LOCKED by Host')

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <button
        type="button"
        id={id}
        onClick={handleClick}
        disabled={disabled || !isAdmin}
        title={tooltipText}
        aria-label={live ? 'Challenge Arena Live (Click to Lock)' : 'Challenge Arena Locked (Click to Unlock)'}
        aria-pressed={live}
        className={`relative flex items-center justify-center rounded-xl transition-all duration-200 border ${currentSize.box} ${
          live
            ? 'bg-[#137333] border-[#0D652D] text-white shadow-xs hover:bg-[#0D652D]'
            : 'bg-[#C5221F] border-[#B31412] text-white shadow-xs hover:bg-[#B31412]'
        } ${
          isAdmin && !disabled
            ? 'cursor-pointer active:scale-95'
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
            <g>
              {/* Subtle Live Accent Sparkle */}
              <path
                d="M33 12L36 14"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="opacity-90"
              />
              <path
                d="M34 7H37"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="opacity-90"
              />

              {/* Shackle: Visibly UNLATCHED & OPEN (Clear gap above body) */}
              <path
                d="M15 19V11C15 7.134 18.134 4 22 4C25.866 4 29 7.134 29 11V12"
                stroke="#FFFFFF"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Solid Padlock Body */}
              <rect
                x="10"
                y="19"
                width="24"
                height="18"
                rx="2"
                fill="#FFFFFF"
              />

              {/* Clean Keyhole Cutout */}
              <circle cx="22" cy="26" r="2.2" fill="#137333" />
              <path
                d="M20.9 26.5L19.8 32H24.2L23.1 26.5Z"
                fill="#137333"
              />
            </g>
          ) : (
            /* ========================================================= */
            /* LOCKED STATE: AUTHENTIC 100% CLOSED PADLOCK (🔒)          */
            /* ========================================================= */
            <g>
              {/* Shackle: Solidly CLOSED into both sockets at y=19 */}
              <path
                d="M15 19V12C15 8.134 18.134 5 22 5C25.866 5 29 8.134 29 12V19"
                stroke="#FFFFFF"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Solid Padlock Body */}
              <rect
                x="10"
                y="19"
                width="24"
                height="18"
                rx="2"
                fill="#FFFFFF"
              />

              {/* Clean Keyhole Cutout */}
              <circle cx="22" cy="26" r="2.2" fill="#C5221F" />
              <path
                d="M20.9 26.5L19.8 32H24.2L23.1 26.5Z"
                fill="#C5221F"
              />
            </g>
          )}
        </svg>
      </button>

      {showBadge && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
            live
              ? 'bg-[#E6F4EA] border-[#34A853]/40 text-[#137333]'
              : 'bg-[#FCE8E6] border-[#EA4335]/40 text-[#C5221F]'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              live ? 'bg-[#34A853] animate-pulse' : 'bg-[#EA4335]'
            }`}
          />
          <span>{live ? badgeLiveText : badgeLockedText}</span>
        </span>
      )}
    </div>
  )
}
