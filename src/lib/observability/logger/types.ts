export type LogContext = object;

/**
 * Logs estructurados del servidor: un contexto (objeto) y un mensaje
 * estable (`area.evento`). El resto del código sólo conoce esta interfaz;
 * la librería concreta (hoy Pino) vive en su adaptador.
 */
export interface Logger {
  debug(context: LogContext, message: string): void;
  info(context: LogContext, message: string): void;
  warn(context: LogContext, message: string): void;
  error(context: LogContext, message: string): void;
}
