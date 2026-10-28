import type { InboundEmail } from "../types";

const GMAIL_FORWARDING = "forwarding-noreply@google.com";
const CODE = /#?(\d{6,12})/;
const CONFIRM_URL = /https:\/\/(?:mail-settings\.google\.com|mail\.google\.com)\/\S+/;

interface GmailVerification {
  code: string | null;
  url: string | null;
}

export function readGmailVerification(email: Pick<InboundEmail, "from" | "subject">, body: string): GmailVerification | null {
  if (!email.from.toLowerCase().includes(GMAIL_FORWARDING)) return null;
  const code = CODE.exec(email.subject)?.[1] ?? CODE.exec(body)?.[1] ?? null;
  const url = CONFIRM_URL.exec(body)?.[0].replace(/[.)>\]]+$/, "") ?? null;
  return { code, url };
}
