import type { NewFeedback, SentFeedback } from "../entities/feedback.entity";

export interface FeedbackRepository {
  insert(feedback: NewFeedback): Promise<SentFeedback>;
}
