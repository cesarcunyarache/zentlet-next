import { Global, Module } from '@nestjs/common';
import { PinoLogger } from './infrastructure/pino-logger.js';
import { Logger } from './domain/logger.js';

@Global()
@Module({
  providers: [{ provide: Logger, useClass: PinoLogger }],
  exports: [Logger],
})
export class LoggerModule {}
