import { PrismaPg } from '@prisma/adapter-pg';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { Logger } from '../logger/types.js';

const SLOW_QUERY_MS = 500;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(logger: Logger) {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: [{ emit: 'event', level: 'query' }],
    });
    // only the parameterized SQL: values (amounts, descriptions) never leave
    this.$on('query' as never, (event: { duration: number; query: string }) => {
      if (event.duration < SLOW_QUERY_MS) return;
      logger.warn({ durationMs: event.duration, query: event.query.slice(0, 1000) }, 'db.slow_query');
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
