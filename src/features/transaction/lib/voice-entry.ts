import type { SpeechStatus } from "../types";
import type { VoiceDraft } from "./parse-voice";
import type { TransactionFormValues } from "../schemas/transaction.schema";
import type { CategoryLike } from "../types";
import { describeOrFallback } from "./format";

export interface TranscriptCategory {
  transcript: string;
  categoryId: string;
}

interface VoiceCategoryInput {
  parsed: VoiceDraft | null;
  transcript: string;
  manualPick: TranscriptCategory | null;
  aiPick: TranscriptCategory | null;
}

export interface VoiceCategoryResolution {
  manualCategoryId: string | null;
  aiCategoryId: string | null;
  draft: VoiceDraft | null;
}

function categoryForTranscript(pick: TranscriptCategory | null, transcript: string) {
  return pick?.transcript === transcript ? pick.categoryId : null;
}

export function resolveVoiceCategory({
  parsed,
  transcript,
  manualPick,
  aiPick,
}: VoiceCategoryInput): VoiceCategoryResolution {
  const manualCategoryId = categoryForTranscript(manualPick, transcript);
  const aiCategoryId = parsed?.categoryId ? null : categoryForTranscript(aiPick, transcript);
  const draft = parsed && {
    ...parsed,
    categoryId: manualCategoryId ?? parsed.categoryId ?? aiCategoryId,
  };
  return { manualCategoryId, aiCategoryId, draft };
}

export function isAiSuggestedCategory({ manualCategoryId, aiCategoryId, draft }: VoiceCategoryResolution) {
  return aiCategoryId !== null && !manualCategoryId && aiCategoryId === draft?.categoryId;
}

export function needsAiCategory(parsed: VoiceDraft | null) {
  return Boolean(parsed && !parsed.categoryId && parsed.description);
}

export function toFormValues(
  draft: VoiceDraft,
  categories: CategoryLike[],
  defaultDescription: string,
): TransactionFormValues {
  const category = categories.find((c) => c.id === draft.categoryId);
  return {
    type: draft.type,
    amount: draft.amount ?? 0,
    categoryId: draft.categoryId ?? "",
    transactionDate: draft.transactionDate,
    description: describeOrFallback(draft.description, category?.name, defaultDescription),
  };
}

export function canSaveVoiceEntry(values: TransactionFormValues | null) {
  return Boolean(values && values.amount > 0 && values.categoryId);
}

export function toEditDraft(draft: VoiceDraft): Partial<TransactionFormValues> {
  return {
    type: draft.type,
    amount: draft.amount ?? undefined,
    description: draft.description,
    categoryId: draft.categoryId ?? undefined,
    transactionDate: draft.transactionDate,
  };
}

export function listeningStatusKey(isReady: boolean, isSpeaking: boolean) {
  if (!isReady) return "preparing";
  return isSpeaking ? "listening" : "ready";
}

export type VoiceStage = "idle" | "listening" | "preview" | "error" | "empty";

export function voiceStage(status: SpeechStatus, hasDraft: boolean): VoiceStage {
  if (status === "starting" || status === "listening") return "listening";
  if (status === "done") return hasDraft ? "preview" : "empty";
  return status;
}

export function hasFooterActions(stage: VoiceStage) {
  return stage === "listening" || stage === "preview" || stage === "error";
}
