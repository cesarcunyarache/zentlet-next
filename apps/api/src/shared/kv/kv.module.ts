import { Global, Module } from '@nestjs/common';
import { RedisKeyValueStore } from './infrastructure/redis-key-value-store.js';
import { KvService } from './application/kv.service.js';
import { KeyValueStore } from './domain/key-value-store.js';

@Global()
@Module({
  providers: [
    {
      provide: KeyValueStore,
      useFactory: () => (process.env.REDIS_URL ? new RedisKeyValueStore(process.env.REDIS_URL) : null),
    },
    KvService,
  ],
  exports: [KvService],
})
export class KvModule {}
