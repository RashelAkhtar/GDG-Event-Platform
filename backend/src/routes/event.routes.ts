import { Router } from 'express';
import { createEvent, deleteEvent, getEventBySlug, getEvents, updateEvent } from '../controllers/event.controller.ts';
import { protect, requireAdmin } from '../middlewares/auth.middleware.ts';

const router = Router();

// Signed-in users can view published events; admins can also view drafts.
router.get('/', protect, getEvents);
router.get('/:slug', protect, getEventBySlug);

// Only authenticated admins may manage events.
router.post('/', protect, requireAdmin, createEvent);
router.patch('/:id', protect, requireAdmin, updateEvent);
router.delete('/:id', protect, requireAdmin, deleteEvent);

export default router;
