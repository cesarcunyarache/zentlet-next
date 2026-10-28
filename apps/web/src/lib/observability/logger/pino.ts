import pino, { type DestinationStream, type LevelWithSilent } from "pino";
import type { Logger } from "./types";

/*
 * Adaptador de Pino: el único archivo que importa la librería. En
 * producción, una línea JSON por evento en stdout (lo recoge la plataforma
 * de despliegue); en desarrollo, una línea legible. Sólo servidor.
 */

const isDev = process.env.NODE_ENV !== "production";

/** Nunca a los logs: credenciales, PII ni el contenido de los movimientos. */
const REDACT_PATHS = [
  "password",
  "email",
  "name",
  "description",
  "amount",
  "reference",
  "token",
  "authorization",
  "cookie",
  "headers.cookie",
  "headers.authorization",
].flatMap((path) => [path, `*.${path}`]);

function resolveLevel(): LevelWithSilent {
  const level = process.env.LOG_LEVEL;
  if (level && (level === "silent" || level in pino.levels.values)) return level as LevelWithSilent;
  return isDev ? "debug" : "info";
}

const devStream: DestinationStream = {
  write(line: string) {
    const { level, msg, time, err, ...context } = JSON.parse(line);
    const extra = Object.keys(context).length ? ` ${JSON.stringify(context)}` : "";
    const stack = err?.stack ? `\n${err.stack}` : "";
    process.stdout.write(`${time} ${String(level).toUpperCase().padEnd(5)} ${msg}${extra}${stack}\n`);
  },
};

const options: pino.LoggerOptions = {
  level: resolveLevel(),
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
  redact: { paths: REDACT_PATHS, censor: "[Redacted]" },
};

export function createPinoLogger(): Logger {
  const instance = isDev ? pino(options, devStream) : pino(options);
  return {
    debug: (context, message) => instance.debug(context, message),
    info: (context, message) => instance.info(context, message),
    warn: (context, message) => instance.warn(context, message),
    error: (context, message) => instance.error(context, message),
  };
}
