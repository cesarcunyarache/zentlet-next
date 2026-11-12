import { Injectable } from '@nestjs/common';
import type { Feedback as FeedbackRow, Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { Feedback, FeedbackContext, FeedbackStatus, FeedbackType } from '../../domain/feedback/feedback.js';
import { FeedbackRepository } from '../../domain/feedback/feedback.repository.js';

function toDomain(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as FeedbackType,
    status: row.status as FeedbackStatus,
    message: row.message,
    context: (row.context as FeedbackContext | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaFeedbackRepository extends FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(feedback: Feedback): Promise<Feedback> {
    const row = await this.prisma.feedback.create({
      data: {
        id: feedback.id,
        userId: feedback.userId,
        type: feedback.type,
        status: feedback.status,
        message: feedback.message,
        context: (feedback.context ?? undefined) as Prisma.InputJsonValue | undefined,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
      },
    });
    return toDomain(row);
  }
}
