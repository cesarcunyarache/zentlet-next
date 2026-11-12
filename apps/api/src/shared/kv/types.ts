export abstract class KeyValueStore {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** `true` if the key did not exist and was stored. */
  abstract setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  abstract delete(...keys: string[]): Promise<void>;
  /** Adds 1 to the counter; the window starts on first use. Returns the total. */
  abstract increment(key: string, windowMs: number): Promise<number>;
  abstract ping(): Promise<void>;
}
