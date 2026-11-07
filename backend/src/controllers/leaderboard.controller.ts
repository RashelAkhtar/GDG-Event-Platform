import { type Request, type Response, type NextFunction } from 'express';
import { QuizAttempt } from '../models/QuizAttempt.ts';
import { Types } from 'mongoose';
import { wsService } from '../websocket.ts';

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = req.params.eventId;
    if (typeof eventId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid event id.' });
    }

    if (!Types.ObjectId.isValid(eventId)) {
      const slug = eventId.replace('-id', '');
      const liveEntries = wsService.getLeaderboard(slug);
      const filtered = liveEntries.filter((e) => {
        const name = e.user?.name || '';
        return !name.toLowerCase().includes('admin') && e.user?._id !== 'admin_master_aryan';
      });
      return res.status(200).json({ success: true, count: filtered.length, data: filtered });
    }

    const leaderboard = await QuizAttempt.aggregate([
      {
        $match: {
          eventId: new Types.ObjectId(eventId),
          isCompleted: true,
        },
      },
      {
        $addFields: {
          // Duration tiebreaker in milliseconds
          durationMs: { $subtract: ['$submittedAt', '$startTime'] },
        },
      },
      {
        // Rank by highest total score first, then by shortest duration taken
        $sort: {
          totalScore: -1,
          durationMs: 1,
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
        // Strictly exclude GDG Admin from competition leaderboards
        $match: {
          'user.role': { $ne: 'ADMIN' },
          'user.name': { $not: /admin/i },
        },
      },
      {
        $project: {
          _id: 1,
          totalScore: 1,
          durationMs: 1,
          submittedAt: 1,
          'user.name': 1,
          'user.avatar': 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: leaderboard.length, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

export const resetLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = req.params.eventId;
    if (typeof eventId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid event id.' });
    }

    if (!Types.ObjectId.isValid(eventId)) {
      const slug = eventId.replace('-id', '');
      wsService.broadcast({
        type: 'RESET_GAME_LEADERBOARD',
        payload: { gameSlug: slug },
      });
      return res.status(200).json({
        success: true,
        message: 'Leaderboard reset successfully.',
        deletedAttempts: 0,
      });
    }

    const result = await QuizAttempt.deleteMany({
      eventId: new Types.ObjectId(eventId),
    });

    res.status(200).json({
      success: true,
      message: 'Leaderboard and quiz attempts reset successfully.',
      deletedAttempts: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
