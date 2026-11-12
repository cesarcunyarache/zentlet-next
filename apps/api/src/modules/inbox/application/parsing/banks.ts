type KnownBank = {
  id: string;
  name: string;
  domains: string[];
};

const KNOWN_BANKS: KnownBank[] = [{ id: 'bcp', name: 'BCP', domains: ['notificacionesbcp.com.pe'] }];

export function senderDomain(address: string): string {
  return address.slice(address.lastIndexOf('@') + 1).toLowerCase();
}

export function knownBankFor(address: string): KnownBank | null {
  const domain = senderDomain(address);
  return KNOWN_BANKS.find((bank) => bank.domains.some((known) => domain === known || domain.endsWith(`.${known}`))) ?? null;
}
