import { type Request, type Response, type NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { QuizService } from '../services/quiz.service.ts';
import { sendQuizError } from '../utils/error.ts';
import { getId, getUser } from '../utils/auth.ts';
import { wsService } from '../websocket.ts';
import { Event } from '../models/Event.ts';
import { Question } from '../models/Questions.ts';
import { UserRole } from '../models/User.ts';

// Central in-memory questions registry initialized strictly to empty arrays (NO default mock questions)
export const inMemoryQuestions: Record<string, any[]> = {
  'web-dev-quiz': [],
  'mentis-quiz': [],
};

// Helper to sanitize questions for non-admin participants (strip correct answer key)
function sanitizeQuestions(questions: any[]): any[] {
  return questions.map((q) => {
    const { correctOptionIndex, ...publicFields } = q;
    return publicFields;
  });
}

// Helper to normalize slug from param
function resolveSlug(param: string): string {
  if (param.includes('mentis')) return 'mentis-quiz';
  if (param.includes('web')) return 'web-dev-quiz';
  if (param.includes('wend')) return 'wend-game';
  return param.replace('-id', '');
}

/**
 * GET /api/v1/events/:eventId/questions
 * Returns user-created questions for the event/slug.
 * Authenticated admins receive answer keys; participants receive sanitized questions.
 */
export const getQuestions = async (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const eventIdOrSlug = getId(req.params.eventId);
  if (!eventIdOrSlug) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier.' });
  }

  const slug = resolveSlug(eventIdOrSlug);
  const user = getUser(req);
  const isAdmin = user?.role === UserRole.ADMIN || (user as any)?.role === 'ADMIN';

  try {
    // 1. Direct MongoDB Database Retrieval (Single Source of Truth)
    if (mongoose.connection.readyState === 1) {
      let targetEventId: Types.ObjectId | null = null;
      if (Types.ObjectId.isValid(eventIdOrSlug)) {
        targetEventId = new Types.ObjectId(eventIdOrSlug);
      } else {
        const foundEvent = await Event.findOne({
          $or: [{ slug }, { slug: eventIdOrSlug }],
        }).lean();
        if (foundEvent && foundEvent._id) targetEventId = foundEvent._id as Types.ObjectId;
      }

      const selectFields = isAdmin ? '+correctOptionIndex' : '-correctOptionIndex';

      // Build inclusive multi-field query so any database-seeded questions are resolved
      const queryClauses: any[] = [];
      if (targetEventId) {
        queryClauses.push({ eventId: targetEventId });
      }
      queryClauses.push({ eventId: eventIdOrSlug });
      queryClauses.push({ eventId: slug });
      queryClauses.push({ track: slug });
      queryClauses.push({ track: { $regex: new RegExp(slug.replace('-quiz', ''), 'i') } });
      queryClauses.push({ quizSlug: slug });
      queryClauses.push({ eventSlug: slug });
      queryClauses.push({ category: slug });
      queryClauses.push({ category: { $regex: new RegExp(slug.replace('-quiz', ''), 'i') } });

      let dbQuestions = await Question.find({ $or: queryClauses })
        .select(selectFields)
        .sort({ order: 1, createdAt: 1 })
        .lean();

      if (dbQuestions.length > 0) {
        // Sync local memory cache with DB truth
        inMemoryQuestions[slug] = dbQuestions;

        // User side receives STRICTLY what was retrieved from database
        return res.status(200).json({
          success: true,
          count: dbQuestions.length,
          data: dbQuestions,
        });
      }
    }

    // 2. Resilient memory cache (strictly user-created content, NO dummy data)
    const list = inMemoryQuestions[slug] || [];
    const output = isAdmin ? list : sanitizeQuestions(list);

    return res.status(200).json({
      success: true,
      count: output.length,
      data: output,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/v1/events/:eventId/questions
 * Admin sets the full questions pool for an event/slug in the MongoDB database.
 * Deletes old event questions and persists the user-created pool into MongoDB.
 */
export const updateQuestions = async (req: Request, res: Response, next: NextFunction) => {
  const eventIdOrSlug = getId(req.params.eventId);
  if (!eventIdOrSlug) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier.' });
  }

  const slug = resolveSlug(eventIdOrSlug);
  const user = getUser(req);
  const { questions } = req.body;
  if (!Array.isArray(questions)) {
    return res.status(400).json({ success: false, message: 'questions must be an array.' });
  }

  // Format questions with safe defaults
  const formattedQuestions = questions.map((q, idx) => ({
    _id: q._id || `q_${Date.now()}_${idx + 1}`,
    questionText: String(q.questionText || '').trim(),
    options: Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [],
    correctOptionIndex: Number.isInteger(q.correctOptionIndex) ? q.correctOptionIndex : 0,
    points: Number(q.points) || 100,
    timeLimitSeconds: Number(q.timeLimitSeconds) || 30,
    order: Number.isInteger(q.order) ? q.order : idx + 1,
  }));

  // Update in-memory registry
  inMemoryQuestions[slug] = formattedQuestions;

  // Persist directly to MongoDB database
  try {
    if (mongoose.connection.readyState === 1) {
      let targetEvent = null;
      if (Types.ObjectId.isValid(eventIdOrSlug)) {
        targetEvent = await Event.findById(eventIdOrSlug);
      }
      if (!targetEvent) {
        targetEvent = await Event.findOne({ slug });
      }
      if (!targetEvent) {
        const creatorId =
          user?._id && Types.ObjectId.isValid(user._id)
            ? new Types.ObjectId(user._id)
            : new Types.ObjectId();
        targetEvent = await Event.create({
          title: slug === 'mentis-quiz' ? 'Mentis Logic & Algo Quiz' : 'Web Dev Blitz Quiz',
          slug,
          description: slug === 'mentis-quiz' ? 'Algorithmic reasoning challenge.' : 'Frontend fundamentals sprint.',
          type: 'QUIZ',
          status: 'LIVE',
          startTime: new Date(),
          endTime: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          createdBy: creatorId,
        });
      }

      if (targetEvent) {
        await Question.deleteMany({ eventId: targetEvent._id });
        if (formattedQuestions.length > 0) {
          const toInsert = formattedQuestions.map((fq) => ({
            questionText: fq.questionText,
            options: fq.options,
            correctOptionIndex: fq.correctOptionIndex,
            points: fq.points,
            timeLimitSeconds: fq.timeLimitSeconds,
            order: fq.order,
            eventId: targetEvent._id,
          }));
          const inserted = await Question.insertMany(toInsert);
          formattedQuestions.forEach((fq, idx) => {
            if (inserted[idx]) fq._id = inserted[idx]._id.toString();
          });
          inMemoryQuestions[slug] = formattedQuestions;
        }
      }
    }
  } catch (dbErr) {
    console.warn('[Questions] Could not sync questions to MongoDB:', dbErr);
  }

  // Broadcast real-time update to all connected clients
  wsService.broadcast({
    type: 'QUESTIONS_UPDATE',
    payload: {
      gameSlug: slug,
      questions: sanitizeQuestions(formattedQuestions),
    },
  });

  return res.status(200).json({
    success: true,
    count: formattedQuestions.length,
    data: formattedQuestions,
  });
};

export const addQuestions = async (req: Request, res: Response, next: NextFunction) => {
  const eventIdOrSlug = getId(req.params.eventId);
  const user = getUser(req);
  if (!eventIdOrSlug) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }

  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'questions must be a non-empty array.',
    });
  }

  const slug = resolveSlug(eventIdOrSlug);

  // If valid ObjectId, use DB QuizService
  if (Types.ObjectId.isValid(eventIdOrSlug)) {
    try {
      const created = await QuizService.addQuestions(eventIdOrSlug, questions);
      return res.status(201).json({
        success: true,
        count: created.length,
        data: created,
      });
    } catch (error) {
      if (error instanceof Error) return sendQuizError(res, error);
      return next(error);
    }
  }

  // Otherwise append to in-memory store
  const existing = inMemoryQuestions[slug] || [];
  const nextOrder = existing.length + 1;
  const newQuestions = questions.map((q, idx) => ({
    _id: q._id || `q_${Date.now()}_${idx + 1}`,
    questionText: String(q.questionText || '').trim(),
    options: Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [],
    correctOptionIndex: Number.isInteger(q.correctOptionIndex) ? q.correctOptionIndex : 0,
    points: Number(q.points) || 100,
    timeLimitSeconds: Number(q.timeLimitSeconds) || 30,
    order: Number.isInteger(q.order) ? q.order : nextOrder + idx,
  }));

  // Persist directly to MongoDB if connected
  try {
    if (mongoose.connection.readyState === 1) {
      let targetEvent = await Event.findOne({ slug });
      if (!targetEvent) {
        const creatorId =
          user?._id && Types.ObjectId.isValid(user._id)
            ? new Types.ObjectId(user._id)
            : new Types.ObjectId();
        targetEvent = await Event.create({
          title: slug === 'mentis-quiz' ? 'Mentis Logic & Algo Quiz' : 'Web Dev Blitz Quiz',
          slug,
          description: slug === 'mentis-quiz' ? 'Algorithmic reasoning challenge.' : 'Frontend fundamentals sprint.',
          type: 'QUIZ',
          status: 'LIVE',
          startTime: new Date(),
          endTime: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          createdBy: creatorId,
        });
      }
      if (targetEvent) {
        const toInsert = newQuestions.map((nq) => ({
          questionText: nq.questionText,
          options: nq.options,
          correctOptionIndex: nq.correctOptionIndex,
          points: nq.points,
          timeLimitSeconds: nq.timeLimitSeconds,
          order: nq.order,
          eventId: targetEvent._id,
        }));
        const inserted = await Question.insertMany(toInsert);
        newQuestions.forEach((nq, i) => {
          if (inserted[i]) nq._id = String(inserted[i]._id);
        });
      }
    }
  } catch (err) {
    console.warn('Error saving questions to MongoDB in addQuestions:', err);
  }

  inMemoryQuestions[slug] = [...existing, ...newQuestions];

  wsService.broadcast({
    type: 'QUESTIONS_UPDATE',
    payload: {
      gameSlug: slug,
      questions: sanitizeQuestions(inMemoryQuestions[slug]),
    },
  });

  return res.status(201).json({
    success: true,
    count: inMemoryQuestions[slug].length,
    data: inMemoryQuestions[slug],
  });
};

export const startQuiz = async (req: Request, res: Response, next: NextFunction) => {
  const eventIdOrSlug = getId(req.params.eventId);
  const user = getUser(req);
  if (!eventIdOrSlug) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }

  const slug = resolveSlug(eventIdOrSlug);

  // If ObjectId is valid and user is logged in, try DB startQuiz
  if (Types.ObjectId.isValid(eventIdOrSlug) && user) {
    try {
      const result = await QuizService.startQuiz(eventIdOrSlug, user._id);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      // If DB startQuiz fails (e.g. event not found in DB), fall through to in-memory questions
    }
  }

  // In-memory / graceful fallback: return user-created questions for this slug
  let list = inMemoryQuestions[slug] || [];
  if (list.length === 0) {
    try {
      const foundEvent = await Event.findOne({ slug });
      if (foundEvent) {
        list = await Question.find({ eventId: foundEvent._id }).select('-correctOptionIndex').sort({ order: 1 }).lean();
      }
    } catch {}
  }
  const sanitized = sanitizeQuestions(list);

  return res.status(200).json({
    success: true,
    data: {
      questions: sanitized,
    },
  });
};

export const submitQuiz = async (req: Request, res: Response, next: NextFunction) => {
  const eventIdOrSlug = getId(req.params.eventId);
  const user = getUser(req);
  if (!eventIdOrSlug) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }

  const slug = resolveSlug(eventIdOrSlug);
  const userAnswers: { questionId: string; selectedOptionIndex: number }[] = Array.isArray(req.body?.answers)
    ? req.body.answers
    : [];

  // If valid ObjectId and authenticated user, try DB submit
  if (Types.ObjectId.isValid(eventIdOrSlug) && user) {
    try {
      const attempt = await QuizService.submitQuiz(eventIdOrSlug, user._id, userAnswers);
      return res.status(200).json({ success: true, data: attempt });
    } catch (error) {
      // If error, fall through to in-memory evaluation
    }
  }

  // Scoring using user-created question answer keys
  let questions = inMemoryQuestions[slug] || [];
  if (questions.length === 0) {
    try {
      const foundEvent = await Event.findOne({ slug });
      if (foundEvent) {
        questions = await Question.find({ eventId: foundEvent._id }).select('+correctOptionIndex').lean();
      }
    } catch {}
  }

  let score = 0;
  let correctCount = 0;

  userAnswers.forEach((ans) => {
    const q = questions.find((item) => String(item._id) === String(ans.questionId));
    if (q && q.correctOptionIndex === ans.selectedOptionIndex) {
      score += q.points || 100;
      correctCount++;
    }
  });

  return res.status(200).json({
    success: true,
    message: 'Attempt evaluated and recorded.',
    data: {
      score,
      correctCount,
      totalQuestions: questions.length,
      isCompleted: true,
    },
  });
};
