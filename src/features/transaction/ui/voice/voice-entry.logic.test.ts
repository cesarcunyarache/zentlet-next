import { describe, expect, it } from "vitest";
import type { VoiceDraft } from "../../lib/parse-voice";
import {
  canSaveVoiceEntry,
  hasFooterActions,
  isAiSuggestedCategory,
  listeningStatusKey,
  needsAiCategory,
  resolveVoiceCategory,
  toEditDraft,
  toFormValues,
  voiceStage,
} from "./voice-entry.logic";

const categories = [
  { id: "food", name: "Comida" },
  { id: "car", name: "Auto" },
];

function draftWith(overrides: Partial<VoiceDraft> = {}): VoiceDraft {
  return {
    type: "expense",
    amount: 25,
    description: "almuerzo",
    categoryId: null,
    transactionDate: "2026-09-20",
    ...overrides,
  };
}

describe("resolveVoiceCategory", () => {
  it("sin dictado interpretado no hay borrador", () => {
    const result = resolveVoiceCategory({ parsed: null, transcript: "x", manualPick: null, aiPick: null });
    expect(result).toEqual({ manualCategoryId: null, aiCategoryId: null, draft: null });
  });

  it("la elección manual manda sobre el texto y la IA", () => {
    const result = resolveVoiceCategory({
      parsed: draftWith({ categoryId: "food" }),
      transcript: "t",
      manualPick: { transcript: "t", categoryId: "car" },
      aiPick: { transcript: "t", categoryId: "food" },
    });
    expect(result.manualCategoryId).toBe("car");
    expect(result.aiCategoryId).toBeNull();
    expect(result.draft?.categoryId).toBe("car");
  });

  it("la IA sólo cuenta si el texto no encontró categoría", () => {
    const result = resolveVoiceCategory({
      parsed: draftWith(),
      transcript: "t",
      manualPick: null,
      aiPick: { transcript: "t", categoryId: "food" },
    });
    expect(result.aiCategoryId).toBe("food");
    expect(result.draft?.categoryId).toBe("food");
    expect(isAiSuggestedCategory(result)).toBe(true);
  });

  it("ignora elecciones ligadas a otro dictado", () => {
    const result = resolveVoiceCategory({
      parsed: draftWith(),
      transcript: "nuevo",
      manualPick: { transcript: "viejo", categoryId: "car" },
      aiPick: { transcript: "viejo", categoryId: "food" },
    });
    expect(result.manualCategoryId).toBeNull();
    expect(result.aiCategoryId).toBeNull();
    expect(result.draft?.categoryId).toBeNull();
    expect(isAiSuggestedCategory(result)).toBe(false);
  });

  it("con elección manual la categoría ya no se marca como sugerida", () => {
    const result = resolveVoiceCategory({
      parsed: draftWith(),
      transcript: "t",
      manualPick: { transcript: "t", categoryId: "food" },
      aiPick: { transcript: "t", categoryId: "food" },
    });
    expect(isAiSuggestedCategory(result)).toBe(false);
  });
});

describe("needsAiCategory", () => {
  it("pide a la IA sólo si hay descripción y falta categoría", () => {
    expect(needsAiCategory(null)).toBe(false);
    expect(needsAiCategory(draftWith())).toBe(true);
    expect(needsAiCategory(draftWith({ description: "" }))).toBe(false);
    expect(needsAiCategory(draftWith({ categoryId: "food" }))).toBe(false);
  });
});

describe("toFormValues", () => {
  it("rellena monto y categoría vacíos", () => {
    expect(toFormValues(draftWith({ amount: null }), categories, "Movimiento")).toEqual({
      type: "expense",
      amount: 0,
      categoryId: "",
      transactionDate: "2026-09-20",
      description: "almuerzo",
    });
  });

  it("sin descripción usa el nombre de la categoría y luego el texto por defecto", () => {
    expect(toFormValues(draftWith({ description: "", categoryId: "car" }), categories, "Mov").description).toBe("Auto");
    expect(toFormValues(draftWith({ description: "" }), categories, "Mov").description).toBe("Mov");
  });
});

describe("canSaveVoiceEntry", () => {
  it("exige monto positivo y categoría", () => {
    const values = toFormValues(draftWith({ categoryId: "food" }), categories, "Mov");
    expect(canSaveVoiceEntry(null)).toBe(false);
    expect(canSaveVoiceEntry(values)).toBe(true);
    expect(canSaveVoiceEntry({ ...values, amount: 0 })).toBe(false);
    expect(canSaveVoiceEntry({ ...values, categoryId: "" })).toBe(false);
  });
});

describe("toEditDraft", () => {
  it("convierte los nulos en ausentes", () => {
    expect(toEditDraft(draftWith({ amount: null }))).toEqual({
      type: "expense",
      amount: undefined,
      description: "almuerzo",
      categoryId: undefined,
      transactionDate: "2026-09-20",
    });
  });
});

describe("listeningStatusKey", () => {
  it("prepara, luego escucha o espera", () => {
    expect(listeningStatusKey(false, true)).toBe("preparing");
    expect(listeningStatusKey(true, true)).toBe("listening");
    expect(listeningStatusKey(true, false)).toBe("ready");
  });
});

describe("voiceStage", () => {
  it("agrupa los estados del reconocimiento en lo que muestra la hoja", () => {
    expect(voiceStage("idle", false)).toBe("idle");
    expect(voiceStage("starting", false)).toBe("listening");
    expect(voiceStage("listening", false)).toBe("listening");
    expect(voiceStage("done", true)).toBe("preview");
    expect(voiceStage("done", false)).toBe("empty");
    expect(voiceStage("error", false)).toBe("error");
  });
});

describe("hasFooterActions", () => {
  it("sin acciones mientras no hay nada que confirmar", () => {
    expect(hasFooterActions("idle")).toBe(false);
    expect(hasFooterActions("empty")).toBe(false);
    expect(hasFooterActions("listening")).toBe(true);
    expect(hasFooterActions("preview")).toBe(true);
    expect(hasFooterActions("error")).toBe(true);
  });
});
