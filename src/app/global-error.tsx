"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client";

/**
 * Último recurso ante un error de render que nada más capturó. Muestra lo
 * mismo que la pantalla por defecto de Next y, además, lo reporta.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => reportClientError(error), [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 400 }}>
          Application error: a client-side exception has occurred (see the browser console for more
          information).
        </h2>
      </body>
    </html>
  );
}
