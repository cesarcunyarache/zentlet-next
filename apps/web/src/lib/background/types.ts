/**
 * Trabajo que no debe retrasar la respuesta (analytics, avisos de
 * presupuesto). Quien lo encola no sabe cómo se ejecuta: hoy con `after`
 * de Next; en un backend dedicado, con `setImmediate` o una cola.
 */
export type BackgroundTask = () => Promise<unknown>;

export interface BackgroundRunner {
  run(task: BackgroundTask): void;
}
