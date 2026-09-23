"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  type PersistedClient,
} from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { shouldRetry } from "@/providers/query-provider";
import { registerCategoryMutations } from "@/features/category/stores/category.store";
import { registerTransactionMutations } from "@/features/transaction/stores/transaction.store";
import { trackOfflineQueue } from "./offline-queue";

/*
 * Server state de la app privada, persistido en IndexedDB:
 * - al abrir, la pantalla se pinta con lo guardado (sin esperar a la red)
 *   y se revalida por detrás;
 * - las escrituras hechas sin conexión quedan en cola en el dispositivo y
 *   se envían al volver la red, aunque la app se haya cerrado entretanto.
 *
 * Una cache por usuario (la clave lleva su id): otra cuenta en el mismo
 * dispositivo nunca ve ni reanuda los datos de la anterior.
 */

/** Cuánto vale lo guardado sin volver a abrir la app. */
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Cambiar al modificar la forma de los datos cacheados: invalida lo guardado. */
const CACHE_VERSION = "2026-09-v1";

const PAGE_CACHE_PREFIX = "zentlet-pages";

function storageKey(userId: string) {
  return `zentlet-cache:${userId}`;
}

const idbStorage = {
  getItem: (key: string) => get<string>(key),
  setItem: (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
};

/**
 * Por defecto sólo se guardan las mutaciones ya en pausa, y sólo esas se
 * reanudan. Una alta que estaba en vuelo al cerrar la app se perdería: se
 * guardan todas las pendientes marcadas como pausadas. Si en realidad sí
 * llegó al servidor, el reenvío es inocuo (POST idempotente por id).
 */
function serialize(client: PersistedClient) {
  const mutations = client.clientState.mutations.map((mutation) =>
    mutation.state.status === "pending"
      ? { ...mutation, state: { ...mutation.state, isPaused: true } }
      : mutation,
  );
  return JSON.stringify({ ...client, clientState: { ...client.clientState, mutations } });
}

function createOfflineQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // igual o mayor que MAX_AGE, o lo restaurado se descartaría enseguida
        gcTime: MAX_AGE,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
  // antes de restaurar: las mutaciones guardadas necesitan su mutationFn
  registerTransactionMutations(client);
  registerCategoryMutations(client);
  trackOfflineQueue(client);
  return client;
}

interface OfflineSession {
  userId: string;
  /** Borra la cache del usuario y las páginas guardadas por el service worker. */
  clearLocalData: () => Promise<void>;
}

const OfflineSessionContext = createContext<OfflineSession | null>(null);

export function useOfflineSession() {
  const value = useContext(OfflineSessionContext);
  if (!value) throw new Error("useOfflineSession debe usarse dentro de <OfflineQueryProvider>");
  return value;
}

export function OfflineQueryProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [queryClient] = useState(createOfflineQueryClient);
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window === "undefined" ? undefined : idbStorage,
      key: storageKey(userId),
      throttleTime: 500,
      serialize,
    }),
  );

  const [session] = useState<OfflineSession>(() => ({
    userId,
    clearLocalData: async () => {
      queryClient.clear();
      await persister.removeClient();
      await del(storageKey(userId));
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith(PAGE_CACHE_PREFIX)).map((name) => caches.delete(name)));
      }
    },
  }));

  /*
   * `onlineManager` arranca asumiendo conexión y sólo escucha los eventos
   * online/offline. Si la app se abre ya sin red (página servida por el
   * service worker) nunca llega un "offline" y las escrituras se
   * intentarían en bucle en vez de quedar en cola.
   */
  useEffect(() => {
    onlineManager.setOnline(navigator.onLine);
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: MAX_AGE,
        buster: CACHE_VERSION,
        dehydrateOptions: {
          shouldDehydrateMutation: (mutation) => mutation.state.status === "pending",
        },
      }}
      // restaurado: se envía la cola y después se revalida contra el servidor
      onSuccess={() => queryClient.resumePausedMutations().then(() => queryClient.invalidateQueries())}
    >
      <OfflineSessionContext.Provider value={session}>{children}</OfflineSessionContext.Provider>
    </PersistQueryClientProvider>
  );
}
