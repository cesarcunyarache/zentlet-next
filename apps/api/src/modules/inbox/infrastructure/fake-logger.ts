import { vi } from 'vitest';
import type { Logger } from '../../../shared/logger/domain/logger.js';

// A plain object, not the `Logger` abstract class: reading `logger.warn` to
// assert on it would otherwise trip oxlint's unbound-method check, which
// treats abstract-class methods specially. Not a *.spec.ts file, so vitest's
// `**/*.spec.ts` include does not run it as a test.
export function createFakeLogger() {
  return {
    debug: vi.fn<Logger['debug']>(),
    info: vi.fn<Logger['info']>(),
    warn: vi.fn<Logger['warn']>(),
    error: vi.fn<Logger['error']>(),
  };
}
