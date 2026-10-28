import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import type { Interpretation, InterpretationRequest, InterpretationResult, MediaFile } from "../../types";
import { buildMessagePrompt } from "../prompts/whatsapp-message.prompt";
import { interpretationSchema, WHATSAPP_AUDIO_MAX_BYTES, type InterpretationOutput } from "../schemas/whatsapp-ai.schema";

const OPERATION = "whatsapp.interpret_message";
const TIMEOUT_MS = 20_000;

function toInterpretation(output: InterpretationOutput): Interpretation {
  return {
    intent: output.intent,
    movements: output.movements,
    period: output.period ? { from: output.period.from ?? undefined, to: output.period.to ?? undefined } : null,
    reply: output.reply,
  };
}

export async function interpretMessage(
  userId: string,
  input: InterpretationRequest,
  audio: MediaFile | null = null,
): Promise<InterpretationResult> {
  if (audio && (audio.data.byteLength === 0 || audio.data.byteLength > WHATSAPP_AUDIO_MAX_BYTES))
    return { ok: false, error: "failed" };
  if (!(await allowAiCall(userId, OPERATION))) return { ok: false, error: "limited" };

  try {
    const output = (await generateObject({
      operation: OPERATION,
      prompt: buildMessagePrompt(input),
      schema: interpretationSchema,
      file: audio ?? undefined,
      timeoutMs: TIMEOUT_MS,
    })) as InterpretationOutput;
    return { ok: true, interpretation: toInterpretation(output) };
  } catch {
    return { ok: false, error: "failed" };
  }
}
