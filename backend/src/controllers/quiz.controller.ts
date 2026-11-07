import { type Request, type Response, type NextFunction } from 'express';
import { Types } from 'mongoose';
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
  const eventIdOrSlug = getId(req.params.eventId);
  if (!eventIdOrSlug) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier.' });
  }

  const slug = resolveSlug(eventIdOrSlug);
  const user = getUser(req);
  const isAdmin = user?.role === UserRole.ADMIN || (user as any)?.role === 'ADMIN';

  try {
    // 1. Try DB lookup if ObjectId is valid
    if (Types.ObjectId.isValid(eventIdOrSlug)) {
      const selectFields = isAdmin ? '+correctOptionIndex' : '-correctOptionIndex';
      const dbQuestions = await Question.find({ eventId: new Types.ObjectId(eventIdOrSlug) })
        .select(selectFields)
        .sort({ order: 1 })
        .lean();

      if (dbQuestions && dbQuestions.length > 0) {
        return res.status(200).json({
          success: true,
          count: dbQuestions.length,
          data: dbQuestions,
        });
      }
    }

    // 2. Try DB lookup by slug if Event model has it
    try {
      const event = await Event.findOne({ slug });
      if (event) {
        const selectFields = isAdmin ? '+correctOptionIndex' : '-correctOptionIndex';
        const dbQuestions = await Question.find({ eventId: event._id })
          .select(selectFields)
          .sort({ order: 1 })
          .lean();

        if (dbQuestions && dbQuestions.length > 0) {
          return res.status(200).json({
            success: true,
            count: dbQuestions.length,
            data: dbQuestions,
          });
        }
      }
    } catch {}

    // 3. Fallback to centralized in-memory store
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
 * Admin replaces or saves the full questions list for an event/slug.
 * Persists in DB (if connected) and in-memory, and broadcasts over WebSocket.
 */
export const updateQuestions = async (req: Request, res: Response, next: NextFunction) => {
  const eventIdOrSlug = getId(req.params.eventId);
  if (!eventIdOrSlug) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier.' });
  }

  const slug = resolveSlug(eventIdOrSlug);
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

  // Persist to MongoDB if event exists
  try {
    let targetEventId: Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(eventIdOrSlug)) {
      targetEventId = new Types.ObjectId(eventIdOrSlug);
    } else {
      const foundEvent = await Event.findOne({ slug });
      if (foundEvent) targetEventId = foundEvent._id as Types.ObjectId;
    }

    if (targetEventId) {
      await Question.deleteMany({ eventId: targetEventId });
      if (formattedQuestions.length > 0) {
        const toInsert = formattedQuestions.map((fq) => ({
          ...fq,
          eventId: targetEventId,
        }));
        await Question.insertMany(toInsert);
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
