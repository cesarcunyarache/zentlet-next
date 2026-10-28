import type { EmailHeader } from "../types";
import { senderDomain } from "./banks";

const AUTH_HEADERS = ["authentication-results", "arc-authentication-results"];

export function isDkimVerified(headers: EmailHeader[], address: string) {
  const domain = senderDomain(address);
  return headers
    .filter((header) => AUTH_HEADERS.includes(header.name.toLowerCase()))
    .some(({ value }) => {
      const lower = value.toLowerCase();
      return /dkim=pass/.test(lower) && (lower.includes(`header.d=${domain}`) || lower.includes(`header.i=@${domain}`));
    });
}
