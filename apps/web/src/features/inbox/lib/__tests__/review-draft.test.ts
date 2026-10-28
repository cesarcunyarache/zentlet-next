import { describe, expect, it } from "vitest";
import type { TInboxItem } from "../../types";
import { isDraftEdited, parseDraftAmount, toAcceptValues, toInboxDraft } from "../review-draft";

const item: TInboxItem = {
  id: "i1",
  bank: "BCP",
  senderAddress: "notificaciones@notificacionesbcp.com.pe",
  subject: "Constancia de consumo",
  isVerified: true,
  isNewSender: false,
  isLearned: true,
  type: "expense",
  amount: 14.5,
  currency: "PEN",
  merchant: "Ikf A53 Piura 21",
  description: "KFC",
  categoryId: "food",
  transactionDate: "2026-09-24",
  cardLast4: "6973",
  duplicateOfId: null,
  receivedAt: "2026-09-24T23:55:00.000Z",
};

describe("review draft", () => {
  it("accepts a learned item as is", () => {
    expect(toAcceptValues(item, toInboxDraft(item), "Movimiento")).toEqual({
      type: "expense",
      amount: 14.5,
      categoryId: "food",
      description: "KFC",
      transactionDate: "2026-09-24",
    });
    expect(isDraftEdited(item, toInboxDraft(item))).toBe(false);
  });

  it("needs a category and a positive amount", () => {
    expect(toAcceptValues(item, { ...toInboxDraft(item), categoryId: null }, "x")).toBeNull();
    expect(toAcceptValues(item, { ...toInboxDraft(item), rawAmount: "0" }, "x")).toBeNull();
  });

  it("uses the fallback when the description is cleared and notices edits", () => {
    const draft = { ...toInboxDraft(item), description: "  " };
    expect(toAcceptValues(item, draft, "Movimiento")?.description).toBe("Movimiento");
    expect(isDraftEdited(item, draft)).toBe(true);
  });

  it("parses comma decimals", () => {
    expect(parseDraftAmount("14,567")).toBe(14.57);
    expect(parseDraftAmount("abc")).toBeNull();
  });
});
