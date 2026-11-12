import { Redis } from 'ioredis';
import { KeyValueStore } from '../types.js';

const CONNECT_TIMEOUT_MS = 1_000;
const COMMAND_TIMEOUT_MS = 500;

const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return count`;

export class RedisKeyValueStore extends KeyValueStore {
  private readonly client: Redis;
  private connecting: Promise<void> | null = null;

  constructor(url: string) {
    super();
    this.client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      connectTimeout: CONNECT_TIMEOUT_MS,
      commandTimeout: COMMAND_TIMEOUT_MS,
    });
    this.client.on('error', () => {});
  }

  private ready(): Promise<void> {
    if (this.client.status === 'ready') return Promise.resolve();
    this.connecting ??= this.client.connect().finally(() => {
      this.connecting = null;
    });
    return this.connecting ?? Promise.resolve();
  }

  async get(key: string): Promise<string | null> {
    await this.ready();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ready();
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    await this.ready();
    return (await this.client.set(key, value, 'EX', ttlSeconds, 'NX')) === 'OK';
  }

  async delete(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.ready();
    await this.client.del(...keys);
  }

  async increment(key: string, windowMs: number): Promise<number> {
    await this.ready();
    return Number(await this.client.eval(INCREMENT_SCRIPT, 1, key, windowMs));
  }

  async ping(): Promise<void> {
    await this.ready();
    await this.client.ping();
  }
}
