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
    | 'SYNC_STATE';
  payload?: any;
}

interface ConnectedUser {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  joinedAt: number;
}

class EventWebSocketService {
  private wss: WebSocketServer | null = null;
  private users: Map<string, ConnectedUser> = new Map();
  private socketToUserId: Map<WebSocket, string> = new Map();
  private socketPrincipals: Map<WebSocket, ConnectedUser> = new Map();
  private gameStates: Record<string, { isLocked: boolean; status: string }> = {
    'web-dev-quiz': { isLocked: false, status: 'LIVE' },
    'mentis-quiz': { isLocked: true, status: 'UPCOMING' },
    'wend-game': { isLocked: false, status: 'LIVE' },
  };

  public init(server: HttpServer) {
    const allowedOrigins = new Set([
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5173',
    ]);

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: ({ origin }, callback) => {
        callback(Boolean(origin && allowedOrigins.has(origin)), 403, 'Forbidden');
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
        const userId = this.socketToUserId.get(ws);
        if (userId) {
          this.socketToUserId.delete(ws);
          this.users.delete(userId);
          this.broadcast({
            type: 'USER_LEAVE',
            payload: { id: userId },
          });
        }
      });

      void this.initializeConnection(ws, request);
    });

    console.log('[WebSocket] Realtime server initialized on path /ws');
  }

  private async initializeConnection(ws: WebSocket, request: IncomingMessage) {
    let principal: ConnectedUser | null = null;
    try {
      principal = await this.authenticateRequest(request);
    } catch (error) {
      console.error('[WebSocket] Failed to authenticate connection:', error);
    }

    if (ws.readyState !== WebSocket.OPEN) return;

    if (principal) {
      this.socketPrincipals.set(ws, principal);
      if (principal.role !== UserRole.ADMIN) {
        this.users.set(principal.id, principal);
        this.socketToUserId.set(ws, principal.id);
      }
    }

    this.sendTo(ws, {
      type: 'SYNC_STATE',
      payload: {
        users: Array.from(this.users.values()),
        gameStates: this.gameStates,
      },
    });

    if (principal && principal.role !== UserRole.ADMIN) {
      this.broadcast({ type: 'USER_JOIN', payload: principal });
    }
  }

  private async authenticateRequest(request: IncomingMessage): Promise<ConnectedUser | null> {
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

    return {
      id: user._id.toString(),
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      joinedAt: Date.now(),
    };
  }

  private handleMessage(ws: WebSocket, message: WsMessage) {
    switch (message.type) {
      case 'USER_JOIN':
        break;

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
        if (this.socketPrincipals.get(ws)?.role !== UserRole.ADMIN) break;
        this.broadcast({
          type: 'START_WINNER_CEREMONY',
          payload: message.payload,
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
