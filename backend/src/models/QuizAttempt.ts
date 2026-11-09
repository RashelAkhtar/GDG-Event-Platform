import { Schema, model, Document, Types } from "mongoose";

export interface IAnswer {
  questionId: Types.ObjectId;
  selectedOptionIndex: number;
  answeredAt: Date;
  timeTakenSeconds?: number;
  isCorrect: boolean;
  scoreAwarded: number;
}

export interface IQuizAttempt extends Document {
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  startTime: Date;
  submittedAt?: Date;
  durationMs?: number;
  answers: IAnswer[];
  totalScore: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    selectedOptionIndex: { type: Number, required: true },
    answeredAt: { type: Date, required: true },
    timeTakenSeconds: { type: Number },
    isCorrect: { type: Boolean, required: true, default: false },
    scoreAwarded: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startTime: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date },
    durationMs: { type: Number },
    answers: [AnswerSchema],
    totalScore: { type: Number, required: true, default: 0, index: true },
    isCompleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, strict: false },
);

// Ensure a user only submits one attempt per quiz event
QuizAttemptSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const QuizAttempt = model<IQuizAttempt>(
  "QuizAttempt",
  QuizAttemptSchema,
);
