"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { useSignOut } from "../hooks/useSignOut";
import { signOutHint } from "../lib/settings-hints";
import { SettingsRowText } from "./settings-row";

export function SignOutRow() {
  const t = useTranslations("settings.signOut");
  const { online: isOnline, pendingCount } = useSyncStatus();
  const { signOut, isConfirming, isSigningOut } = useSignOut(pendingCount);
  const hint = signOutHint({ isOnline, isConfirming, pendingCount });

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={!isOnline || isSigningOut}
      className="flex w-full items-center justify-between gap-3.5 py-3.5 text-left disabled:opacity-50"
    >
      <SettingsRowText
        label={t(isSigningOut ? "pending" : "label")}
        hint={t(hint.key, hint.values)}
        labelTone={isConfirming ? "danger" : "default"}
      />
      <LogOut className="text-app-muted size-4 shrink-0" aria-hidden />
    </button>
  );
}
