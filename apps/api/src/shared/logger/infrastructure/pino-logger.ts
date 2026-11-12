import pino, { type DestinationStream, type LevelWithSilent } from 'pino';
import { Logger, type LogContext } from '../domain/logger.js';

const REDACT_PATHS = [
  'password',
  'email',
  'name',
  'description',
  'amount',
  'reference',
  'token',
  'authorization',
  'cookie',
  'headers.cookie',
  'headers.authorization',
].flatMap((path) => [path, `*.${path}`]);

function resolveLevel(): LevelWithSilent {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = process.env.LOG_LEVEL;
  if (level && (level === 'silent' || level in pino.levels.values)) return level as LevelWithSilent;
  return isDev ? 'debug' : 'info';
}

const devStream: DestinationStream = {
  write(line: string) {
    const { level, msg, time, err, ...context } = JSON.parse(line);
    const extra = Object.keys(context).length ? ` ${JSON.stringify(context)}` : '';
    const stack = err?.stack ? `\n${err.stack}` : '';
    process.stdout.write(`${time} ${String(level).toUpperCase().padEnd(5)} ${msg}${extra}${stack}\n`);
  },
};

export class PinoLogger extends Logger {
  private readonly instance: pino.Logger;

  constructor() {
    super();
    const isDev = process.env.NODE_ENV !== 'production';
    const options: pino.LoggerOptions = {
      level: resolveLevel(),
      base: null,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
    };
    this.instance = isDev ? pino(options, devStream) : pino(options);
  }

  debug(context: LogContext, message: string): void {
    this.instance.debug(context, message);
  }

  info(context: LogContext, message: string): void {
    this.instance.info(context, message);
  }

  warn(context: LogContext, message: string): void {
    this.instance.warn(context, message);
  }

  error(context: LogContext, message: string): void {
    this.instance.error(context, message);
  }
}
