import { describe, expect, it, vi } from "vitest";
import type { FeedbackRepository } from "../../../domain/repositories/feedback.repository";
import { SendFeedbackUseCase } from "../send-feedback.use-case";

describe("SendFeedbackUseCase", () => {
  it("guarda el comentario a nombre del usuario de la sesión", async () => {
    const repository: FeedbackRepository = { insert: vi.fn().mockResolvedValue({ id: "fb-1" }) };

    const result = await new SendFeedbackUseCase(repository).execute("user-1", {
      message: "La lista no carga",
      type: "bug",
      context: { locale: "es" },
    });

    expect(result).toEqual({ id: "fb-1" });
    expect(repository.insert).toHaveBeenCalledWith({
      userId: "user-1",
      message: "La lista no carga",
      type: "bug",
      context: { locale: "es" },
    });
  });
});
