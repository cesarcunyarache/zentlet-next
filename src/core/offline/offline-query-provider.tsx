"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { defaultShouldDehydrateQuery, onlineManager, QueryClient, type Query } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  type PersistedClient,
} from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { useLocale } from "next-intl";
import { shouldRetry } from "@/providers/query-provider";
import { registerCategoryMutations } from "@/features/category/stores/category.store";
import { registerTransactionMutations } from "@/features/transaction/stores/transaction.store";
import { siteConfig } from "@/lib/site";
import { getPathname } from "@/i18n/navigation";
import { clearCachedPages, clearOtherUsersData, elapsedSincePageFirstSeen, storageKey } from "./local-data";
import { trackOfflineQueue } from "./offline-queue";

/*
 * Server state de la app privada, persistido en IndexedDB:
 * - al abrir, la pantalla se pinta con lo guardado (sin esperar a la red)
 *   y se revalida por detrás;
 * - las escrituras hechas sin conexión quedan en cola en el dispositivo y
 *   se envían al volver la red, aunque la app se haya cerrado entretanto.
 *
 * Una cache por usuario (la clave lleva su id): otra cuenta en el mismo
 * dispositivo nunca ve ni reanuda los datos de la anterior, y al entrar
 * borra los que quedaran de otras cuentas.
 *
 * Sin conexión, el service worker sirve la página guardada, que lleva
 * cuánto le quedaba a la sesión al generarse: pasado ese tiempo no se
 * muestran datos. En un dispositivo compartido, el acceso sin red dura lo
 * mismo que la sesión, no más.
 */

/** Cuánto vale lo guardado sin volver a abrir la app. */
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Cambiar al modificar la forma de los datos cacheados: invalida lo guardado. */
const CACHE_VERSION = "2026-09-v1";

const idbStorage = {
  getItem: (key: string) => get<string>(key),
  setItem: (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
};

/**
 * Con la sesión vencida ni se lee (no se ven los datos) ni se escribe (una
 * cache vacía pisaría la cola pendiente, que se reanuda si el mismo
 * usuario vuelve a entrar).
 */
const lockedStorage = {
  getItem: async () => undefined,
  setItem: async () => {},
  removeItem: async () => {},
};

/** La sesión con la que se generó la página ya habría caducado. */
const isExpired = ({ renderedAt, sessionRemainingMs }: PageSession) =>
  elapsedSincePageFirstSeen(renderedAt) >= sessionRemainingMs;

export interface PageSession {
  /** Momento (reloj del servidor) en que se generó la página: la identifica. */
  renderedAt: number;
  /** Lo que le quedaba a la sesión en ese momento. */
  sessionRemainingMs: number;
}

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

/** Cada búsqueda es una consulta distinta: guardarlas todas llenaría el dispositivo. */
function shouldDehydrateQuery(query: Query) {
  const filters = query.queryKey[1] === "list" ? (query.queryKey[2] as { q?: string } | undefined) : undefined;
  return defaultShouldDehydrateQuery(query) && !filters?.q;
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

interface OfflineQueryProviderProps {
  userId: string;
  pageSession: PageSession;
  children: React.ReactNode;
}

export function OfflineQueryProvider({ userId, pageSession, children }: OfflineQueryProviderProps) {
  const locale = useLocale();
  const [queryClient] = useState(createOfflineQueryClient);
  // se decide antes de restaurar la cache: con la sesión vencida no se lee nada
  const [expiredOnOpen] = useState(() => typeof window !== "undefined" && isExpired(pageSession));
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window === "undefined" ? undefined : expiredOnOpen ? lockedStorage : idbStorage,
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
      await clearCachedPages();
    },
  }));

  /*
   * Sesión vencida (página guardada abierta más tarde, o la app abierta
   * durante días): fuera las páginas guardadas y al login, que pasa por el
   * servidor. Con la sesión vigente, se borran los datos de otras cuentas.
   */
  useEffect(() => {
    const signIn = getPathname({ href: siteConfig.routes.signIn, locale });
    const leaveIfExpired = () => {
      if (!isExpired(pageSession)) return false;
      queryClient.clear();
      void clearCachedPages()
        .catch(() => {})
        .finally(() => window.location.replace(signIn));
      return true;
    };

    if (!leaveIfExpired()) void clearOtherUsersData(userId).catch(() => {});

    const onVisible = () => document.visibilityState === "visible" && leaveIfExpired();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [locale, queryClient, pageSession, userId]);

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
          shouldDehydrateQuery,
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
