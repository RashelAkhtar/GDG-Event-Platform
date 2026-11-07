import { Schema, model, Document } from 'mongoose';

export interface ITargetWord {
  id: string;
  word: string;
  hint?: string;
}

export interface IGridCell {
  row: number;
  col: number;
  type: 'LETTER' | 'OBSTACLE';
  letter?: string;
}

export interface IWendBoard extends Document {
  slug: string;
  title: string;
  description: string;
  rows: number;
  cols: number;
  difficulty: string;
  timeLimitSeconds: number;
  targetWords: ITargetWord[];
  grid: IGridCell[][];
  updatedAt: Date;
  createdAt: Date;
}

const TargetWordSchema = new Schema<ITargetWord>(
  {
    id: { type: String, required: true },
    word: { type: String, required: true, uppercase: true, trim: true },
    hint: { type: String, trim: true },
  },
  { _id: false }
);

const GridCellSchema = new Schema<IGridCell>(
  {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    type: { type: String, enum: ['LETTER', 'OBSTACLE'], required: true },
    letter: { type: String, uppercase: true },
  },
  { _id: false }
);

const WendBoardSchema = new Schema<IWendBoard>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, default: 'Wend Word Puzzle Arena' },
    description: { type: String, default: '' },
    rows: { type: Number, required: true, default: 8 },
    cols: { type: Number, required: true, default: 8 },
    difficulty: { type: String, default: 'MEDIUM' },
    timeLimitSeconds: { type: Number, required: true, default: 120 },
    targetWords: { type: [TargetWordSchema], default: [] },
    grid: { type: [[GridCellSchema]], default: [] },
  },
  { timestamps: true }
);

export const WendBoard = model<IWendBoard>('WendBoard', WendBoardSchema);
