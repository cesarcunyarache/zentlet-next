"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { onlineManager, useMutationState } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, CloudOff, RefreshCw } from "lucide-react";
import { SPRING_SWAP } from "@/lib/ease";
import { offlineSyncState } from "./offline-queue";

/* Estado de conexión y de la cola de escrituras, para la UI. */

function subscribe(listener: () => void) {
  return onlineManager.subscribe(listener);
}

export function useIsOnline() {
  return useSyncExternalStore(subscribe, () => onlineManager.isOnline(), () => true);
}

export function useSyncStatus() {
  const online = useIsOnline();
  const pending = useMutationState({
    filters: { status: "pending" },
    select: offlineSyncState,
  });

  return {
    online,
    /** Escrituras aún no confirmadas por el servidor. */
    pendingCount: pending.length,
    /** Las hechas sin conexión que se están enviando al volver la red. */
    syncingCount: pending.filter((state) => state === "syncing").length,
  };
}

type Tone = "offline" | "syncing" | "synced";

/** Cuánto se ve "Sincronizado" tras vaciarse la cola. */
const SYNCED_VISIBLE_MS = 1800;

const LABEL: Record<Tone, (count: number) => string> = {
  offline: (count) =>
    count ? `Sin conexión · ${count} pendiente${count === 1 ? "" : "s"}` : "Sin conexión",
  syncing: (count) => `Sincronizando ${count}…`,
  synced: () => "Sincronizado",
};

const TONE_CLASS: Record<Tone, string> = {
  offline: "bg-app-fg text-app-bg",
  syncing: "bg-app-fill text-app-fg",
  synced: "bg-app-income-soft text-app-income",
};

/**
 * Píldora discreta: sólo aparece sin conexión, mientras se envía lo que se
 * hizo sin red y un instante después ("Sincronizado"). Un guardado normal
 * con conexión no la muestra.
 */
export function SyncStatusPill() {
  const { online, pendingCount, syncingCount } = useSyncStatus();
  const [justSynced, setJustSynced] = useState(false);
  const previous = useRef(syncingCount);

  useEffect(() => {
    const wasSyncing = previous.current > 0;
    previous.current = syncingCount;
    if (!online || !wasSyncing || syncingCount > 0) return;

    setJustSynced(true);
    const timer = setTimeout(() => setJustSynced(false), SYNCED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [online, syncingCount]);

  const tone: Tone | null = !online ? "offline" : syncingCount > 0 ? "syncing" : justSynced ? "synced" : null;

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
            className={`${TONE_CLASS[tone]} inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold`}
          >
            {tone === "offline" && <CloudOff className="size-3.5" aria-hidden />}
            {tone === "syncing" && <RefreshCw className="size-3.5 animate-spin" aria-hidden />}
            {tone === "synced" && <Check className="size-3.5" aria-hidden />}
            {LABEL[tone](tone === "syncing" ? syncingCount : pendingCount)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
