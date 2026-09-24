"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import type { CheckResult, CheckStatus } from "@/lib/health/checks";

/*
 * Panel interno de estado: verde funciona, rojo falla, gris sin configurar.
 * Los textos no se traducen: es una herramienta de desarrollo.
 */

interface HealthReport {
  status: "ok" | "degraded" | "down";
  checkedAt: string;
  checks: CheckResult[];
}

const DOT: Record<CheckStatus, string> = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  off: "bg-zinc-400",
};

const SUMMARY: Record<HealthReport["status"], { label: string; className: string }> = {
  ok: { label: "Todo funciona", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  degraded: { label: "Hay servicios con fallos", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  down: { label: "La base de datos no responde", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
};

async function fetchReport(): Promise<HealthReport> {
  const response = await fetch("/api/health", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  // 503 también trae el informe: sólo es error si no hay `checks`
  if (!("checks" in body)) throw new Error(body.message ?? `No se pudo cargar el estado (HTTP ${response.status})`);
  return body;
}

export default function HealthPage() {
  const { data: report, error, isFetching: loading, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: fetchReport,
    // siempre en vivo: sin reintentos ni caché que dure más que la página
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const summary = report && SUMMARY[report.status];

  return (
    <div className="bg-app-bg text-app-fg min-h-dvh">
      <main className="mx-auto flex max-w-md flex-col px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-12">
        <div className="flex items-center justify-between">
          <Link
            href={siteConfig.routes.home}
            aria-label="Volver"
            className="bg-app-fill hover:bg-app-fill-strong grid size-10 place-items-center rounded-full transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            aria-label="Volver a comprobar"
            className="bg-app-fill hover:bg-app-fill-strong grid size-10 place-items-center rounded-full transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`size-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <h1 className="font-display mt-6 mb-4 text-[28px] leading-tight font-bold tracking-[-0.03em]">
          Estado de servicios
        </h1>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-400">
            {error.message}
          </p>
        )}

        {summary && (
          <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${summary.className}`}>{summary.label}</p>
        )}

        <ul className="border-app-border bg-app-surface mt-4 divide-y divide-(--color-app-border) overflow-hidden rounded-2xl border">
          {report
            ? report.checks.map((check) => (
                <li key={check.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span aria-hidden className={`size-3 shrink-0 rounded-full ${DOT[check.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[15px] font-semibold">{check.name}</p>
                    <p className="text-app-muted m-0 truncate text-[13px]">{check.detail}</p>
                  </div>
                  {check.latencyMs !== undefined && (
                    <span className="text-app-muted shrink-0 text-xs tabular-nums">{check.latencyMs} ms</span>
                  )}
                </li>
              ))
            : loading && <li className="text-app-muted px-4 py-3.5 text-sm">Comprobando…</li>}
        </ul>

        {report && (
          <p className="text-app-muted mt-3 text-xs">
            Última comprobación: {new Date(report.checkedAt).toLocaleTimeString()}
          </p>
        )}
      </main>
    </div>
  );
}
