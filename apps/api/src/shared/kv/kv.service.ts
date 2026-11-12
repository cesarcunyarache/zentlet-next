import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '../logger/types.js';
import { KeyValueStore } from './types.js';

const COOLDOWN_MS = 30_000;

@Injectable()
export class KvService {
  private unavailableUntil = 0;

  constructor(
    @Inject(KeyValueStore) private readonly store: KeyValueStore | null,
    private readonly logger: Logger,
  ) {}

  get isEnabled(): boolean {
    return this.store !== null;
  }

  /** Runs `operation` against the store. `null` if unconfigured or down; never throws. */
  async withStore<T>(operation: (store: KeyValueStore) => Promise<T>): Promise<T | null> {
    if (!this.store || Date.now() < this.unavailableUntil) return null;
    try {
      return await operation(this.store);
    } catch (error) {
      this.unavailableUntil = Date.now() + COOLDOWN_MS;
      this.logger.warn({ err: error, retryInMs: COOLDOWN_MS }, 'kv.unavailable');
      return null;
    }
  }

  /** For health checks: `null` if unconfigured. Ignores the post-failure cooldown. */
  async ping(): Promise<boolean | null> {
    if (!this.store) return null;
    await this.store.ping();
    this.unavailableUntil = 0;
    return true;
  }
}
