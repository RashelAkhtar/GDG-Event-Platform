import { Router } from 'express';
import { createEvent, deleteEvent, getEventBySlug, getEvents, updateEvent } from '../controllers/event.controller.ts';
import { protect, optionalAuth, requireAdmin } from '../middlewares/auth.middleware.ts';

const router = Router();

// Public users can view published events; authenticated admins can also view drafts.
router.get('/', optionalAuth, getEvents);
router.get('/:slug', optionalAuth, getEventBySlug);

// Only authenticated admins may manage events.
router.post('/', protect, requireAdmin, createEvent);
router.patch('/:id', protect, requireAdmin, updateEvent);
router.delete('/:id', protect, requireAdmin, deleteEvent);

export default router;
