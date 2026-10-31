import React from 'react'

export function GoogleG({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}

export function GdgLogoBadge() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full bg-[#EA4335]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#FBBC04]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
    </div>
  )
}

interface GoogleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
}

export function GoogleButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: GoogleButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A73E8] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const style =
    variant === 'primary'
      ? 'bg-[#1A73E8] text-white hover:bg-[#1765CC] shadow-xs hover:shadow-md'
      : 'border border-[#DADCE0] bg-white text-[#3C4043] hover:bg-[#F8F9FA] hover:border-[#BDC1C6]'

  return (
    <button className={`${base} ${style} ${className}`} {...props}>
      {children}
    </button>
  )
}
