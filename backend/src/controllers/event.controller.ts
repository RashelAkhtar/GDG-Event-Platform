import { type Request, type Response, type NextFunction } from 'express';
import { EventService } from '../services/event.service.ts';
import { UserRole, type IUser } from '../models/User.ts';
import { EventType } from '../models/Event.ts';
import { Types } from 'mongoose';

const getParam = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getUser = (req: Request): IUser | undefined => req.user as unknown as IUser | undefined;

const isValidDateRange = (startTime: unknown, endTime: unknown): boolean => {
  const start = new Date(startTime as string).getTime();
  const end = new Date(endTime as string).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start < end;
};

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, type, bannerImage, startTime, endTime } = req.body ?? {};

    // slug is no longer required in req.body
    if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim() ||
        typeof type !== 'string' || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (type !== EventType.QUIZ) {
      return res.status(400).json({ success: false, message: `type must be one of: ${Object.values(EventType).join(', ')}` });
    }
    if (!isValidDateRange(startTime, endTime)) {
      return res.status(400).json({ success: false, message: 'endTime must be a valid date later than startTime' });
    }

    const admin = getUser(req);
    if (!admin) return res.status(401).json({ success: false, message: 'Authentication required' });

    const event = await EventService.createEvent(
      { title, description, type, bannerImage, startTime, endTime },
      admin._id
    );

    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = getUser(req)?.role === UserRole.ADMIN;
    const events = await EventService.getAllEvents(isAdmin);
    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    next(error);
  }
};

export const getEventBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = getParam(req.params.slug);
    if (!slug) return res.status(400).json({ success: false, message: 'Invalid event slug' });
    const event = await EventService.getEventBySlug(slug, getUser(req)?.role === UserRole.ADMIN);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }
    const allowedFields = ['title', 'slug', 'description', 'type', 'status', 'bannerImage', 'startTime', 'endTime'] as const;
    const updates = Object.fromEntries(
      allowedFields.filter((field) => req.body?.[field] !== undefined).map((field) => [field, req.body[field]]),
    );
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one editable event field is required' });
    }
    const event = await EventService.updateEvent(id, updates);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }
    const success = await EventService.deleteEvent(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};
