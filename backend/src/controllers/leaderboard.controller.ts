import { type Request, type Response, type NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { QuizAttempt } from '../models/QuizAttempt.ts';
import { Event } from '../models/Event.ts';
import { wsService } from '../websocket.ts';

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawEventId = req.params.eventId;
    if (typeof rawEventId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid event id.' });
    }

    const querySlug = (req.query.slug as string) || (req.query.gameSlug as string) || '';
    const cleanSlug = querySlug || rawEventId.replace('-id', '');
    const canonicalSlug = wsService.resolveCanonicalSlug(cleanSlug);

    // 1. Fetch live in-memory attempts
    const liveEntries = wsService.getLeaderboard(canonicalSlug);

    // 2. Query MongoDB QuizAttempt if connected
    let dbEntries: any[] = [];
    if (mongoose.connection.readyState === 1) {
      try {
        let targetEventId: Types.ObjectId | null = null;
        if (Types.ObjectId.isValid(rawEventId)) {
          targetEventId = new Types.ObjectId(rawEventId);
        } else {
          const ev = await Event.findOne({
            $or: [
              { slug: cleanSlug },
              { slug: canonicalSlug },
              { slug: { $regex: new RegExp(canonicalSlug.replace(/[-_]/g, '.*'), 'i') } },
            ],
          }).lean();
          if (ev) targetEventId = ev._id as Types.ObjectId;
        }

        if (targetEventId) {
          const attempts = await QuizAttempt.aggregate([
            {
              $match: {
                eventId: targetEventId,
                isCompleted: true,
              },
            },
            {
              $addFields: {
                durationMs: {
                  $ifNull: [
                    '$durationMs',
                    { $subtract: ['$submittedAt', '$startTime'] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: '$user' },
            {
              $match: {
                'user.role': { $ne: 'ADMIN' },
                'user.name': { $not: /admin/i },
              },
            },
            {
              $project: {
                _id: { $toString: '$_id' },
                totalScore: 1,
                durationMs: 1,
                submittedAt: 1,
                user: {
                  _id: { $toString: '$user._id' },
                  name: '$user.name',
                  avatar: '$user.avatar',
                },
              },
            },
          ]);
          dbEntries = attempts;
        }
      } catch (err) {
        console.warn('[Leaderboard] Aggregation error:', err);
      }
    }

    // 3. Deduplicate and merge: Map by participant userId or name
    const mergedMap = new Map<string, any>();

    // Database entries take precedence as persisted records
    for (const entry of dbEntries) {
      const key = entry.user?._id || entry.user?.name?.toLowerCase() || entry._id;
      mergedMap.set(key, entry);
    }

    // Live entries overlay or add participants
    for (const entry of liveEntries) {
      const key = entry.user?._id || entry.user?.name?.toLowerCase() || entry._id;
      const existing = mergedMap.get(key);
      if (!existing) {
        mergedMap.set(key, entry);
      } else {
        // Keep best score or shorter time
        if (
          entry.totalScore > existing.totalScore ||
          (entry.totalScore === existing.totalScore && entry.durationMs < existing.durationMs)
        ) {
          mergedMap.set(key, entry);
        }
      }
    }

    const combined = Array.from(mergedMap.values()).filter((e) => {
      const name = e.user?.name || '';
      return !name.toLowerCase().includes('admin') && e.user?._id !== 'admin_master_aryan';
    });

    // Rank: highest totalScore first, lowest durationMs second
    combined.sort((a, b) => b.totalScore - a.totalScore || a.durationMs - b.durationMs);

    return res.status(200).json({ success: true, count: combined.length, data: combined });
  } catch (error) {
    next(error);
  }
};

export const resetLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawEventId = req.params.eventId;
    if (typeof rawEventId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid event id.' });
    }

    const querySlug = (req.query.slug as string) || (req.query.gameSlug as string) || '';
    const cleanSlug = querySlug || rawEventId.replace('-id', '');
    const canonicalSlug = wsService.resolveCanonicalSlug(cleanSlug);

    // Broadcast WebSocket reset
    wsService.broadcast({
      type: 'RESET_GAME_LEADERBOARD',
      payload: { gameSlug: cleanSlug, canonicalSlug },
    });

    let deletedCount = 0;
    if (mongoose.connection.readyState === 1) {
      let targetEventId: Types.ObjectId | null = null;
      if (Types.ObjectId.isValid(rawEventId)) {
        targetEventId = new Types.ObjectId(rawEventId);
      } else {
        const ev = await Event.findOne({
          $or: [
            { slug: cleanSlug },
            { slug: canonicalSlug },
            { slug: { $regex: new RegExp(canonicalSlug.replace(/[-_]/g, '.*'), 'i') } },
          ],
        }).lean();
        if (ev) targetEventId = ev._id as Types.ObjectId;
      }

      if (targetEventId) {
        const result = await QuizAttempt.deleteMany({ eventId: targetEventId });
        deletedCount = result.deletedCount || 0;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Leaderboard and quiz attempts reset successfully.',
      deletedAttempts: deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
