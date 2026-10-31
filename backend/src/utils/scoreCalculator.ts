export interface CalculateScoreParams {
  selectedOptionIndex: number;
  correctOptionIndex: number;
  basePoints: number;
}

export const calculateQuestionScore = ({
  selectedOptionIndex,
  correctOptionIndex,
  basePoints,
}: CalculateScoreParams): { isCorrect: boolean; scoreAwarded: number } => {
  if (selectedOptionIndex !== correctOptionIndex) {
    return { isCorrect: false, scoreAwarded: 0 };
  }

  return { isCorrect: true, scoreAwarded: basePoints };
};