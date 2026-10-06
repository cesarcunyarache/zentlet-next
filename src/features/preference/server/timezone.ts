import prisma from "@/lib/prisma";
import { isoDateIn } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "../schemas/preference.schema";

export async function userTimeZone(userId: string) {
  const preference = await prisma.userPreference.findUnique({ where: { userId }, select: { timezone: true } });
  return preference?.timezone ?? DEFAULT_TIMEZONE;
}

export async function userLocalDate(userId: string, at = new Date()) {
  return isoDateIn(await userTimeZone(userId), at);
}
