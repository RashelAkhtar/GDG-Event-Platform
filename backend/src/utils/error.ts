import type { Response } from 'express';

export const sendQuizError = (res: Response, error: Error) => {
  return res.status(400).json({ success: false, message: error.message });
};
