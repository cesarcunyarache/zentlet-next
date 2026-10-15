export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const isInviteUsable = (invite: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now: Date) =>
  !invite.acceptedAt && !invite.revokedAt && invite.expiresAt.getTime() > now.getTime();
