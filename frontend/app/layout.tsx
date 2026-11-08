import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { GameCountdownOverlay } from '@/components/realtime/GameCountdownOverlay'
import { WinnerAnnouncementOverlay } from '@/components/realtime/WinnerAnnouncementOverlay'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'GDG Event Platform | Live Arena & Quizzes',
  description: 'Google Developer Groups Quiz & Competition Platform with Real-time WebSocket Arena',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('minecraft_dark_mode') === 'true') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAFAFA] dark:bg-[#080D1A] text-[#111827] dark:text-[#F9FAFB] transition-colors duration-500">
        <AuthProvider>
          <WebSocketProvider>
            {children}
            <GameCountdownOverlay />
            <WinnerAnnouncementOverlay />
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
