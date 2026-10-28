import { describe, expect, it } from "vitest";
import { fromGmailMessage, gmailHeader, isIncomingMessage, type GmailMessage } from "../gmail-message";

const encode = (value: string) => Buffer.from(value).toString("base64url");

const message: GmailMessage = {
  id: "18f2a",
  labelIds: ["INBOX", "UNREAD"],
  internalDate: "1790297700000",
  payload: {
    mimeType: "multipart/alternative",
    headers: [
      { name: "From", value: "BCP <notificaciones@notificacionesbcp.com.pe>" },
      { name: "Subject", value: "Constancia de consumo" },
    ],
    parts: [
      { mimeType: "text/plain", body: { data: encode("Total del consumo S/ 14.50") } },
      { mimeType: "text/html", body: { data: encode("<p>Total del consumo S/ 14.50</p>") } },
      { mimeType: "image/png", body: { size: 10 } },
    ],
  },
};

describe("fromGmailMessage", () => {
  it("decodes the text and html bodies and keeps the headers", () => {
    expect(fromGmailMessage(message)).toEqual({
      messageId: "gmail:18f2a",
      from: "BCP <notificaciones@notificacionesbcp.com.pe>",
      recipients: [],
      subject: "Constancia de consumo",
      text: "Total del consumo S/ 14.50",
      html: "<p>Total del consumo S/ 14.50</p>",
      headers: message.payload!.headers,
      receivedAt: new Date(1790297700000),
    });
  });

  it("falls back to now without a valid internal date", () => {
    const now = new Date("2026-10-05T00:00:00Z");
    expect(fromGmailMessage({ id: "x" }, now)).toMatchObject({ from: "", text: "", receivedAt: now });
  });
});

describe("gmailHeader", () => {
  it("matches header names case-insensitively", () => {
    expect(gmailHeader(message, "subject")).toBe("Constancia de consumo");
    expect(gmailHeader(message, "Reply-To")).toBe("");
  });
});

describe("isIncomingMessage", () => {
  it("skips drafts, sent mail and spam", () => {
    expect(isIncomingMessage(["INBOX"])).toBe(true);
    expect(isIncomingMessage(undefined)).toBe(true);
    expect(isIncomingMessage(["SENT"])).toBe(false);
    expect(isIncomingMessage(["SPAM", "UNREAD"])).toBe(false);
  });
});
