import { createPinoLogger } from "./pino";
import type { Logger } from "./types";

/** Logger del servidor. Cambiar de librería es escribir otro adaptador y elegirlo aquí. */
export const logger: Logger = createPinoLogger();

export type { LogContext, Logger } from "./types";
