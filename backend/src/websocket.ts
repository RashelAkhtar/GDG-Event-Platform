import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import mongoose from 'mongoose';
import { User, UserRole } from './models/User.ts';
import { verifyToken } from './utils/jwt.ts';
import 'dotenv/config';

export interface WsMessage {
  type:
    | 'USER_JOIN'
    | 'USER_LEAVE'
    | 'START_COUNTDOWN'
    | 'GAME_LOCK_TOGGLE'
    | 'START_WINNER_CEREMONY'
    | 'NEW_WORD_OR_QUESTION'
    | 'RESET_GAME_LEADERBOARD'
    | 'SUBMIT_ATTEMPT'
    | 'LEADERBOARD_UPDATE'
    | 'BUBBLE_IMPULSE'
    | 'PING'
    | 'PONG'
    | 'SCREENSHOT_VIOLATION'
    | 'ADMIN_SECURITY_ALERT'
    | 'CLEAR_SECURITY_ALERTS'
    | 'SYNC_STATE';
  payload?: any;
}

export interface ConnectedSession {
  sessionId: string;
  userId?: string;
  name: string;
  avatar?: string;
  role?: string;
  device?: 'mobile' | 'desktop' | 'tablet';
  joinedAt: number;
}


export interface SecurityAlert {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  avatar?: string;
  gameSlug: string;
  gameTitle?: string;
  questionIndex?: number;
  warningCount: number;
  maxWarnings: number;
  isDisqualified: boolean;
  timestamp: string;
}

export interface LeaderboardEntryPayload {
  _id: string;
  totalScore: number;
  durationMs: number;
  submittedAt: string;
  user?: {
    _id?: string;
    name: string;
    avatar?: string;
  };
}

class EventWebSocketService {
  private wss: WebSocketServer | null = null;
  private sessions: Map<string, ConnectedSession> = new Map();
  private socketToSessionId: Map<WebSocket, string> = new Map();
  private socketPrincipals: Map<WebSocket, ConnectedSession> = new Map();
  private activeContestAttempts: Map<string, LeaderboardEntryPayload[]> = new Map([
    ['web-dev-quiz', []],
    ['mentis-quiz', []],
    ['wend-game', []],
  ]);
  private gameStates: Record<string, { isLocked: boolean; status: string }> = {
    'web-dev-quiz': { isLocked: false, status: 'LIVE' },
    'mentis-quiz': { isLocked: true, status: 'UPCOMING' },
    'wend-game': { isLocked: false, status: 'LIVE' },
  };
  private securityAlerts: SecurityAlert[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public init(server: HttpServer) {
    const allowedOrigins = new Set(
      [
        process.env.CLIENT_URL || 'http://localhost:3000',
        ...(process.env.CLIENT_URLS || '').split(','),
        'http://localhost:3000',
        'http://localhost:5173',
      ]
        .map((url) => {
          try {
            return new URL(url.trim()).origin;
          } catch {
            return null;
          }
        })
        .filter((origin): origin is string => origin !== null)
    );

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: ({ origin }, callback) => {
        const isLan =
          origin && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
        callback(!origin || allowedOrigins.has(origin) || Boolean(isLan), 403, 'Forbidden');
      },
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      ws.on('message', (data: string) => {
        try {
          const message: WsMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          console.error('[WebSocket] Invalid message format:', err);
        }
      });

      ws.on('close', () => {
        this.socketPrincipals.delete(ws);
        const sessId = this.socketToSessionId.get(ws);
        if (sessId) {
          this.socketToSessionId.delete(ws);
          this.sessions.delete(sessId);
          this.broadcast({
            type: 'USER_LEAVE',
            payload: { id: sessId, sessionId: sessId },
          });
        }
      });

      void this.initializeConnection(ws, request);
    });

    // Heartbeat ping every 25 seconds to keep LAN and mobile connections alive
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'PING' }));
        }
      });
    }, 25000);

    console.log('[WebSocket] Realtime multiplayer server initialized on path /ws');
  }

  private async initializeConnection(ws: WebSocket, request: IncomingMessage) {
    let principal: ConnectedSession | null = null;
    try {
      principal = await this.authenticateRequest(request);
    } catch (error) {
      console.error('[WebSocket] Failed to authenticate connection:', error);
    }

    if (ws.readyState !== WebSocket.OPEN) return;

    if (principal) {
      this.socketPrincipals.set(ws, principal);
      this.sessions.set(principal.sessionId, principal);
      this.socketToSessionId.set(ws, principal.sessionId);
    }

    // Convert active leaderboard map to object for client ingestion
    const leaderboardsObj: Record<string, LeaderboardEntryPayload[]> = {};
    for (const [slug, entries] of this.activeContestAttempts.entries()) {
      leaderboardsObj[slug] = entries;
    }

    this.sendTo(ws, {
      type: 'SYNC_STATE',
      payload: {
        sessions: Array.from(this.sessions.values()),
        users: Array.from(this.sessions.values()).map((s) => ({
          id: s.sessionId,
          name: s.name,
          avatar: s.avatar,
          role: s.role,
        })),
        gameStates: this.gameStates,
        leaderboards: leaderboardsObj,
        securityAlerts: this.securityAlerts,
      },
    });

    if (principal) {
      this.broadcast({ type: 'USER_JOIN', payload: principal });
    }
  }

  private async authenticateRequest(request: IncomingMessage): Promise<ConnectedSession | null> {
    let token: string | undefined;
    try {
      for (const part of (request.headers.cookie || '').split(';')) {
        const [name, ...valueParts] = part.trim().split('=');
        if (name === 'gdg_token' || name === 'token') {
          token = decodeURIComponent(valueParts.join('='));
          break;
        }
      }
    } catch {
      return null;
    }

    if (!token) return null;

    let decoded: ReturnType<typeof verifyToken>;
    try {
      decoded = verifyToken(token);
    } catch {
      return null;
    }

    if (!mongoose.Types.ObjectId.isValid(decoded.userId)) return null;

    const user = await User.findById(decoded.userId).select('_id name avatar role');
    if (!user) return null;

    // Detect user-agent device
    const ua = request.headers['user-agent'] || '';
    const isMobile = /mobile|iphone|android|ipad/i.test(ua);
    const device: 'mobile' | 'desktop' = isMobile ? 'mobile' : 'desktop';

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      sessionId,
      userId: user._id.toString(),
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      device,
      joinedAt: Date.now(),
    };
  }

  private handleMessage(ws: WebSocket, message: WsMessage) {
    switch (message.type) {
      case 'USER_JOIN': {
        const { sessionId, id, name, avatar, role, device } = message.payload || {};
        const sessId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const userObj: ConnectedSession = {
          sessionId: sessId,
          userId: id,
          name: name || 'Participant',
          avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'Participant')}`,
          role: role || 'PARTICIPANT',
          device: device || 'desktop',
          joinedAt: Date.now(),
        };

        this.sessions.set(sessId, userObj);
        this.socketToSessionId.set(ws, sessId);
        this.socketPrincipals.set(ws, userObj);

        this.broadcast({
          type: 'USER_JOIN',
          payload: userObj,
        });
        break;
      }

      case 'SUBMIT_ATTEMPT': {
        const { gameSlug, entry } = message.payload || {};
        if (gameSlug && entry) {
          const list = this.activeContestAttempts.get(gameSlug) || [];
          const participantId = entry.user?._id || entry._id;
          const filtered = list.filter((e) => (e.user?._id || e._id) !== participantId);
          const updated = [...filtered, entry];
          // Rank by highest totalScore first, then lowest durationMs
          updated.sort((a, b) => b.totalScore - a.totalScore || a.durationMs - b.durationMs);
          this.activeContestAttempts.set(gameSlug, updated);

          this.broadcast({
            type: 'LEADERBOARD_UPDATE',
            payload: { gameSlug, leaderboard: updated },
          });
        }
        break;
      }

      case 'SCREENSHOT_VIOLATION': {
        const payload = message.payload as Partial<SecurityAlert> | undefined;
        if (payload) {
          const alert: SecurityAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            userId: payload.userId,
            userName: payload.userName || 'Anonymous Participant',
            userEmail: payload.userEmail,
            avatar: payload.avatar,
            gameSlug: payload.gameSlug || 'quiz',
            gameTitle: payload.gameTitle || 'Quiz Challenge',
            questionIndex: payload.questionIndex,
            warningCount: payload.warningCount || 1,
            maxWarnings: 3,
            isDisqualified: Boolean(payload.warningCount && payload.warningCount >= 3),
            timestamp: payload.timestamp || new Date().toISOString(),
          };
          this.securityAlerts = [alert, ...this.securityAlerts.slice(0, 49)];
          console.log(`[SECURITY] Screenshot attempt by ${alert.userName} (${alert.userEmail || 'No email'}) - Warning ${alert.warningCount}/3`);
          this.broadcast({
            type: 'ADMIN_SECURITY_ALERT',
            payload: alert,
          });
        }
        break;
      }

      case 'CLEAR_SECURITY_ALERTS': {
        this.securityAlerts = [];
        this.broadcast({
          type: 'CLEAR_SECURITY_ALERTS',
          payload: {},
        });
        break;
      }

      case 'BUBBLE_IMPULSE': {
        // Broadcast subtle user flings/scatters in circle bucket
        this.broadcast({
          type: 'BUBBLE_IMPULSE',
          payload: message.payload,
        });
        break;
      }

      case 'GAME_LOCK_TOGGLE': {
        if (this.socketPrincipals.get(ws)?.role !== UserRole.ADMIN) break;
        const { gameSlug, isLocked, status } = message.payload || {};
        if (gameSlug) {
          this.gameStates[gameSlug] = { isLocked, status };
          this.broadcast({
            type: 'GAME_LOCK_TOGGLE',
            payload: { gameSlug, isLocked, status },
          });
        }
        break;
      }

      case 'START_COUNTDOWN': {
        if (this.socketPrincipals.get(ws)?.role !== UserRole.ADMIN) break;
        this.broadcast({
          type: 'START_COUNTDOWN',
          payload: message.payload,
        });
        break;
      }

      case 'START_WINNER_CEREMONY': {
        const enrichedPayload = {
          ...message.payload,
          broadcastId: message.payload?.broadcastId || `ceremony_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
        };
        this.broadcast({
          type: 'START_WINNER_CEREMONY',
          payload: enrichedPayload,
        });
        break;
      }

      case 'RESET_GAME_LEADERBOARD': {
        const gameSlug = message.payload?.gameSlug;
        if (gameSlug) {
          this.activeContestAttempts.set(gameSlug, []);
        } else {
          for (const key of this.activeContestAttempts.keys()) {
            this.activeContestAttempts.set(key, []);
          }
        }
        this.broadcast({
          type: 'RESET_GAME_LEADERBOARD',
          payload: message.payload,
        });
        this.broadcast({
          type: 'LEADERBOARD_UPDATE',
          payload: { gameSlug, leaderboard: [] },
        });
        break;
      }

      case 'NEW_WORD_OR_QUESTION': {
        if (this.socketPrincipals.get(ws)?.role !== UserRole.ADMIN) break;
        this.broadcast({
          type: 'NEW_WORD_OR_QUESTION',
          payload: message.payload,
        });
        break;
      }

      case 'PONG': {
        // Heartbeat response from client
        break;
      }

      default:
        break;
    }
  }

  public broadcast(message: WsMessage) {
    if (!this.wss) return;
    const data = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private sendTo(ws: WebSocket, message: WsMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export const wsService = new EventWebSocketService();
