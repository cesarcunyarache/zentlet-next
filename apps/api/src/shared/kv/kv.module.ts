import { Global, Module } from '@nestjs/common';
import { RedisKeyValueStore } from './adapters/redis-key-value-store.js';
import { KvService } from './kv.service.js';
import { KeyValueStore } from './types.js';

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
