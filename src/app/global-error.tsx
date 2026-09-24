"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client";

/*
 * Último recurso: falló el propio layout, así que no hay traducciones ni
 * estilos de la app. Idioma según la URL (`/en/…`) y estilos en línea.
 */
const COPY = {
  es: { title: "Algo salió mal", body: "Tuvimos un problema al cargar Zentlet. Tus datos están a salvo.", retry: "Reintentar" },
  en: { title: "Something went wrong", body: "We had a problem loading Zentlet. Your data is safe.", retry: "Try again" },
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error), [error]);

  const locale = typeof window !== "undefined" && window.location.pathname.startsWith("/en") ? "en" : "es";
  const copy = COPY[locale];

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f6f6f4",
          color: "#1c1c1a",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: 26 }}>{copy.title}</h1>
        <p style={{ margin: 0, maxWidth: 360, color: "#6b6b66", lineHeight: 1.5 }}>{copy.body}</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 28, padding: "12px 20px", borderRadius: 12, border: 0, background: "#1c1c1a", color: "#fff", fontWeight: 600, fontSize: 14 }}
        >
          {copy.retry}
        </button>
      </body>
    </html>
  );
}
