"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import type { PreferenceExtras } from "../schemas/preference.schema";
import { changeExtras, getDeviceExtras, subscribeDeviceExtras } from "../lib/device-extras";

const EMPTY: PreferenceExtras = {};
const getServerSnapshot = () => EMPTY;

export function useDisplayPreferences() {
  const { userId } = useOfflineSession();
  const getSnapshot = useCallback(() => getDeviceExtras(userId), [userId]);
  const extras = useSyncExternalStore(subscribeDeviceExtras, getSnapshot, getServerSnapshot);

  const setHideBalance = useCallback((hideBalance: boolean) => changeExtras(userId, { hideBalance }), [userId]);
  const setFeedPeriod = useCallback(
    (feedPeriod: NonNullable<PreferenceExtras["feedPeriod"]>) => changeExtras(userId, { feedPeriod }),
    [userId],
  );

  return {
    hideBalance: extras.hideBalance ?? false,
    feedPeriod: extras.feedPeriod ?? null,
    setHideBalance,
    setFeedPeriod,
  };
}
