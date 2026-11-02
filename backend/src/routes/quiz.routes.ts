import { Router } from 'express';
import { addQuestions, startQuiz, submitQuiz } from '../controllers/quiz.controller.ts';
import { getLeaderboard, resetLeaderboard } from '../controllers/leaderboard.controller.ts';
import { protect, requireAdmin, optionalAuth } from '../middlewares/auth.middleware.ts';

const router = Router();

router.post('/:eventId/questions', protect, requireAdmin, addQuestions);
router.post('/:eventId/quiz/start', protect, startQuiz);
router.post('/:eventId/quiz/submit', protect, submitQuiz);
router.get('/:eventId/leaderboard', optionalAuth, getLeaderboard);
router.delete('/:eventId/leaderboard', protect, requireAdmin, resetLeaderboard);

export default router;
