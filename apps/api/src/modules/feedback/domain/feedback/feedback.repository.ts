import type { Feedback } from './feedback.js';

export abstract class FeedbackRepository {
  abstract create(feedback: Feedback): Promise<Feedback>;
}
