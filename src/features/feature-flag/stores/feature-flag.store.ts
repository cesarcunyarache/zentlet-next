"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { recordFlag } from "@/lib/observability/client";
import { featureFlagService } from "../services/feature-flag.service";

export const featureFlagKeys = {
  all: ["feature-flags"] as const,
};

const FLAGS_STALE_MS = 60_000;

export function useFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.all,
    queryFn: () => featureFlagService.getFlags(),
    staleTime: FLAGS_STALE_MS,
    refetchOnWindowFocus: "always",
  });
}

export function useFeatureFlag(slug: string) {
  const { data } = useFeatureFlags();
  const isOn = data?.enabled.includes(slug) ?? false;

  useEffect(() => {
    if (data) recordFlag(slug, isOn);
  }, [data, slug, isOn]);

  return isOn;
}
