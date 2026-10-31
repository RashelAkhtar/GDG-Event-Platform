import { Router } from 'express';
import { addQuestions, startQuiz, submitQuiz } from '../controllers/quiz.controller.ts';
import { getLeaderboard } from '../controllers/leaderboard.controller.ts';
import { protect, requireAdmin } from '../middlewares/auth.middleware.ts';

const router = Router();

router.post('/:eventId/questions', protect, requireAdmin, addQuestions);
router.post('/:eventId/quiz/start', protect, startQuiz);
router.post('/:eventId/quiz/submit', protect, submitQuiz);
router.get('/:eventId/leaderboard', protect, getLeaderboard);

export default router;
