import type { CreateFeedbackInput } from "../../../schemas/feedback-api.schema";
import type { FeedbackRepository } from "../../domain/repositories/feedback.repository";

export class SendFeedbackUseCase {
  constructor(private readonly feedbackRepository: FeedbackRepository) {}

  execute(userId: string, input: CreateFeedbackInput) {
    return this.feedbackRepository.insert({
      message: input.message,
      type: input.type,
      context: input.context,
      userId,
    });
  }
}
