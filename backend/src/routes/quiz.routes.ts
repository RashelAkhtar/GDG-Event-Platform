import { Router } from 'express';
import {
  addQuestions,
  getQuestions,
  updateQuestions,
  startQuiz,
  submitQuiz,
} from '../controllers/quiz.controller.ts';
import { getLeaderboard, resetLeaderboard } from '../controllers/leaderboard.controller.ts';
import { protect, requireAdmin, optionalAuth } from '../middlewares/auth.middleware.ts';

const router = Router();

// Questions CRUD endpoints
router.get('/:eventId/questions', optionalAuth, getQuestions);
router.put('/:eventId/questions', protect, requireAdmin, updateQuestions);
router.post('/:eventId/questions', protect, requireAdmin, addQuestions);

// Quiz gameplay & leaderboard
router.post('/:eventId/quiz/start', optionalAuth, startQuiz);
router.post('/:eventId/quiz/submit', optionalAuth, submitQuiz);
router.get('/:eventId/leaderboard', optionalAuth, getLeaderboard);
router.delete('/:eventId/leaderboard', protect, requireAdmin, resetLeaderboard);

export default router;
