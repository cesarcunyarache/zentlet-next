import { Logger, type LogContext } from '../../../shared/logger/domain/logger.js';

export class FakeLogger extends Logger {
  debug(_context: LogContext, _message: string): void {}
  info(_context: LogContext, _message: string): void {}
  warn(_context: LogContext, _message: string): void {}
  error(_context: LogContext, _message: string): void {}
}
