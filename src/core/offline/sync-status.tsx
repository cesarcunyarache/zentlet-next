"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { onlineManager, useMutationState } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, CloudOff, RefreshCw } from "lucide-react";
import { SPRING_SWAP } from "@/lib/ease";

/* Estado de conexión y de la cola de escrituras, para la UI. */

function subscribe(listener: () => void) {
  return onlineManager.subscribe(listener);
}

export function useSyncStatus() {
  const online = useSyncExternalStore(subscribe, () => onlineManager.isOnline(), () => true);
  const pending = useMutationState({
    filters: { status: "pending" },
    select: (mutation) => mutation.state.isPaused,
  });

  return {
    online,
    /** Escrituras aún no confirmadas por el servidor. */
    pendingCount: pending.length,
  };
}

type Tone = "offline" | "syncing" | "synced";

const LABEL: Record<Tone, (count: number) => string> = {
  offline: (count) =>
    count ? `Sin conexión · ${count} pendiente${count === 1 ? "" : "s"}` : "Sin conexión",
  syncing: (count) => `Sincronizando ${count}…`,
  synced: () => "Sincronizado",
};

/**
 * Píldora discreta: sólo aparece sin conexión, mientras se envía la cola y
 * un instante después ("Sincronizado"). Con todo al día no ocupa sitio.
 */
export function SyncStatusPill() {
  const { online, pendingCount } = useSyncStatus();
  const [justSynced, setJustSynced] = useState(false);
  const previous = useRef(pendingCount);

  useEffect(() => {
    if (online && previous.current > 0 && pendingCount === 0) {
      setJustSynced(true);
      const timer = setTimeout(() => setJustSynced(false), 1800);
      previous.current = pendingCount;
      return () => clearTimeout(timer);
    }
    previous.current = pendingCount;
  }, [online, pendingCount]);

  const tone: Tone | null = !online ? "offline" : pendingCount > 0 ? "syncing" : justSynced ? "synced" : null;

  return (
    <div role="status" aria-live="polite" className="min-h-8">
      <AnimatePresence mode="wait">
        {tone && (
          <motion.span
            key={tone}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={SPRING_SWAP}
            className={
              tone === "offline"
                ? "bg-app-fg text-app-bg inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
                : tone === "syncing"
                  ? "bg-app-fill text-app-fg inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
                  : "bg-app-income-soft text-app-income inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
            }
          >
            {tone === "offline" && <CloudOff className="size-3.5" aria-hidden />}
            {tone === "syncing" && <RefreshCw className="size-3.5 animate-spin" aria-hidden />}
            {tone === "synced" && <Check className="size-3.5" aria-hidden />}
            {LABEL[tone](pendingCount)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
