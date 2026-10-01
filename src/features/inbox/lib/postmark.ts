import { z } from "zod";
import type { InboundEmail } from "../types";

const recipientSchema = z.object({ Email: z.string() });

export const postmarkInboundSchema = z.object({
  MessageID: z.string().min(1),
  From: z.string(),
  OriginalRecipient: z.string().optional(),
  ToFull: z.array(recipientSchema).optional(),
  CcFull: z.array(recipientSchema).optional(),
  BccFull: z.array(recipientSchema).optional(),
  Subject: z.string().default(""),
  TextBody: z.string().default(""),
  HtmlBody: z.string().default(""),
  Date: z.string().optional(),
  Headers: z.array(z.object({ Name: z.string(), Value: z.string() })).default([]),
});

export type PostmarkInbound = z.infer<typeof postmarkInboundSchema>;

function receivedAt(value: string | undefined, now: Date) {
  const parsed = value ? new Date(value) : now;
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

export function fromPostmark(payload: PostmarkInbound, now = new Date()): InboundEmail {
  const listed = [...(payload.ToFull ?? []), ...(payload.CcFull ?? []), ...(payload.BccFull ?? [])].map(
    (recipient) => recipient.Email,
  );
  return {
    messageId: payload.MessageID,
    from: payload.From,
    recipients: [payload.OriginalRecipient, ...listed].filter((value): value is string => Boolean(value)),
    subject: payload.Subject,
    text: payload.TextBody,
    html: payload.HtmlBody,
    headers: payload.Headers.map(({ Name, Value }) => ({ name: Name, value: Value })),
    receivedAt: receivedAt(payload.Date, now),
  };
}
