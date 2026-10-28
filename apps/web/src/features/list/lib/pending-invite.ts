import { siteConfig } from "@/lib/site";

export const PENDING_INVITE_COOKIE = "list_invite";

export const PENDING_INVITE_MAX_AGE_S = 24 * 60 * 60;

const INVITE_PATH = new RegExp(`^${siteConfig.routes.lists}/invite/([A-Za-z0-9_-]{16,200})/?$`);

export const invitePath = (token: string) => `${siteConfig.routes.lists}/invite/${token}`;

export function inviteTokenFromPath(path: string) {
  return INVITE_PATH.exec(path)?.[1] ?? null;
}
