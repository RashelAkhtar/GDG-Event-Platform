import { Question, type IQuestion } from '../models/Questions.ts';
import { QuizAttempt, type IQuizAttempt } from '../models/QuizAttempt.ts';
import { Event, EventStatus, EventType } from '../models/Event.ts';
import { calculateQuestionScore } from '../utils/scoreCalculator.ts';
import { Types } from 'mongoose';

export class QuizService {
  // --- Admin Methods ---
  static async addQuestions(eventId: string, questionsData: NewQuestionInput[]): Promise<IQuestion[]> {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found.');
    if (event.type !== EventType.QUIZ) throw new Error('Questions can only be added to quiz events.');
    if (event.status === EventStatus.LIVE || event.status === EventStatus.COMPLETED || Date.now() >= event.startTime.getTime()) {
      throw new Error('Questions cannot be changed after the event starts.');
    }
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error('Provide at least one question.');
    }
    if (await QuizAttempt.exists({ eventId })) {
      throw new Error('Questions cannot be changed after a participant starts the quiz.');
    }

    const existingQuestions = await Question.find({ eventId }).select('order');
    const nextOrder = existingQuestions.reduce((max, question) => Math.max(max, question.order), 0) + 1;
    const existingOrders = new Set(existingQuestions.map((question) => question.order));
    const batchOrders = new Set<number>();
    const formattedQuestions = questionsData.map((question, index) => {
      const { questionText, options, correctOptionIndex } = question;
      const order = question.order ?? nextOrder + index;
      const points = question.points ?? 100;
      const timeLimitSeconds = question.timeLimitSeconds ?? 30;

      if (typeof questionText !== 'string' || !questionText.trim()) {
        throw new Error(`Question ${index + 1} needs questionText.`);
      }
      if (!Array.isArray(options) || options.length < 2 || options.some((option) => typeof option !== 'string' || !option.trim())) {
        throw new Error(`Question ${index + 1} needs at least two non-empty options.`);
      }
      if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
        throw new Error(`Question ${index + 1} has an invalid correctOptionIndex.`);
      }
      if (!Number.isInteger(order) || order < 1 || batchOrders.has(order) || existingOrders.has(order)) {
        throw new Error('Question order values must be unique positive integers.');
      }
      if (!Number.isFinite(points) || points <= 0 || !Number.isInteger(timeLimitSeconds) || timeLimitSeconds <= 0) {
        throw new Error(`Question ${index + 1} needs positive points and timeLimitSeconds.`);
      }
      batchOrders.add(order);
      return {
        eventId: new Types.ObjectId(eventId),
        questionText: questionText.trim(),
        options: options.map((option) => option.trim()),
        correctOptionIndex,
        points,
        timeLimitSeconds,
        order,
      };
    });

    return await Question.insertMany(formattedQuestions) as unknown as IQuestion[];
  }

  // --- Participant Methods ---
  static async startQuiz(eventId: string, userId: Types.ObjectId): Promise<{ attempt: IQuizAttempt; questions: Partial<IQuestion>[] }> {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found.');
    if (event.type !== EventType.QUIZ) throw new Error('This event is not a quiz.');
    if (event.status !== EventStatus.LIVE) throw new Error('This quiz is not live.');

    const now = new Date();

    // Event timeframe validations
    if (now < event.startTime) {
      throw new Error('This event has not started yet.');
    }
    if (now.getTime() >= event.endTime.getTime()) {
      throw new Error('This event has already ended.');
    }

    // Fetch questions without correct option indices
    const questions = await Question.find({ eventId })
      .select('-correctOptionIndex')
      .sort({ order: 1 });
    if (questions.length === 0) throw new Error('This quiz has no questions yet.');

    let attempt: IQuizAttempt;
    try {
      attempt = await QuizAttempt.create({ eventId, userId, startTime: now });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new Error('You have already started or completed this quiz.');
      }
      throw error;
    }

    return { attempt, questions };
  }

  static async submitQuiz(
    eventId: string,
    userId: Types.ObjectId,
    userAnswers: { questionId: string; selectedOptionIndex: number }[]
  ): Promise<IQuizAttempt> {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found.');
    if (event.type !== EventType.QUIZ) throw new Error('This event is not a quiz.');
    if (event.status !== EventStatus.LIVE) throw new Error('This quiz is not live.');
    if (!Array.isArray(userAnswers)) throw new Error('Answers must be an array.');

    const now = new Date();

    // Reject submissions received after the event end time
    if (now.getTime() >= event.endTime.getTime()) {
      throw new Error('Submission failed: The event time has ended.');
    }

    const attempt = await QuizAttempt.findOne({ eventId, userId, isCompleted: false });
    if (!attempt) {
      throw new Error('No active quiz attempt found.');
    }

    // Fetch answer key for calculation
    const questions = await Question.find({ eventId }).select('+correctOptionIndex');
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const seenQuestionIds = new Set<string>();
    for (const answer of userAnswers) {
      if (!answer || !Types.ObjectId.isValid(answer.questionId) || !Number.isInteger(answer.selectedOptionIndex)) {
        throw new Error('Each answer needs a valid questionId and integer selectedOptionIndex.');
      }
      if (seenQuestionIds.has(answer.questionId)) throw new Error('Each question can only be answered once.');
      seenQuestionIds.add(answer.questionId);
      const question = questionMap.get(answer.questionId);
      if (!question) throw new Error('An answer references a question that does not belong to this quiz.');
      if (answer.selectedOptionIndex < 0 || answer.selectedOptionIndex >= question.options.length) {
        throw new Error('An answer contains an invalid option index.');
      }
    }

    let totalScore = 0;
    const evaluatedAnswers = userAnswers.map((ans) => {
      const question = questionMap.get(ans.questionId)!;

      const { isCorrect, scoreAwarded } = calculateQuestionScore({
        selectedOptionIndex: ans.selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        basePoints: question.points,
      });

      totalScore += scoreAwarded;

      return {
        questionId: question._id as Types.ObjectId,
        selectedOptionIndex: ans.selectedOptionIndex,
        answeredAt: now,
        isCorrect,
        scoreAwarded,
      };
    });

    // Conditional update makes completion one-time even if duplicate requests race.
    const completedAttempt = await QuizAttempt.findOneAndUpdate(
      { _id: attempt._id, isCompleted: false },
      { $set: { answers: evaluatedAnswers, totalScore, submittedAt: now, isCompleted: true } },
      { new: true, runValidators: true },
    );
    if (!completedAttempt) throw new Error('This quiz attempt has already been submitted.');
    return completedAttempt;
  }
}

export interface NewQuestionInput {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  points?: number;
  timeLimitSeconds?: number;
  order?: number;
}
