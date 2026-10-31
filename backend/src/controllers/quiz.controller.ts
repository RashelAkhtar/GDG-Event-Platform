import { Types } from 'mongoose';
import { type NextFunction, type Request, type Response } from 'express';
import { type IUser } from '../models/User.ts';
import { QuizService } from '../services/quiz.service.ts';

const getId = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getUser = (req: Request): IUser | undefined => req.user as unknown as IUser | undefined;

const sendQuizError = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : 'Quiz request failed.';
  const status = /not found/i.test(message) ? 404 : /already started|already submitted/i.test(message) ? 409 : 400;
  return res.status(status).json({ success: false, message });
};

export const addQuestions = async (req: Request, res: Response, next: NextFunction) => {
  const eventId = getId(req.params.eventId);
  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }
  const questions = req.body?.questions;
  if (!Array.isArray(questions)) {
    return res.status(400).json({ success: false, message: 'Body must include a questions array.' });
  }
  try {
    const created = await QuizService.addQuestions(eventId, questions);
    return res.status(201).json({ success: true, count: created.length, data: created });
  } catch (error) {
    if (error instanceof Error) return sendQuizError(res, error);
    return next(error);
  }
};

export const startQuiz = async (req: Request, res: Response, next: NextFunction) => {
  const eventId = getId(req.params.eventId);
  const user = getUser(req);
  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  try {
    const result = await QuizService.startQuiz(eventId, user._id);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error) return sendQuizError(res, error);
    return next(error);
  }
};

export const submitQuiz = async (req: Request, res: Response, next: NextFunction) => {
  const eventId = getId(req.params.eventId);
  const user = getUser(req);
  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event id.' });
  }
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  try {
    const attempt = await QuizService.submitQuiz(eventId, user._id, req.body?.answers);
    return res.status(200).json({ success: true, data: attempt });
  } catch (error) {
    if (error instanceof Error) return sendQuizError(res, error);
    return next(error);
  }
};

