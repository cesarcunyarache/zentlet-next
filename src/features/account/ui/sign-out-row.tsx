"use client";

import { useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { useSignOut } from "../hooks/useSignOut";
import { signOutHint } from "../lib/settings-hints";
import { SettingsButtonRow } from "./settings-row";

export function SignOutRow() {
  const t = useTranslations("settings.signOut");
  const { online: isOnline, pendingCount } = useSyncStatus();
  const { signOut, isConfirming, isSigningOut } = useSignOut(pendingCount);
  const hint = signOutHint({ isOnline, isConfirming, pendingCount });

  return (
    <SettingsButtonRow
      label={t(isSigningOut ? "pending" : "label")}
      hint={t(hint.key, hint.values)}
      labelTone={isConfirming ? "danger" : "default"}
      onClick={signOut}
      disabled={!isOnline || isSigningOut}
     
    />
  );
}
