import prisma from "@/lib/prisma";
import type { NewFeedback } from "../../../domain/entities/feedback.entity";
import type { FeedbackRepository } from "../../../domain/repositories/feedback.repository";

export class PrismaFeedbackRepository implements FeedbackRepository {
  insert(feedback: NewFeedback) {
    return prisma.feedback.create({ data: feedback, select: { id: true } });
  }
}
