import type { FeedbackType } from "../../../constants";
import type { FeedbackContext } from "../../../schemas/feedback-api.schema";

export interface NewFeedback {
  userId: string;
  message: string;
  type: FeedbackType;
  context: FeedbackContext | undefined;
}

export interface SentFeedback {
  id: string;
}
