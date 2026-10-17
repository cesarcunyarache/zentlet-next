import { createHash, randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { DEFAULT_CURRENCY } from "@/features/preference/lib/currency";
import { notify } from "@/features/notification/server/notify";
import { routing } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import { listInviteEmail } from "@/lib/email/templates";
import { siteConfig } from "@/lib/site";
import { invitePath } from "../../lib/pending-invite";
import type { InviteMailer, InviteTokens } from "../domain/ports/invite.ports";
import type { AccountCurrency, ListNotifier } from "../domain/ports/list.ports";

const TOKEN_BYTES = 24;

export const accountCurrency: AccountCurrency = {
  async of(userId: string) {
    const row = await prisma.userPreference.findUnique({ where: { userId }, select: { currency: true } });
    return row?.currency ?? DEFAULT_CURRENCY;
  },
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const inviteTokens: InviteTokens = {
  create() {
    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    return { token, hash: hashToken(token) };
  },
  hash: hashToken,
};

function inviteUrl(token: string, locale: string) {
  const lang = routing.locales.find((candidate) => candidate === locale) ?? routing.defaultLocale;
  const localePrefix = lang === routing.defaultLocale ? "" : `/${lang}`;
  return { lang, url: `${siteConfig.url}${localePrefix}${invitePath(token)}` };
}

export const inviteMailer: InviteMailer = {
  send({ to, token, inviterName, listName, locale }) {
    const { lang, url } = inviteUrl(token, locale);
    return sendEmail(listInviteEmail(lang, { to, inviterName, listName, url }));
  },
};

export const listNotifier: ListNotifier = {
  async memberJoined(ownerId, data) {
    await notify({ type: "list.joined", userId: ownerId, data, dedupeKey: `list.joined:${data.listId}:${Date.now()}` });
  },
  async ownershipReceived(userId, data) {
    await notify({ type: "list.owned", userId, data, dedupeKey: `list.owned:${data.listId}` });
  },
};
