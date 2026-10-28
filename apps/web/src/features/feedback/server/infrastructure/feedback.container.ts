import { SendFeedbackUseCase } from "../application/use-cases/send-feedback.use-case";
import { PrismaFeedbackRepository } from "./persistence/prisma/prisma-feedback.repository";

const repository = new PrismaFeedbackRepository();

export const feedbackUseCases = {
  send: new SendFeedbackUseCase(repository),
};
