import { Module } from '@nestjs/common';
import { SubmitFeedbackUseCase } from './application/use-cases/submit-feedback/submit-feedback.use-case.js';
import { FeedbackRepository } from './domain/feedback/feedback.repository.js';
import { PrismaFeedbackRepository } from './infrastructure/feedback/prisma-feedback.repository.js';

@Module({
  providers: [SubmitFeedbackUseCase, { provide: FeedbackRepository, useClass: PrismaFeedbackRepository }],
  exports: [SubmitFeedbackUseCase],
})
export class FeedbackModule {}
