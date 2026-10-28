/**
 * Almacén clave-valor con expiración (caché y contadores). El resto del
 * código sólo conoce esta interfaz: el adaptador concreto (hoy Redis) se
 * elige en `index.ts` y puede cambiarse sin tocar a quien lo usa.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** `true` si la clave no existía y quedó guardada. */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  delete(...keys: string[]): Promise<void>;
  /** Suma 1 al contador; la ventana empieza con el primer uso. Devuelve el total. */
  increment(key: string, windowMs: number): Promise<number>;
  ping(): Promise<void>;
}
