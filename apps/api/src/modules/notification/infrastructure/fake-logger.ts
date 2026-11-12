import { Logger, type LogContext } from '../../../shared/logger/domain/logger.js';

// Not a *.spec.ts file, so vitest's `**/*.spec.ts` include does not run it as a test.
export class FakeLogger extends Logger {
  debug(_context: LogContext, _message: string): void {}
  info(_context: LogContext, _message: string): void {}
  warn(_context: LogContext, _message: string): void {}
  error(_context: LogContext, _message: string): void {}
}
