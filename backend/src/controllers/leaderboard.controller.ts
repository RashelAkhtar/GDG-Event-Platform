import { type Request, type Response, type NextFunction } from 'express';
import { QuizAttempt } from '../models/QuizAttempt.ts';
import { Types } from 'mongoose';

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = req.params.eventId;
    if (typeof eventId !== 'string' || !Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event id.' });
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
    if (typeof eventId !== 'string' || !Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event id.' });
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
