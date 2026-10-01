import { describe, expect, it } from "vitest";
import { FEEDBACK_MAX_LENGTH } from "../../constants";
import {
  COUNTER_VISIBLE_FROM,
  buildFeedbackContext,
  canSendFeedback,
  feedbackViewOf,
  isSubmitShortcut,
  remainingCharacters,
  shouldShowCounterRow,
} from "../feedback-form";

describe("canSendFeedback", () => {
  it("con conexión, sin envío en curso y con texto se puede enviar", () => {
    expect(canSendFeedback({ isOnline: true, isSending: false, message: "hola" })).toBe(true);
  });

  it.each([
    ["sin conexión", { isOnline: false, isSending: false, message: "hola" }],
    ["enviando", { isOnline: true, isSending: true, message: "hola" }],
    ["vacío", { isOnline: true, isSending: false, message: "" }],
    ["sólo espacios", { isOnline: true, isSending: false, message: "  \n\t " }],
  ])("%s no se puede enviar", (_, state) => {
    expect(canSendFeedback(state)).toBe(false);
  });
});

describe("shouldShowCounterRow", () => {
  it("empieza a mostrarse 200 caracteres antes del máximo", () => {
    expect(COUNTER_VISIBLE_FROM).toBe(FEEDBACK_MAX_LENGTH - 200);
    expect(shouldShowCounterRow(COUNTER_VISIBLE_FROM - 1, true)).toBe(false);
    expect(shouldShowCounterRow(COUNTER_VISIBLE_FROM, true)).toBe(true);
  });

  it("sin conexión siempre se muestra, para avisarlo", () => {
    expect(shouldShowCounterRow(0, false)).toBe(true);
  });
});

describe("remainingCharacters", () => {
  it("cuenta lo que falta hasta el máximo", () => {
    expect(remainingCharacters(0)).toBe(FEEDBACK_MAX_LENGTH);
    expect(remainingCharacters(FEEDBACK_MAX_LENGTH)).toBe(0);
  });
});

describe("isSubmitShortcut", () => {
  it.each([
    [{ key: "Enter", metaKey: true, ctrlKey: false }, true],
    [{ key: "Enter", metaKey: false, ctrlKey: true }, true],
    [{ key: "Enter", metaKey: false, ctrlKey: false }, false],
    [{ key: "a", metaKey: true, ctrlKey: true }, false],
  ])("%o → %s", (event, expected) => {
    expect(isSubmitShortcut(event)).toBe(expected);
  });
});

describe("buildFeedbackContext", () => {
  it("recorta el user agent a 400 caracteres", () => {
    const context = buildFeedbackContext({
      locale: "es",
      path: "/admin",
      userAgent: "x".repeat(500),
      isOnline: true,
    });

    expect(context).toEqual({ locale: "es", path: "/admin", userAgent: "x".repeat(400), online: true });
  });
});

describe("feedbackViewOf", () => {
  it.each([
    ["idle", "form"],
    ["open", "form"],
    ["sending", "form"],
    ["sent", "sent"],
    ["error", "error"],
  ] as const)("%s muestra la vista %s", (status, view) => {
    expect(feedbackViewOf(status)).toBe(view);
  });
});
