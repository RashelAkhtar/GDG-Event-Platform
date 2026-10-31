import { Schema, model, Document, Types } from "mongoose";

export const EventType = {
  QUIZ: "QUIZ",
} as const;

export const EventStatus = {
  DRAFT: "DRAFT",
  UPCOMING: "UPCOMING",
  LIVE: "LIVE",
  COMPLETED: "COMPLETED",
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];
export type EventType = (typeof EventType)[keyof typeof EventType];

export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  type: EventType;
  status: EventStatus;
  bannerImage?: string;
  startTime: Date;
  endTime: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, required: true },
    type: { type: String, enum: Object.values(EventType), required: true },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.DRAFT,
    },
    bannerImage: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Event = model<IEvent>("Event", EventSchema);
