import { Injectable } from '@nestjs/common';
import {
  EmptyFeedbackMessageError,
  FeedbackContextFieldTooLongError,
  FeedbackMessageTooLongError,
  InvalidFeedbackTypeError,
} from '../../../domain/feedback.errors.js';
import {
  FEEDBACK_CONTEXT_LIMITS,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_TYPES,
  type Feedback,
  type FeedbackContext,
  type FeedbackType,
} from '../../../domain/feedback/feedback.js';
import { FeedbackRepository } from '../../../domain/feedback/feedback.repository.js';
import type { SubmitFeedbackContextInput, SubmitFeedbackInput } from './submit-feedback.input.js';
import type { SubmitFeedbackOutput } from './submit-feedback.output.js';

const DEFAULT_FEEDBACK_TYPE: FeedbackType = 'comment';

@Injectable()
export class SubmitFeedbackUseCase {
  constructor(private readonly feedbackRepository: FeedbackRepository) {}

  async execute(input: SubmitFeedbackInput): Promise<SubmitFeedbackOutput> {
    const message = input.message.trim();
    if (message.length === 0) throw new EmptyFeedbackMessageError();
    if (message.length > FEEDBACK_MESSAGE_MAX_LENGTH) throw new FeedbackMessageTooLongError(FEEDBACK_MESSAGE_MAX_LENGTH);

    const type = this.resolveType(input.type);
    const context = this.toContext(input.context);

    const now = new Date();
    const feedback: Feedback = {
      id: crypto.randomUUID(),
      userId: input.userId,
      type,
      status: 'open',
      message,
      context,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.feedbackRepository.create(feedback);
    return { id: created.id };
  }

  private resolveType(type: string | undefined): FeedbackType {
    if (type === undefined) return DEFAULT_FEEDBACK_TYPE;
    if (!(FEEDBACK_TYPES as readonly string[]).includes(type)) throw new InvalidFeedbackTypeError(type);
    return type as FeedbackType;
  }

  private toContext(input: SubmitFeedbackContextInput | undefined): FeedbackContext | null {
    if (!input) return null;

    this.assertWithinLimit('locale', input.locale, FEEDBACK_CONTEXT_LIMITS.locale);
    this.assertWithinLimit('path', input.path, FEEDBACK_CONTEXT_LIMITS.path);
    this.assertWithinLimit('userAgent', input.userAgent, FEEDBACK_CONTEXT_LIMITS.userAgent);

    return {
      locale: input.locale,
      path: input.path,
      userAgent: input.userAgent,
      online: input.online,
    };
  }

  private assertWithinLimit(field: string, value: string | undefined, maxLength: number): void {
    if (value !== undefined && value.length > maxLength) throw new FeedbackContextFieldTooLongError(field, maxLength);
  }
}
