"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { accountService } from "@/features/account/services/account.service";
import { isDoneOnDevice, markDoneOnDevice } from "../lib/device-storage";
import { OnboardingContext } from "../lib/onboarding-context";

interface OnboardingProviderProps {
  userId: string;
  pending: boolean;
  children: React.ReactNode;
}

const noopSubscribe = () => () => {};

const completeOnServer = () => accountService.completeOnboarding().catch(() => {});

export function OnboardingProvider({ userId, pending, children }: OnboardingProviderProps) {
  const isDoneHere = useSyncExternalStore(noopSubscribe, () => isDoneOnDevice(userId), () => true);
  const [isFinished, setIsFinished] = useState(false);
  const open = pending && !isDoneHere && !isFinished;

  useEffect(() => {
    if (pending && isDoneHere) completeOnServer();
  }, [pending, isDoneHere]);

  const finish = useCallback(() => {
    setIsFinished(true);
    markDoneOnDevice(userId);
    completeOnServer();
  }, [userId]);

  const value = useMemo(() => ({ open, finish }), [open, finish]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
