"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { siteConfig } from "@/lib/site";
import { needsSignOutConfirmation } from "../lib/settings-hints";
import { useLeaveApp } from "./useLeaveApp";

const CONFIRMATION_TIMEOUT_MS = 4000;

export function useSignOut(pendingCount: number) {
  const leaveApp = useLeaveApp();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isConfirming) return;
    const timer = setTimeout(() => setIsConfirming(false), CONFIRMATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  async function signOut() {
    if (needsSignOutConfirmation(pendingCount, isConfirming)) {
      setIsConfirming(true);
      return;
    }
    setIsSigningOut(true);
    const isSignedOut = await authClient.signOut().then(
      ({ error }) => !error,
      () => false,
    );
    if (!isSignedOut) {
      setIsSigningOut(false);
      return;
    }
    await leaveApp(siteConfig.routes.signIn);
  }

  return { signOut, isConfirming, isSigningOut };
}
