import { Event, type IEvent, EventStatus } from '../models/Event.ts';
import { Types } from 'mongoose';
import slugify from 'slugify';
import { Question } from '../models/Questions.ts';
import { QuizAttempt } from '../models/QuizAttempt.ts';

export class EventService {
  // Generates a unique URL-friendly slug from an event title
  private static async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(title, { lower: true, strict: true, trim: true });
    if (!baseSlug) throw new Error('Event title must contain letters or numbers');
    let slug = baseSlug;
    let count = 1;

    while (await Event.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    return slug;
  }

  static async createEvent(data: Partial<IEvent>, adminId: Types.ObjectId): Promise<IEvent> {
    // Auto-generate slug if not manually provided
    const slug = data.slug
      ? slugify(data.slug, { lower: true, strict: true, trim: true })
      : await this.generateUniqueSlug(data.title!);
    if (!slug) throw new Error('Event slug must contain letters or numbers');

    return await Event.create({
      ...data,
      slug,
      createdBy: adminId,
    });
  }

  static async getAllEvents(includeDrafts = false): Promise<IEvent[]> {
    const query = includeDrafts ? {} : { status: { $ne: EventStatus.DRAFT } };
    return await Event.find(query).sort({ startTime: 1 }).populate('createdBy', 'name email');
  }

  static async getEventBySlug(slug: string, includeDraft = false): Promise<IEvent | null> {
    return await Event.findOne({ slug, ...(includeDraft ? {} : { status: { $ne: EventStatus.DRAFT } }) })
      .populate('createdBy', 'name email');
  }

  static async updateEvent(eventId: string, updates: Partial<IEvent>): Promise<IEvent | null> {
    if (updates.title && !updates.slug) {
      updates.slug = await this.generateUniqueSlug(updates.title, eventId);
    } else if (updates.slug) {
      updates.slug = slugify(updates.slug, { lower: true, strict: true, trim: true });
      if (!updates.slug) throw new Error('Event slug must contain letters or numbers');
    }

    if (updates.startTime && updates.endTime) {
      const start = new Date(updates.startTime).getTime();
      const end = new Date(updates.endTime).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        throw new Error('Event endTime must be later than startTime');
      }
    } else if (updates.startTime || updates.endTime) {
      const current = await Event.findById(eventId).select('startTime endTime');
      if (!current) return null;
      const start = updates.startTime ? new Date(updates.startTime) : current.startTime;
      const end = updates.endTime ? new Date(updates.endTime) : current.endTime;
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start.getTime() >= end.getTime()) {
        throw new Error('Event endTime must be later than startTime');
      }
    }

    return await Event.findByIdAndUpdate(eventId, { $set: updates }, { new: true, runValidators: true });
  }

  static async deleteEvent(eventId: string): Promise<boolean> {
    const event = await Event.findByIdAndDelete(eventId);
    if (!event) return false;
    await Promise.all([
      Question.deleteMany({ eventId: event._id }),
      QuizAttempt.deleteMany({ eventId: event._id }),
    ]);
    return true;
  }
}
