import { type Request, type Response, type NextFunction } from 'express';
import { EventService } from '../services/event.service.ts';
import { UserRole, type IUser } from '../models/User.ts';
import { EventType } from '../models/Event.ts';
import mongoose, { Types } from 'mongoose';
import { wsService } from '../websocket.ts';
import { WendBoard } from '../models/WendBoard.ts';

export const inMemoryEvents: Record<string, any> = {
  'web-dev-quiz': {
    _id: 'web-dev-quiz-id',
    title: 'Web Dev Blitz Quiz',
    slug: 'web-dev-quiz',
    description: 'Frontend fundamentals, CSS tricks & JavaScript core concepts.',
    type: 'QUIZ',
    status: 'LIVE',
    startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
  },
  'wend-game': {
    _id: 'wend-game-id',
    title: 'Wend Word Puzzle Arena',
    slug: 'wend-game',
    description: 'Fast-paced word puzzle challenge. Decode technical keywords from real-time clues.',
    type: 'QUIZ',
    status: 'LIVE',
    startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
  },
  'mentis-quiz': {
    _id: 'mentis-quiz-id',
    title: 'Mentis Logic & Algo Quiz',
    slug: 'mentis-quiz',
    description: 'Algorithmic reasoning, data structures & brain-teasing puzzles.',
    type: 'QUIZ',
    status: 'UPCOMING',
    startTime: new Date(Date.now() + 1800 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
  },
};

const getParam = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getUser = (req: Request): IUser | undefined => req.user as unknown as IUser | undefined;

const isValidDateRange = (startTime: unknown, endTime: unknown): boolean => {
  const start = new Date(startTime as string).getTime();
  const end = new Date(endTime as string).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start < end;
};

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, type, bannerImage, startTime, endTime } = req.body ?? {};

    // slug is no longer required in req.body
    if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim() ||
        typeof type !== 'string' || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (type !== EventType.QUIZ) {
      return res.status(400).json({ success: false, message: `type must be one of: ${Object.values(EventType).join(', ')}` });
    }
    if (!isValidDateRange(startTime, endTime)) {
      return res.status(400).json({ success: false, message: 'endTime must be a valid date later than startTime' });
    }

    const admin = getUser(req);
    if (!admin) return res.status(401).json({ success: false, message: 'Authentication required' });

    const event = await EventService.createEvent(
      { title, description, type, bannerImage, startTime, endTime },
      admin._id
    );

    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getEvents = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const isAdmin = getUser(req)?.role === UserRole.ADMIN;
    const events = await EventService.getAllEvents(isAdmin);
    if (Array.isArray(events) && events.length > 0) {
      return res.status(200).json({ success: true, count: events.length, data: events });
    }
  } catch {}

  // Resilient fallback events synchronized with real-time state
  const syncedEvents = Object.values(inMemoryEvents).map((ev: any) => {
    const liveState = wsService.getGameState(ev.slug);
    return {
      ...ev,
      status: liveState ? liveState.status : ev.status,
    };
  });

  res.status(200).json({
    success: true,
    count: syncedEvents.length,
    data: syncedEvents,
  });
};

export const getEventBySlug = async (req: Request, res: Response, _next: NextFunction) => {
  const slug = getParam(req.params.slug);
  if (!slug) return res.status(400).json({ success: false, message: 'Invalid event slug' });

  try {
    const event = await EventService.getEventBySlug(slug, getUser(req)?.role === UserRole.ADMIN);
    if (event) {
      return res.status(200).json({ success: true, data: event });
    }
  } catch {}

  // Resilient fallback for default events
  if (inMemoryEvents[slug]) {
    const liveState = wsService.getGameState(slug);
    return res.status(200).json({
      success: true,
      data: {
        ...inMemoryEvents[slug],
        status: liveState ? liveState.status : inMemoryEvents[slug].status,
      },
    });
  }

  res.status(404).json({ success: false, message: 'Event not found' });
};

export const getWendBoardConfig = async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    if (mongoose.connection.readyState === 1) {
      const dbBoard = await WendBoard.findOne({
        $or: [
          { slug: 'wend-game' },
          { slug: 'wend' },
          { slug: { $regex: /wend/i } },
        ],
      })
        .sort({ updatedAt: -1 })
        .lean() || await WendBoard.findOne().sort({ updatedAt: -1 }).lean();

      if (dbBoard) {
        wsService.setWendBoardConfig(dbBoard);
        return res.status(200).json({ success: true, data: dbBoard });
      }
    }
  } catch (err) {
    console.warn('Error reading Wend board from DB:', err);
  }

  // Check in-memory/ws cache (only if set by user, otherwise null - strictly NO dummy data)
  const config = wsService.getWendBoardConfig();
  res.status(200).json({ success: true, data: config ?? null });
};

export const updateWendBoardConfig = async (req: Request, res: Response) => {
  const board = req.body;
  if (!board || typeof board !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid board configuration' });
  }

  const cleanBoard = {
    slug: 'wend-game',
    title: String(board.title || 'Wend Word Puzzle Arena').trim(),
    description: String(board.description || '').trim(),
    rows: Number(board.rows) || 8,
    cols: Number(board.cols) || 8,
    difficulty: String(board.difficulty || 'MEDIUM'),
    timeLimitSeconds: Number(board.timeLimitSeconds) || 120,
    targetWords: Array.isArray(board.targetWords) ? board.targetWords : [],
    grid: Array.isArray(board.grid) ? board.grid : [],
    updatedAt: new Date(),
  };

  // 1. Persist directly in MongoDB database
  let savedBoard: any = cleanBoard;
  try {
    if (mongoose.connection.readyState === 1) {
      const result = await WendBoard.findOneAndUpdate(
        { slug: 'wend-game' },
        { $set: cleanBoard },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      if (result) savedBoard = result;
    }
  } catch (err) {
    console.warn('Error persisting Wend board to MongoDB:', err);
  }

  // 2. Sync in-memory WebSocket service and broadcast live update
  wsService.setWendBoardConfig(savedBoard);
  wsService.broadcast({
    type: 'WEND_CONFIG_UPDATE',
    payload: savedBoard,
  });

  if (savedBoard.title && inMemoryEvents['wend-game']) {
    inMemoryEvents['wend-game'].title = savedBoard.title;
  }
  if (savedBoard.description && inMemoryEvents['wend-game']) {
    inMemoryEvents['wend-game'].description = savedBoard.description;
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).json({ success: true, data: savedBoard });
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }
    const allowedFields = ['title', 'slug', 'description', 'type', 'status', 'bannerImage', 'startTime', 'endTime'] as const;
    const updates = Object.fromEntries(
      allowedFields.filter((field) => req.body?.[field] !== undefined).map((field) => [field, req.body[field]]),
    );
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one editable event field is required' });
    }

    const foundFallbackKey = Object.keys(inMemoryEvents).find(
      (k) => k === id || inMemoryEvents[k]._id === id
    );
    if (foundFallbackKey) {
      inMemoryEvents[foundFallbackKey] = {
        ...inMemoryEvents[foundFallbackKey],
        ...updates,
      };
      if (mongoose.connection.readyState === 1) {
        try {
          const query = Types.ObjectId.isValid(id) ? { _id: id } : { slug: foundFallbackKey };
          await Event.findOneAndUpdate(query, { $set: updates }, { upsert: false });
        } catch (dbErr) {
          console.warn('[Event] Could not sync event update to MongoDB:', dbErr);
        }
      }
      if (updates.status) {
        const isLocked = updates.status !== 'LIVE';
        wsService.setGameState(foundFallbackKey, isLocked, updates.status);
        wsService.broadcast({
          type: 'GAME_LOCK_TOGGLE',
          payload: {
            gameSlug: foundFallbackKey,
            isLocked,
            status: updates.status,
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: inMemoryEvents[foundFallbackKey],
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(200).json({
        success: true,
        data: {
          _id: id,
          ...updates,
        },
      });
    }

    const event = await EventService.updateEvent(id, updates);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }
    const success = await EventService.deleteEvent(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};
