import React from 'react'

interface LockProps {
  className?: string
  size?: number
}

export function LockedIllustration({ className = '', size = 96 }: LockProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 hover:scale-105"
      >
        {/* Soft background glow */}
        <circle cx="60" cy="60" r="54" fill="#F1F3F4" />
        <circle cx="60" cy="60" r="46" fill="#FFFFFF" />

        {/* Shackle (Locked - Down) */}
        <path
          d="M44 56V40C44 31.1634 51.1634 24 60 24C68.8366 24 76 31.1634 76 40V56"
          stroke="#5F6368"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Padlock Body */}
        <rect
          x="34"
          y="52"
          width="52"
          height="42"
          rx="12"
          fill="#4285F4"
        />

        {/* Subtle highlight band */}
        <path
          d="M34 64C34 57.3726 39.3726 52 46 52H74C80.6274 52 86 57.3726 86 64V68H34V64Z"
          fill="#1A73E8"
        />

        {/* Keyhole */}
        <circle cx="60" cy="70" r="4.5" fill="#FFFFFF" />
        <path
          d="M58 72L57 82H63L62 72H58Z"
          fill="#FFFFFF"
        />

        {/* Status indicator dot */}
        <circle cx="80" cy="56" r="3.5" fill="#EA4335" />
      </svg>
    </div>
  )
}

export function UnlockedIllustration({ className = '', size = 96 }: LockProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 hover:scale-105"
      >
        {/* Soft background glow with green tint */}
        <circle cx="60" cy="60" r="54" fill="#E6F4EA" />
        <circle cx="60" cy="60" r="46" fill="#FFFFFF" />

        {/* Shackle (Unlocked - Popped Up & Rotated) */}
        <path
          d="M44 48V34C44 25.1634 51.1634 18 60 18C68.8366 18 76 25.1634 76 34V42"
          stroke="#34A853"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="100"
          className="transition-all duration-500 ease-out"
        />

        {/* Padlock Body */}
        <rect
          x="34"
          y="52"
          width="52"
          height="42"
          rx="12"
          fill="#34A853"
        />

        {/* Subtle highlight band */}
        <path
          d="M34 64C34 57.3726 39.3726 52 46 52H74C80.6274 52 86 57.3726 86 64V68H34V64Z"
          fill="#1E8E3E"
        />

        {/* Unlocked checkmark inside */}
        <path
          d="M52 73L57.5 78.5L68 67"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Celebration energy sparkles (Google colors) */}
        <circle cx="26" cy="36" r="3" fill="#4285F4" className="animate-pulse" />
        <circle cx="94" cy="34" r="3.5" fill="#FBBC04" className="animate-pulse" />
        <circle cx="88" cy="88" r="2.5" fill="#EA4335" />
        <circle cx="24" cy="80" r="2" fill="#34A853" />
      </svg>
    </div>
  )
}
