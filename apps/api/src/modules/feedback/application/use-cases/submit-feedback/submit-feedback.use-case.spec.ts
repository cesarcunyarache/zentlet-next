import { describe, expect, it, vi } from 'vitest';
import {
  EmptyFeedbackMessageError,
  FeedbackContextFieldTooLongError,
  FeedbackMessageTooLongError,
  InvalidFeedbackTypeError,
} from '../../../domain/feedback.errors.js';
import { FEEDBACK_MESSAGE_MAX_LENGTH, type Feedback } from '../../../domain/feedback/feedback.js';
import { SubmitFeedbackUseCase } from './submit-feedback.use-case.js';

const USER_ID = 'user-1';

function makeUseCase() {
  const create = vi.fn().mockImplementation((feedback: Feedback) => Promise.resolve(feedback));
  const useCase = new SubmitFeedbackUseCase({ create });

  return { useCase, create };
}

describe('SubmitFeedbackUseCase', () => {
  it('saves the feedback for the user, trimmed, defaulting to type "comment" and status "open"', async () => {
    const { useCase, create } = makeUseCase();

    const result = await useCase.execute({ userId: USER_ID, message: '  Me encanta el dictado  ' });

    expect(result).toEqual({ id: expect.any(String) });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, message: 'Me encanta el dictado', type: 'comment', status: 'open', context: null }),
    );
  });

  it('keeps the explicit type and persists the sanitized technical context', async () => {
    const { useCase, create } = makeUseCase();

    await useCase.execute({
      userId: USER_ID,
      message: 'La lista no carga',
      type: 'bug',
      context: { locale: 'es', path: '/admin', userAgent: 'Mozilla/5.0', online: true },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bug',
        context: { locale: 'es', path: '/admin', userAgent: 'Mozilla/5.0', online: true },
      }),
    );
  });

  it('discards context fields other than locale, path, userAgent, and online', async () => {
    const { useCase, create } = makeUseCase();
    type LooseContext = { locale: string; amount: number; email: string };
    const context: LooseContext = { locale: 'es', amount: 1200, email: 'x@y.z' };

    await useCase.execute({ userId: USER_ID, message: 'Hola', context });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ context: { locale: 'es', path: undefined, userAgent: undefined, online: undefined } }),
    );
  });

  it('accepts every type defined in the domain', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({ userId: USER_ID, message: 'Falla al guardar', type: 'bug' })).resolves.toBeDefined();
    await expect(useCase.execute({ userId: USER_ID, message: 'Una idea', type: 'idea' })).resolves.toBeDefined();
  });

  it('rejects a type outside the domain and does not persist anything', async () => {
    const { useCase, create } = makeUseCase();

    await expect(useCase.execute({ userId: USER_ID, message: 'Algo', type: 'billing' })).rejects.toThrow(InvalidFeedbackTypeError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an empty or whitespace-only message', async () => {
    const { useCase, create } = makeUseCase();

    await expect(useCase.execute({ userId: USER_ID, message: '   ' })).rejects.toThrow(EmptyFeedbackMessageError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a message longer than the maximum length', async () => {
    const { useCase, create } = makeUseCase();

    await expect(
      useCase.execute({ userId: USER_ID, message: 'x'.repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1) }),
    ).rejects.toThrow(FeedbackMessageTooLongError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a context field that exceeds its length limit', async () => {
    const { useCase, create } = makeUseCase();

    await expect(
      useCase.execute({ userId: USER_ID, message: 'Hola', context: { locale: 'x'.repeat(11) } }),
    ).rejects.toThrow(FeedbackContextFieldTooLongError);
    expect(create).not.toHaveBeenCalled();
  });
});
