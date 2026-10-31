'use client'

import React from 'react'

export interface AnimatedLockToggleProps {
  id: string
  /**
   * Controlled checked state:
   * When true: Green (#20cca5) with locked shackle + sparkle rays
   * When false: Red (#ff5b5b) with open shackle
   */
  checked: boolean
  onChange?: (nextChecked: boolean) => void
  disabled?: boolean
  isAdmin?: boolean
  size?: 'sm' | 'md' | 'lg'
  title?: string
  className?: string
  showBadge?: boolean
  badgeLiveText?: string
  badgeLockedText?: string
}

export function AnimatedLockToggle({
  id,
  checked,
  onChange,
  disabled = false,
  isAdmin = true,
  size = 'md',
  title,
  className = '',
  showBadge = false,
  badgeLiveText = 'Live Now',
  badgeLockedText = 'Locked',
}: AnimatedLockToggleProps) {
  const sizeStyles = {
    sm: 'scale-[0.72]',
    md: 'scale-100',
    lg: 'scale-[1.25]',
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin || disabled) return
    if (onChange) {
      onChange(!checked)
    }
  }

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className={`relative ${sizeStyles[size]} origin-center transition-transform`}>
        <input
          id={id}
          type="checkbox"
          className="inp-lock"
          checked={checked}
          disabled={disabled || !isAdmin}
          onChange={(e) => {
            if (!isAdmin || disabled) return
            if (onChange) onChange(e.target.checked)
          }}
        />
        <label
          htmlFor={isAdmin && !disabled ? id : undefined}
          onClick={handleClick}
          title={
            title ||
            (isAdmin
              ? checked
                ? 'Click to switch lock'
                : 'Click to switch lock'
              : checked
              ? 'Status: Active'
              : 'Status: Locked')
          }
          className={`btn-lock ${!isAdmin || disabled ? 'btn-lock-readonly' : ''}`}
        >
          <svg width="36" height="40" viewBox="0 0 36 40" aria-hidden="true">
            {/* Padlock Base Body */}
            <path
              className="lockb"
              d="M27 27C27 34.1797 21.1797 40 14 40C6.8203 40 1 34.1797 1 27C1 19.8203 6.8203 14 14 14C21.1797 14 27 19.8203 27 27ZM15.6298 26.5191C16.4544 25.9845 17 25.056 17 24C17 22.3431 15.6569 21 14 21C12.3431 21 11 22.3431 11 24C11 25.056 11.5456 25.9845 12.3702 26.5191L11 32H17L15.6298 26.5191Z"
            />
            {/* Padlock Animated Shackle */}
            <path
              className="lock"
              d="M6 21V10C6 5.58172 9.58172 2 14 2V2C18.4183 2 22 5.58172 22 10V21"
            />
            {/* Bling Sparkle Ray 1 */}
            <path className="bling" d="M29 20L31 22" />
            {/* Bling Sparkle Ray 2 */}
            <path className="bling" d="M31.5 15H34.5" />
            {/* Bling Sparkle Ray 3 */}
            <path className="bling" d="M29 10L31 8" />
          </svg>
        </label>
      </div>

      {showBadge && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold shadow-2xs transition-colors ${
            checked
              ? 'bg-[#E6F4EA] border border-[#34A853]/30 text-[#137333]'
              : 'bg-[#FCE8E6] border border-[#EA4335]/30 text-[#C5221F]'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              checked ? 'bg-[#34A853] animate-pulse' : 'bg-[#EA4335]'
            }`}
          />
          <span>{checked ? badgeLiveText : badgeLockedText}</span>
        </span>
      )}
    </div>
  )
}
