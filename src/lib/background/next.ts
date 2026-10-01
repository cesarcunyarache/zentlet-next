import { after } from "next/server";
import type { BackgroundRunner } from "./types";

/*
 * Adaptador de Next: el único archivo de los servicios que importa
 * `next/server`. `after` ejecuta la tarea al terminar la respuesta; fuera
 * de una petición (scripts, tests) no existe y la tarea corre en el acto.
 */
export const nextBackgroundRunner: BackgroundRunner = {
  run(task) {
    try {
      after(task);
    } catch {
      void task();
    }
  },
};
