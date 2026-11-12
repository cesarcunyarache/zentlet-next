import { Injectable } from '@nestjs/common';
import type { Feedback } from '../../domain/feedback/feedback.js';
import { FeedbackRepository } from '../../domain/feedback/feedback.repository.js';

@Injectable()
export class InMemoryFeedbackRepository extends FeedbackRepository {
  private readonly feedbacks = new Map<string, Feedback>();

  async create(feedback: Feedback): Promise<Feedback> {
    this.feedbacks.set(feedback.id, feedback);
    return feedback;
  }
}
