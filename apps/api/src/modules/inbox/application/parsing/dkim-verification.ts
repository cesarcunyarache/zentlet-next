import type { EmailHeader } from '../../domain/inbox-transaction/inbox-transaction.js';
import { senderDomain } from './banks.js';

const AUTH_HEADERS = ['authentication-results', 'arc-authentication-results'];

export function isDkimVerified(headers: EmailHeader[], address: string): boolean {
  const domain = senderDomain(address);
  return headers
    .filter((header) => AUTH_HEADERS.includes(header.name.toLowerCase()))
    .some(({ value }) => {
      const lower = value.toLowerCase();
      return /dkim=pass/.test(lower) && (lower.includes(`header.d=${domain}`) || lower.includes(`header.i=@${domain}`));
    });
}
