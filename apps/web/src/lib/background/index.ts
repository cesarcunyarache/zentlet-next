import { nextBackgroundRunner } from "./next";
import type { BackgroundTask } from "./types";

/** Encola `task` tras la respuesta. Sus errores los maneja la propia tarea. */
export function runInBackground(task: BackgroundTask) {
  nextBackgroundRunner.run(task);
}

export type { BackgroundRunner, BackgroundTask } from "./types";
