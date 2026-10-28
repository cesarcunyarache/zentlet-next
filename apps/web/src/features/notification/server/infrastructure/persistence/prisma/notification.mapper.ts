import { preferencesSchema } from "@/features/preference/schemas/preference.schema";
import { NOTIFICATION_FIELDS, serializeNotification } from "../../../../lib/serialize";
import type { ClaimedDelivery } from "../../../domain/entities/notification.entity";

export const CLAIMED_DELIVERY_SELECT = {
  id: true,
  channel: true,
  attempts: true,
  notification: {
    select: {
      ...NOTIFICATION_FIELDS,
      user: { select: { email: true, name: true, preference: { select: { language: true } } } },
    },
  },
} as const;

interface ClaimedDeliveryRow {
  id: string;
  channel: string;
  attempts: number;
  notification: Parameters<typeof serializeNotification>[0] & {
    user: { email: string; name: string; preference: { language: string } | null };
  };
}

export function toClaimedDelivery({ id, channel, attempts, notification }: ClaimedDeliveryRow): ClaimedDelivery {
  const { user, ...row } = notification;
  const locale = preferencesSchema.shape.language.parse(user.preference?.language);

  return {
    id,
    channel,
    attempts,
    notification: serializeNotification(row),
    recipient: { email: user.email, name: user.name, locale },
  };
}
