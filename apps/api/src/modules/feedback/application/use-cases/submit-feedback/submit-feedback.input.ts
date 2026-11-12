export type SubmitFeedbackContextInput = {
  locale?: string;
  path?: string;
  userAgent?: string;
  online?: boolean;
};

export type SubmitFeedbackInput = {
  userId: string;
  message: string;
  type?: string;
  context?: SubmitFeedbackContextInput;
};
