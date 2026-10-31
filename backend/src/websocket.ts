import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

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
  private gameStates: Record<string, { isLocked: boolean; status: string }> = {
    'web-dev-quiz': { isLocked: false, status: 'LIVE' },
    'mentis-quiz': { isLocked: true, status: 'UPCOMING' },
    'wend-game': { isLocked: false, status: 'LIVE' },
  };

  public init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      // Send initial state to newly connected client
      this.sendTo(ws, {
        type: 'SYNC_STATE',
        payload: {
          users: Array.from(this.users.values()),
          gameStates: this.gameStates,
        },
      });

      ws.on('message', (data: string) => {
        try {
          const message: WsMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          console.error('[WebSocket] Invalid message format:', err);
        }
      });

      ws.on('close', () => {
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
    });

    console.log('[WebSocket] Realtime server initialized on path /ws');
  }

  private handleMessage(ws: WebSocket, message: WsMessage) {
    switch (message.type) {
      case 'USER_JOIN': {
        const { id, name, avatar, role, email } = message.payload || {};
        // STRICTLY EXCLUDE ADMIN FROM PARTICIPANT BUCKET
        const isAdmin =
          role === 'ADMIN' ||
          email === process.env.ADMIN_EMAIL ||
          name?.includes('(Admin)');
        if (isAdmin) {
          break;
        }

        if (id && name) {
          const userObj: ConnectedUser = { id, name, avatar, role, joinedAt: Date.now() };
          this.users.set(id, userObj);
          this.socketToUserId.set(ws, id);
          // Broadcast to all clients (including sender) to drop the bubble
          this.broadcast({
            type: 'USER_JOIN',
            payload: userObj,
          });
        }
        break;
      }

      case 'GAME_LOCK_TOGGLE': {
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
        // Admin triggered 5-4-3-2-1 quiz countdown
        this.broadcast({
          type: 'START_COUNTDOWN',
          payload: message.payload, // e.g. { gameSlug: 'web-dev-quiz', seconds: 5 }
        });
        break;
      }

      case 'START_WINNER_CEREMONY': {
        // Admin triggered 5-4-3-2-1 winner ceremony
        this.broadcast({
          type: 'START_WINNER_CEREMONY',
          payload: message.payload,
        });
        break;
      }

      case 'NEW_WORD_OR_QUESTION': {
        // Admin created new question or word puzzle
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
