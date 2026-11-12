import { KeyValueStore } from '../../../shared/kv/domain/key-value-store.js';

export class FakeKeyValueStore extends KeyValueStore {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string, _ttlSeconds: number): Promise<void> {
    this.values.set(key, value);
  }

  async setIfAbsent(key: string, value: string, _ttlSeconds: number): Promise<boolean> {
    if (this.values.has(key)) return false;
    this.values.set(key, value);
    return true;
  }

  async delete(...keys: string[]): Promise<void> {
    for (const key of keys) this.values.delete(key);
  }

  async increment(key: string, _windowMs: number): Promise<number> {
    const next = Number(this.values.get(key) ?? '0') + 1;
    this.values.set(key, String(next));
    return next;
  }

  async ping(): Promise<void> {}
}
