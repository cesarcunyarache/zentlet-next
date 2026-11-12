export class EmptyFeedbackMessageError extends Error {
  constructor() {
    super('Feedback message cannot be empty');
    this.name = 'EmptyFeedbackMessageError';
  }
}

export class FeedbackMessageTooLongError extends Error {
  constructor(maxLength: number) {
    super(`Feedback message cannot exceed ${maxLength} characters`);
    this.name = 'FeedbackMessageTooLongError';
  }
}

export class InvalidFeedbackTypeError extends Error {
  constructor(type: string) {
    super(`"${type}" is not a valid feedback type`);
    this.name = 'InvalidFeedbackTypeError';
  }
}

export class FeedbackContextFieldTooLongError extends Error {
  constructor(field: string, maxLength: number) {
    super(`Feedback context field "${field}" cannot exceed ${maxLength} characters`);
    this.name = 'FeedbackContextFieldTooLongError';
  }
}
