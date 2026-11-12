export type LogContext = object;

export abstract class Logger {
  abstract debug(context: LogContext, message: string): void;
  abstract info(context: LogContext, message: string): void;
  abstract warn(context: LogContext, message: string): void;
  abstract error(context: LogContext, message: string): void;
}
