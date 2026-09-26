import { APIService } from "@/core/services/api.service";
import type { FeedbackPayload } from "../schemas/feedback-api.schema";

/** Envío de comentarios. Sin cola offline: el panel muestra el error y permite reintentar. */
export class FeedbackService extends APIService {
  async sendFeedback(data: FeedbackPayload): Promise<{ id: string }> {
    const response = await this.post<{ id: string }>("/api/feedback", data);

    return response.data;
  }
}

export const feedbackService = new FeedbackService();
