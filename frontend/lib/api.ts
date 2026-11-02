function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000/api/v1`
  }
  return 'http://localhost:5000/api/v1'
}

const API_BASE = getApiBase()

export interface User {
  _id: string
  googleId?: string
  email: string
  name: string
  avatar?: string
  role: 'USER' | 'ADMIN'
  createdAt?: string
}

export type EventStatus = 'DRAFT' | 'UPCOMING' | 'LIVE' | 'COMPLETED'
export type EventType = 'QUIZ'

export interface GdgEvent {
  _id: string
  title: string
  slug: string
  description: string
  type: EventType
  status: EventStatus
  bannerImage?: string
  startTime: string
  endTime: string
  createdBy?: string
}

export interface QuestionData {
  _id?: string
  questionText: string
  options: string[]
  correctOptionIndex?: number
  points?: number
  timeLimitSeconds?: number
  order: number
}

export interface LeaderboardEntry {
  _id: string
  totalScore: number
  durationMs: number
  submittedAt: string
  user: {
    _id?: string
    name: string
    avatar?: string
  }
}

export interface ParticipantSession {
  sessionId: string
  eventSlug?: string
  slug?: string
  eventTitle?: string
  userId?: string
  userName: string
  avatar?: string
  userAvatar?: string
  totalItems: number
  durationMs: number
  submittedAt: string
  status: 'SUBMITTED' | 'EVALUATED' | 'submitted' | 'evaluated'
  // Internal evaluation for admin only (never revealed to user)
  internalScore?: number
  internalCorrectCount?: number
  answers?: Record<string, unknown>
}

export interface CeremonyWinner {
  rank: 1 | 2 | 3
  name: string
  avatar: string
  score: number
  durationMs: number
  correctCount?: number
  totalItems?: number
  tieBrokenByTime?: boolean
}

export interface RankedParticipant {
  rank: number
  id: string
  name: string
  avatar: string
  score: number
  correctCount: number
  totalItems: number
  durationMs: number
  submittedAt: string
  tieBrokenByTime?: boolean
  tiedWithAbove?: boolean
  timeDiffVsTiedMs?: number
}

// Built-in fallback mock events for Web & Mentis so the UI renders seamlessly even before DB seed
export const DEFAULT_WEB_EVENT: GdgEvent = {
  _id: 'web-dev-quiz-id',
  title: 'Web Dev Sprint 2026',
  slug: 'web-dev-quiz',
  description: 'Test your frontend & fullstack skills in this live Google Developer Groups quiz.',
  type: 'QUIZ',
  status: 'LIVE',
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
}

export const DEFAULT_MENTIS_EVENT: GdgEvent = {
  _id: 'mentis-quiz-id',
  title: 'Mentis Mind Challenge',
  slug: 'mentis-quiz',
  description: 'Logic, AI algorithms, and developer aptitude test. Unlocked by chapter mentors.',
  type: 'QUIZ',
  status: 'UPCOMING',
  startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
  endTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
}

export const DEFAULT_WEND_EVENT: GdgEvent = {
  _id: 'wend-game-id',
  title: 'Wend Word Puzzle Arena',
  slug: 'wend-game',
  description: 'Fast-paced word puzzle challenge. Decode technical keywords from real-time clues.',
  type: 'QUIZ',
  status: 'LIVE',
  startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
  endTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
}

export const DEFAULT_QUESTIONS: Record<string, QuestionData[]> = {
  'web-dev-quiz': [
    {
      _id: 'q_web_1',
      questionText: 'Which React 19 hook allows reading async resources or promises directly during render?',
      options: ['use() hook', 'useResource()', 'usePromise()', 'useMemo()'],
      correctOptionIndex: 0,
      points: 100,
      timeLimitSeconds: 30,
      order: 1,
    },
    {
      _id: 'q_web_2',
      questionText: 'In Next.js 15 App Router, what is the default caching behavior for fetch requests?',
      options: ['force-cache', 'no-store (uncached by default)', 'cache-first', 'stale-while-revalidate'],
      correctOptionIndex: 1,
      points: 100,
      timeLimitSeconds: 30,
      order: 2,
    },
    {
      _id: 'q_web_3',
      questionText: 'Which CSS property enables GPU hardware acceleration for smooth 60fps animations?',
      options: ['transform: translateZ(0)', 'position: absolute', 'display: flex', 'float: left'],
      correctOptionIndex: 0,
      points: 100,
      timeLimitSeconds: 30,
      order: 3,
    },
    {
      _id: 'q_web_4',
      questionText: 'What protocol upgrade provides bidirectional, full-duplex communication over a single TCP connection?',
      options: ['HTTP/1.1 Keep-Alive', 'WebSocket (ws://)', 'Server-Sent Events (SSE)', 'DNS over HTTPS'],
      correctOptionIndex: 1,
      points: 100,
      timeLimitSeconds: 30,
      order: 4,
    },
  ],
  'mentis-quiz': [
    {
      _id: 'q_mentis_1',
      questionText: "What core self-attention mechanism powers Google's Gemini and Transformer architectures?",
      options: ['Scaled Dot-Product Attention', 'Recurrent Hidden State', 'Convolutional Kernel Filtering', 'Heuristic Search'],
      correctOptionIndex: 0,
      points: 100,
      timeLimitSeconds: 30,
      order: 1,
    },
    {
      _id: 'q_mentis_2',
      questionText: 'In algorithm analysis, which data structure provides O(1) average lookup and insertion time?',
      options: ['Hash Map / Hash Table', 'Binary Search Tree', 'Linked List', 'Min-Heap'],
      correctOptionIndex: 0,
      points: 100,
      timeLimitSeconds: 30,
      order: 2,
    },
    {
      _id: 'q_mentis_3',
      questionText: 'What technique dynamically enhances LLM prompt context using vector embeddings similarity?',
      options: ['RAG (Retrieval-Augmented Generation)', 'Model Pruning', 'Quantization (int8)', 'Backpropagation'],
      correctOptionIndex: 0,
      points: 100,
      timeLimitSeconds: 30,
      order: 3,
    },
    {
      _id: 'q_mentis_4',
      questionText: 'What is the worst-case time complexity of standard unoptimized QuickSort?',
      options: ['O(n log n)', 'O(n²)', 'O(log n)', 'O(n)'],
      correctOptionIndex: 1,
      points: 100,
      timeLimitSeconds: 30,
      order: 4,
    },
  ],
}

export const DEFAULT_LEADERBOARD: Record<string, LeaderboardEntry[]> = {
  'web-dev-quiz': [],
  'mentis-quiz': [],
  'wend-game': [],
}

export const api = {
  async getMe(): Promise<{ success: boolean; user?: User }> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return { success: false }
      const data = await res.json()
      return data
    } catch {
      return { success: false }
    }
  },

  async logout(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      return res.ok
    } catch {
      return false
    }
  },

  async adminLogin(email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      return data
    } catch {
      // Local fallback for dev
      if (email.toLowerCase() === 'aryan.crores@gmail.com' && password === 'DHRITIDULJITNOSHIN') {
        const adminUser: User = {
          _id: 'admin_master_aryan',
          email: 'aryan.crores@gmail.com',
          name: 'Aryan (Admin)',
          avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Aryan&backgroundColor=1a73e8&textColor=ffffff',
          role: 'ADMIN',
        }
        return { success: true, user: adminUser }
      }
      return { success: false, message: 'Invalid admin credentials' }
    }
  },

  async getEvents(): Promise<GdgEvent[]> {
    let events = [DEFAULT_WEB_EVENT, DEFAULT_MENTIS_EVENT, DEFAULT_WEND_EVENT]
    try {
      const res = await fetch(`${API_BASE}/events`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data) && json.data.length > 0) {
          events = json.data
        }
      }
    } catch {}

    if (typeof window !== 'undefined') {
      return events.map((ev) => {
        try {
          const stored = localStorage.getItem(`gdg_event_custom_${ev._id}`)
          if (stored) return { ...ev, ...JSON.parse(stored) }
        } catch {}
        return ev
      })
    }
    return events
  },

  async getEventBySlug(slug: string): Promise<GdgEvent | null> {
    try {
      const res = await fetch(`${API_BASE}/events/${slug}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`gdg_event_custom_${json.data._id}`)
            if (stored) return { ...json.data, ...JSON.parse(stored) }
          }
          return json.data
        }
      }
    } catch {}

    let fallback: GdgEvent | null = null
    if (slug === DEFAULT_WEB_EVENT.slug) fallback = DEFAULT_WEB_EVENT
    else if (slug === DEFAULT_MENTIS_EVENT.slug) fallback = DEFAULT_MENTIS_EVENT
    else if (slug === DEFAULT_WEND_EVENT.slug) fallback = DEFAULT_WEND_EVENT

    if (fallback && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`gdg_event_custom_${fallback._id}`)
        if (stored) return { ...fallback, ...JSON.parse(stored) }
      } catch {}
    }
    return fallback
  },

  async updateEventStatus(eventId: string, status: EventStatus): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return res.ok
    } catch {
      return false
    }
  },

  async updateEventDetails(eventId: string, updates: Partial<GdgEvent>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`gdg_event_custom_${eventId}`)
        const current = stored ? JSON.parse(stored) : {}
        localStorage.setItem(`gdg_event_custom_${eventId}`, JSON.stringify({ ...current, ...updates }))
      }
      return res.ok
    } catch {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`gdg_event_custom_${eventId}`)
        const current = stored ? JSON.parse(stored) : {}
        localStorage.setItem(`gdg_event_custom_${eventId}`, JSON.stringify({ ...current, ...updates }))
      }
      return true
    }
  },

  async startQuiz(eventId: string): Promise<{ success: boolean; questions?: QuestionData[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/quiz/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (res.ok) {
        return { success: true, questions: json.data?.questions }
      }
      return { success: false, message: json.message }
    } catch {
      return { success: false, message: 'Could not connect to quiz service' }
    }
  },

  async submitQuiz(
    eventId: string,
    answers: { questionId: string; selectedOptionIndex: number }[]
  ): Promise<{ success: boolean; data?: unknown; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/quiz/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const json = await res.json()
      return { success: res.ok, data: json.data, message: json.message }
    } catch {
      return { success: false, message: 'Failed to submit quiz' }
    }
  },

  getLocalLeaderboard(slug: string): LeaderboardEntry[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`gdg_leaderboard_${slug}`)
      if (stored) {
        try {
          const list = JSON.parse(stored)
          if (Array.isArray(list)) return list
        } catch {}
      }
    }
    return []
  },

  recordLocalAttempt(slug: string, entry: LeaderboardEntry): void {
    if (typeof window !== 'undefined') {
      const existing = api.getLocalLeaderboard(slug)
      const filtered = existing.filter((e) => e._id !== entry._id)
      const updated = [...filtered, entry]
      // Rank by highest score first, shortest duration second
      updated.sort((a, b) => b.totalScore - a.totalScore || a.durationMs - b.durationMs)
      localStorage.setItem(`gdg_leaderboard_${slug}`, JSON.stringify(updated))
    }
  },

  async getLeaderboard(eventId: string, slug?: string): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/leaderboard`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data) && json.data.length > 0) return json.data
      }
    } catch {}

    if (slug) {
      return api.getLocalLeaderboard(slug)
    }
    return []
  },

  getQuestionsForSlug(slug: string): QuestionData[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`gdg_questions_${slug}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {}
      }
    }
    return DEFAULT_QUESTIONS[slug] || []
  },

  saveQuestionsForSlug(slug: string, questions: QuestionData[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gdg_questions_${slug}`, JSON.stringify(questions))
    }
  },

  getWendWords(): WendWord[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gdg_wend_words')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {}
      }
    }
    return DEFAULT_WEND_WORDS
  },

  saveWendWords(words: WendWord[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gdg_wend_words', JSON.stringify(words))
    }
  },

  saveParticipantSession(slug: string, session: ParticipantSession): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gdg_user_session_${slug}`, JSON.stringify(session))
      const allKey = `gdg_all_sessions_${slug}`
      const existingStr = localStorage.getItem(allKey)
      let all: ParticipantSession[] = []
      if (existingStr) {
        try {
          all = JSON.parse(existingStr)
        } catch {}
      }
      all = all.filter((s) => s.sessionId !== session.sessionId)
      all.push(session)
      localStorage.setItem(allKey, JSON.stringify(all))
    }
  },

  getParticipantSession(slug: string): ParticipantSession | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`gdg_user_session_${slug}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {}
      }
    }
    return null
  },

  getAllSessionsForSlug(slug: string): ParticipantSession[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`gdg_all_sessions_${slug}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {}
      }
    }
    return []
  },

  clearSessionsForSlug(slug: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`gdg_all_sessions_${slug}`)
      localStorage.removeItem(`gdg_leaderboard_${slug}`)
      localStorage.removeItem(`gdg_user_session_${slug}`)
      localStorage.removeItem(`gdg_active_session_${slug}`)
      localStorage.removeItem(`gdg_quiz_attempt_${slug}`)
      if (slug === 'wend-game') {
        localStorage.removeItem('gdg_user_session_wend-game')
        localStorage.removeItem('gdg_wend_session')
      }
    }
  },

  async resetLeaderboard(eventId?: string, slug?: string): Promise<{ success: boolean; message?: string }> {
    if (slug) {
      api.clearSessionsForSlug(slug)
    }
    if (eventId && eventId !== 'event-id') {
      try {
        const res = await fetch(`${API_BASE}/events/${eventId}/leaderboard`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (res.ok) {
          const json = await res.json()
          return { success: true, message: json.message }
        }
      } catch {}
    }
    return { success: true, message: 'Local standings and sessions cleared.' }
  },

  simulateTieTestSessions(slug: string): void {
    if (typeof window === 'undefined') return

    const now = Date.now()
    const sampleSessions: ParticipantSession[] = [
      {
        sessionId: `sess_test_aarav_${now}`,
        eventSlug: slug,
        userName: 'Aarav Sharma',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aarav',
        totalItems: 5,
        durationMs: 11200, // 11.2s (Fastest with 5/5)
        submittedAt: new Date(now - 120000).toISOString(),
        status: 'SUBMITTED',
        internalScore: 500,
        internalCorrectCount: 5,
      },
      {
        sessionId: `sess_test_priya_${now}`,
        eventSlug: slug,
        userName: 'Priya Patel',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya',
        totalItems: 5,
        durationMs: 14800, // 14.8s (Tied on 5/5, but 3.6s slower -> 2nd)
        submittedAt: new Date(now - 90000).toISOString(),
        status: 'SUBMITTED',
        internalScore: 500,
        internalCorrectCount: 5,
      },
      {
        sessionId: `sess_test_rohan_${now}`,
        eventSlug: slug,
        userName: 'Rohan Gupta',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rohan',
        totalItems: 5,
        durationMs: 9100, // 9.1s (Fastest overall, but 4/5 correct -> 3rd by Priority 1)
        submittedAt: new Date(now - 60000).toISOString(),
        status: 'SUBMITTED',
        internalScore: 400,
        internalCorrectCount: 4,
      },
      {
        sessionId: `sess_test_sneha_${now}`,
        eventSlug: slug,
        userName: 'Sneha Rao',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sneha',
        totalItems: 5,
        durationMs: 16500, // 16.5s (3/5 correct -> 4th)
        submittedAt: new Date(now - 30000).toISOString(),
        status: 'SUBMITTED',
        internalScore: 300,
        internalCorrectCount: 3,
      },
    ]

    localStorage.setItem(`gdg_all_sessions_${slug}`, JSON.stringify(sampleSessions))
  },

  getAutomatedRankings(slug: string, extraEntries?: LeaderboardEntry[]): {
    winners: CeremonyWinner[]
    rankedStandings: LeaderboardEntry[]
    rankedParticipants: RankedParticipant[]
  } {
    if (typeof window === 'undefined') {
      return { winners: [], rankedStandings: [], rankedParticipants: [] }
    }

    const sessions = api.getAllSessionsForSlug(slug)
    const localLb = api.getLocalLeaderboard(slug)

    // Deduplicate by participant identifier (userId or normalized userName)
    const participantMap = new Map<string, RankedParticipant>()

    // Ingest all participant session receipts
    for (const s of sessions) {
      const key = (s.userId && s.userId.trim()) || s.userName.trim().toLowerCase()
      if (!key) continue

      const score = s.internalScore ?? 0
      const correctCount = s.internalCorrectCount ?? (score > 0 ? Math.floor(score / 100) : 0)
      const durationMs = s.durationMs || 0
      const totalItems = s.totalItems || 5
      const submittedAt = s.submittedAt || new Date().toISOString()
      const avatar =
        s.userAvatar ||
        s.avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(s.userName)}`

      const existing = participantMap.get(key)
      if (!existing) {
        participantMap.set(key, {
          rank: 0,
          id: s.sessionId || key,
          name: s.userName,
          avatar,
          score,
          correctCount,
          totalItems,
          durationMs,
          submittedAt,
        })
      } else {
        // Keep best attempt: Higher score first, or lower duration if scores are tied
        const isBetter =
          score > existing.score ||
          (score === existing.score && durationMs < existing.durationMs)
        if (isBetter) {
          participantMap.set(key, {
            ...existing,
            id: s.sessionId || existing.id,
            name: s.userName,
            avatar,
            score,
            correctCount,
            totalItems,
            durationMs,
            submittedAt,
          })
        }
      }
    }

    // Ingest local leaderboard entries
    for (const lb of localLb) {
      const uName = lb.user?.name || 'Participant'
      const key = (lb.user?._id && lb.user._id.trim()) || uName.trim().toLowerCase()
      if (!key) continue

      const score = lb.totalScore || 0
      const durationMs = lb.durationMs || 0
      const correctCount = Math.floor(score / 100)
      const submittedAt = lb.submittedAt || new Date().toISOString()
      const avatar =
        lb.user?.avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uName)}`

      const existing = participantMap.get(key)
      if (!existing) {
        participantMap.set(key, {
          rank: 0,
          id: lb._id || key,
          name: uName,
          avatar,
          score,
          correctCount,
          totalItems: 5,
          durationMs,
          submittedAt,
        })
      } else {
        const isBetter =
          score > existing.score ||
          (score === existing.score && durationMs < existing.durationMs)
        if (isBetter) {
          participantMap.set(key, {
            ...existing,
            score: Math.max(existing.score, score),
            durationMs: Math.min(existing.durationMs || durationMs, durationMs),
          })
        }
      }
    }

    // Ingest extra live/websocket entries
    if (extraEntries && extraEntries.length > 0) {
      for (const lb of extraEntries) {
        const uName = lb.user?.name || 'Participant'
        const key = (lb.user?._id && lb.user._id.trim()) || uName.trim().toLowerCase()
        if (!key) continue

        const score = lb.totalScore || 0
        const durationMs = lb.durationMs || 0
        const correctCount = Math.floor(score / 100)
        const submittedAt = lb.submittedAt || new Date().toISOString()
        const avatar =
          lb.user?.avatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uName)}`

        const existing = participantMap.get(key)
        if (!existing) {
          participantMap.set(key, {
            rank: 0,
            id: lb._id || key,
            name: uName,
            avatar,
            score,
            correctCount,
            totalItems: 5,
            durationMs,
            submittedAt,
          })
        } else {
          const isBetter =
            score > existing.score ||
            (score === existing.score && durationMs < existing.durationMs)
          if (isBetter) {
            participantMap.set(key, {
              ...existing,
              score: Math.max(existing.score, score),
              durationMs: Math.min(existing.durationMs || durationMs, durationMs),
            })
          }
        }
      }
    }

    const list = Array.from(participantMap.values())

    // === STRICT TWO-TIER RANKING ALGORITHM ===
    // Priority 1: Correct answers count / total score (DESCENDING: highest score wins)
    // Priority 2: Duration in milliseconds (ASCENDING: faster time wins ties)
    // Priority 3: Submission timestamp (ASCENDING: earlier submission breaks exact ties)
    list.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score // Priority 1: Higher score / more correct answers
      }
      if (a.durationMs !== b.durationMs) {
        return a.durationMs - b.durationMs // Priority 2: Faster time wins tie
      }
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    })

    // Assign sequential ranks and flag tie-breaker comparisons
    for (let i = 0; i < list.length; i++) {
      list[i].rank = i + 1
      if (i > 0) {
        const prev = list[i - 1]
        if (prev.score === list[i].score) {
          list[i].tiedWithAbove = true
          list[i].tieBrokenByTime = true
          prev.tieBrokenByTime = true
          list[i].timeDiffVsTiedMs = Math.abs(list[i].durationMs - prev.durationMs)
        }
      }
    }

    // Top 3 winners for the suspense ceremony
    const winners: CeremonyWinner[] = list.slice(0, 3).map((p) => ({
      rank: p.rank as 1 | 2 | 3,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      durationMs: p.durationMs,
      correctCount: p.correctCount,
      totalItems: p.totalItems,
      tieBrokenByTime: p.tieBrokenByTime,
    }))

    // Format full leaderboard list for broadcast
    const rankedStandings: LeaderboardEntry[] = list.map((p) => ({
      _id: p.id,
      totalScore: p.score,
      durationMs: p.durationMs,
      submittedAt: p.submittedAt,
      user: {
        _id: p.id,
        name: p.name,
        avatar: p.avatar,
      },
    }))

    return { winners, rankedStandings, rankedParticipants: list }
  },

  getWendBoard(): WendBoardConfig {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gdg_wend_board_config')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {}
      }
    }
    return DEFAULT_WEND_BOARD
  },

  saveWendBoard(board: WendBoardConfig): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gdg_wend_board_config', JSON.stringify(board))
    }
  },

  resetWendBoard(): WendBoardConfig {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gdg_wend_board_config')
    }
    return DEFAULT_WEND_BOARD
  },

  setWendTimeLimit(seconds: number): WendBoardConfig {
    const board = api.getWendBoard()
    const updated: WendBoardConfig = { ...board, timeLimitSeconds: Math.max(10, seconds) }
    api.saveWendBoard(updated)
    return updated
  },
}

export type CellType = 'LETTER' | 'OBSTACLE'

export interface GridCell {
  row: number
  col: number
  type: CellType
  letter?: string
}

export interface WendTargetWord {
  id: string
  word: string
  hint?: string
}

export interface WendWordColor {
  id: number
  name: string
  bg: string
  border: string
  text: string
  ring: string
  hex: string
}

export interface DiscoveredWordRecord {
  wordId: string
  word: string
  colorIndex: number
  path: { row: number; col: number }[]
}

export const WEND_PASTEL_PALETTE: WendWordColor[] = [
  { id: 0, name: 'Emerald', bg: 'bg-[#E6F4EA]', border: 'border-[#34A853]', text: 'text-[#137333]', ring: 'ring-[#34A853]/40', hex: '#34A853' },
  { id: 1, name: 'Azure', bg: 'bg-[#E8F0FE]', border: 'border-[#1A73E8]', text: 'text-[#1967D2]', ring: 'ring-[#1A73E8]/40', hex: '#1A73E8' },
  { id: 2, name: 'Amber', bg: 'bg-[#FEF7E0]', border: 'border-[#FBBC04]', text: 'text-[#B06000]', ring: 'ring-[#FBBC04]/40', hex: '#FBBC04' },
  { id: 3, name: 'Purple', bg: 'bg-[#F3E8FD]', border: 'border-[#A142F4]', text: 'text-[#7627BB]', ring: 'ring-[#A142F4]/40', hex: '#A142F4' },
  { id: 4, name: 'Coral', bg: 'bg-[#FCE8E6]', border: 'border-[#EA4335]', text: 'text-[#C5221F]', ring: 'ring-[#EA4335]/40', hex: '#EA4335' },
  { id: 5, name: 'Teal', bg: 'bg-[#E0F2F1]', border: 'border-[#009688]', text: 'text-[#00695C]', ring: 'ring-[#009688]/40', hex: '#009688' },
]

export interface WendBoardConfig {
  id: string
  title: string
  description: string
  rows: number
  cols: number
  grid: GridCell[][]
  targetWords: WendTargetWord[]
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  timeLimitSeconds?: number
}

// 8x8 Reference Board Layout matching user screenshot (H and I cutout obstacles)
const REFERENCE_LETTERS_MATRIX: (string | null)[][] = [
  ['C', 'H', 'H', 'I', 'N', 'G', 'R', 'S'],
  ['T', 'I', 'I', 'K', 'M', 'E', 'E', 'H'],
  [null, 'H', null, 'U', 'S', 'M', 'B', 'I'],
  [null, null, null, 'S', null, null, null, 'P'],
  [null, 'H', null, 'H', 'I', null, 'I', 'N'],
  ['G', 'I', 'P', 'P', null, null, null, 'H'],
  ['H', 'S', 'A', 'H', 'I', 'R', 'E', 'I'],
  ['L', 'I', 'G', 'H', 'T', 'T', 'I', 'B'],
]

export const DEFAULT_TARGET_WORDS: WendTargetWord[] = [
  { id: 'tw-1', word: 'INHI', hint: 'Traced on the right corridor (I > N > H > I)' },
  { id: 'tw-2', word: 'LIGHT', hint: 'Spelled horizontally along the bottom row' },
  { id: 'tw-3', word: 'CHING', hint: 'Spelled across the top row from left to right' },
  { id: 'tw-4', word: 'SAHIRE', hint: 'Spelled across the lower section' },
  { id: 'tw-5', word: 'INHIBIT', hint: 'Snake downward through the right column into corner' },
]

export const DEFAULT_WEND_BOARD: WendBoardConfig = {
  id: 'board-reference-hi',
  title: 'H & I Maze Corridor',
  description: 'Trace technical path words through the maze corridors without hitting obstacle blocks.',
  rows: 8,
  cols: 8,
  difficulty: 'MEDIUM',
  timeLimitSeconds: 120,
  targetWords: DEFAULT_TARGET_WORDS,
  grid: REFERENCE_LETTERS_MATRIX.map((rowArr, r) =>
    rowArr.map((val, c) => ({
      row: r,
      col: c,
      type: val === null ? 'OBSTACLE' : 'LETTER',
      letter: val === null ? undefined : val,
    }))
  ),
}

// DFS Orthogonal Path Validator (ensures words are solvable on the grid)
export function findWordPathInGrid(
  word: string,
  grid: GridCell[][]
): { row: number; col: number }[] | null {
  const upper = word.toUpperCase().trim()
  if (!upper || grid.length === 0) return null
  const rows = grid.length
  const cols = grid[0].length

  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

  const dfs = (
    r: number,
    c: number,
    idx: number,
    path: { row: number; col: number }[]
  ): { row: number; col: number }[] | null => {
    if (idx === upper.length) return path
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null
    if (visited[r][c]) return null
    const cell = grid[r][c]
    if (cell.type === 'OBSTACLE' || cell.letter?.toUpperCase() !== upper[idx]) return null

    visited[r][c] = true
    path.push({ row: r, col: c })

    if (path.length === upper.length) {
      return path
    }

    const deltas = [
      [-1, 0], // Up
      [1, 0],  // Down
      [0, -1], // Left
      [0, 1],  // Right
    ]

    for (const [dr, dc] of deltas) {
      const res = dfs(r + dr, c + dc, idx + 1, path)
      if (res) return res
    }

    path.pop()
    visited[r][c] = false
    return null
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === 'LETTER' && grid[r][c].letter?.toUpperCase() === upper[0]) {
        const path = dfs(r, c, 0, [])
        if (path) return path
      }
    }
  }

  return null
}

// Deprecated legacy interface kept for backwards compatibility
export interface WendWord {
  id: string
  word: string
  clue: string
  points: number
  round: number
}
export const DEFAULT_WEND_WORDS: WendWord[] = []

