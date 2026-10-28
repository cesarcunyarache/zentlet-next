"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { RefreshCw } from "lucide-react";

const PREFETCH_MARGIN = "0px 0px 800px 0px";

interface EndSentinelProps {
  isLoading: boolean;
  loadingLabel: string;
  onReached?: () => void;
}

export function EndSentinel({ isLoading, loadingLabel, onReached }: EndSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const notifyReached = useEffectEvent(() => onReached?.());

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) notifyReached();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="status"
      className="text-app-muted flex h-14 items-center justify-center gap-2 text-xs font-semibold"
    >
      {isLoading ? (
        <>
          <RefreshCw className="size-3.5 animate-spin" aria-hidden />
          {loadingLabel}
        </>
      ) : null}
    </div>
  );
}
