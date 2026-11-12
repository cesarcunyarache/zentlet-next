const LINK_COMMAND = /^(?:link|vincular|conectar|connect)\s+([a-z0-9-]{4,20})$/i;

const UNLINK_WORDS = new Set(['unlink', 'disconnect', 'desvincular', 'desconectar']);

export function parseLinkCommand(text: string): string | null {
  const match = LINK_COMMAND.exec(text.trim());
  return match ? match[1] : null;
}

export function isUnlinkCommand(text: string): boolean {
  return UNLINK_WORDS.has(text.trim().toLowerCase());
}
