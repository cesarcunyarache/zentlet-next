"use client";

import { usePendingInvite } from "../../hooks/usePendingInvite";

export function PendingInviteRedirect({ token }: { token: string }) {
  usePendingInvite(token);
  return null;
}
