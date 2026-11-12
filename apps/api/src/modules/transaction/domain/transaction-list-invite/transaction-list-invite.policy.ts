export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type InviteStatus = {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
};

export function isInviteUsable(invite: InviteStatus, now: Date): boolean {
  const alreadyUsed = invite.acceptedAt !== null || invite.revokedAt !== null;
  if (alreadyUsed) return false;

  return invite.expiresAt.getTime() > now.getTime();
}
