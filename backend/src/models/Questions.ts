import { Schema, model, Document, Types } from "mongoose";

export interface IQuestion extends Document {
  eventId: Types.ObjectId;
  questionText: string;
  options: string[];
  correctOptionIndex: number; // Keep secret from client GET responses
  points: number;
  timeLimitSeconds?: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    questionText: { type: String, required: true, trim: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true, select: false }, // Excluded by default in queries
    points: { type: Number, required: true, default: 100 },
    timeLimitSeconds: { type: Number, default: 30 },
    order: { type: Number, required: true },
  },
  { timestamps: true },
);

// Prevent duplicate question orders in a single event
QuestionSchema.index({ eventId: 1, order: 1 }, { unique: true });

export const Question = model<IQuestion>("Question", QuestionSchema);
