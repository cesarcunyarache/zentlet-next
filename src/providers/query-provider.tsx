"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";

/**
 * No reintentamos errores del cliente (4xx): un 401/403/404 no se arregla
 * repitiendo la petición. Para fallos de red o 5xx, dos reintentos.
 */
function shouldRetry(failureCount: number, error: unknown) {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * 1 min: datos que sólo cambian por acción del propio usuario. Las
         * mutaciones invalidan explícitamente, así que el staleTime sólo
         * evita refetches redundantes al navegar entre pantallas.
         */
        staleTime: 60_000,
        /** 5 min en cache tras dejar de usarse: volver atrás es instantáneo. */
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Una mutación fallida se reintenta desde la UI, no en silencio.
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState: un cliente por árbol de React, no uno compartido entre
  // peticiones del servidor.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
