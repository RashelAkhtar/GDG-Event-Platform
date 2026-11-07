import React from 'react'

interface LockProps {
  className?: string
  size?: number
}

export function LockedIllustration({ className = '', size = 96 }: LockProps) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background security halo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full bg-[#EA4335]/5 animate-ping"
          style={{ width: size * 0.9, height: size * 0.9, animationDuration: '4s' }}
        />
        <div
          className="absolute rounded-full bg-[#EA4335]/8 blur-xl"
          style={{ width: size * 0.75, height: size * 0.75 }}
        />
      </div>

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-500 hover:scale-105 anim-float"
      >
        {/* Soft background aura circles */}
        <circle cx="60" cy="60" r="54" fill="#F8F9FA" stroke="#E5E7EB" strokeWidth="1" />
        <circle cx="60" cy="60" r="46" fill="#FFFFFF" stroke="#F1F3F4" strokeWidth="1" />

        {/* Shackle: Solidly CLOSED into sockets (Solid Security Lock) */}
        <path
          d="M44 56V40C44 31.1634 51.1634 24 60 24C68.8366 24 76 31.1634 76 40V56"
          stroke="#374151"
          strokeWidth="7"
          strokeLinecap="round"
          className="anim-shackle-close"
        />

        {/* Padlock Body Chassis */}
        <rect
          x="34"
          y="52"
          width="52"
          height="42"
          rx="12"
          fill="#111827"
        />

        {/* Top Metallic Bevel Highlight */}
        <path
          d="M34 62C34 56.4772 38.4772 52 44 52H76C81.5228 52 86 56.4772 86 62V65H34V62Z"
          fill="#1F2937"
        />

        {/* Precision Keyhole with Glow */}
        <circle cx="60" cy="70" r="4.2" fill="#FFFFFF" />
        <path
          d="M58 72L57 82H63L62 72H58Z"
          fill="#FFFFFF"
        />

        {/* Active Security Lock Status Indicator */}
        <circle cx="78" cy="60" r="3" fill="#EA4335" />
        <circle cx="78" cy="60" r="5" stroke="#EA4335" strokeWidth="1" strokeOpacity="0.5" className="animate-ping" />

        {/* Subtle Decorative Editorial Ring Accents */}
        <circle cx="28" cy="38" r="1.5" fill="#9CA3AF" />
        <circle cx="92" cy="82" r="1.5" fill="#9CA3AF" />
      </svg>
    </div>
  )
}

export function UnlockedIllustration({ className = '', size = 96 }: LockProps) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background active arena radiance */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full bg-[#34A853]/10 animate-ping"
          style={{ width: size * 0.9, height: size * 0.9, animationDuration: '3s' }}
        />
        <div
          className="absolute rounded-full bg-[#34A853]/12 blur-xl"
          style={{ width: size * 0.8, height: size * 0.8 }}
        />
      </div>

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-500 hover:scale-105 anim-float"
      >
        {/* Soft background glow with subtle green tint */}
        <circle cx="60" cy="60" r="54" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
        <circle cx="60" cy="60" r="46" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="1" />

        {/* Shackle: Unlocked - Popped Up and Rotated Open */}
        <path
          d="M44 48V34C44 25.1634 51.1634 18 60 18C68.8366 18 76 25.1634 76 34V42"
          stroke="#16A34A"
          strokeWidth="7"
          strokeLinecap="round"
          className="anim-shackle-open"
        />

        {/* Padlock Body Chassis */}
        <rect
          x="34"
          y="52"
          width="52"
          height="42"
          rx="12"
          fill="#15803D"
        />

        {/* Top Metallic Bevel Highlight */}
        <path
          d="M34 62C34 56.4772 38.4772 52 44 52H76C81.5228 52 86 56.4772 86 62V65H34V62Z"
          fill="#166534"
        />

        {/* Unlocked Radiant Checkmark */}
        <path
          d="M51 72.5L57 78.5L69 66"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Celebration Energy Sparkles */}
        <circle cx="26" cy="34" r="2.8" fill="#1A73E8" className="anim-sparkle" />
        <circle cx="94" cy="32" r="3.2" fill="#FBBC04" className="anim-sparkle" />
        <circle cx="90" cy="86" r="2.4" fill="#EA4335" className="anim-sparkle" />
        <circle cx="22" cy="78" r="2.2" fill="#34A853" className="anim-sparkle" />
      </svg>
    </div>
  )
}
