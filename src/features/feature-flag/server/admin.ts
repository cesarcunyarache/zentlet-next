import type { FeatureType } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { isValidRollout } from "../lib/resolve";

interface FlagInput {
  slug: string;
  type?: FeatureType;
  description?: string;
}

export const listFlags = () =>
  prisma.feature.findMany({
    orderBy: { slug: "asc" },
    include: { _count: { select: { users: true } } },
  });

export const createFlag = ({ slug, type, description }: FlagInput, actor: string) =>
  prisma.feature.create({ data: { slug, type, description, updatedBy: actor } });

export const setFlagEnabled = (slug: string, enabled: boolean, actor: string) =>
  prisma.feature.update({ where: { slug }, data: { enabled, updatedBy: actor } });

export async function setFlagRollout(slug: string, rollout: number, actor: string) {
  if (!isValidRollout(rollout)) throw new Error(`Rollout must be an integer from 0 to 100, got ${rollout}`);
  return prisma.feature.update({ where: { slug }, data: { rollout, updatedBy: actor } });
}

export const setFlagStale = (slug: string, stale: boolean, actor: string) =>
  prisma.feature.update({ where: { slug }, data: { stale, updatedBy: actor } });

export const deleteFlag = (slug: string) => prisma.feature.delete({ where: { slug } });

async function userIdByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  if (!user) throw new Error(`No user with email ${email}`);
  return user.id;
}

export async function setUserFlag(email: string, slug: string, enabled: boolean, actor: string) {
  const userId = await userIdByEmail(email);
  return prisma.userFeature.upsert({
    where: { userId_featureId: { userId, featureId: slug } },
    create: { userId, featureId: slug, enabled, assignedBy: actor },
    update: { enabled, assignedBy: actor, assignedAt: new Date() },
  });
}

export async function clearUserFlag(email: string, slug: string) {
  const userId = await userIdByEmail(email);
  await prisma.userFeature.deleteMany({ where: { userId, featureId: slug } });
}
