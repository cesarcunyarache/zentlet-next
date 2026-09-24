"use client";

import { useEffect, useState } from "react";
import { CloudOff, Download, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { PillSelect } from "@/core/components/ui/pill-select";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { useSyncStatus } from "@/core/offline/sync-status";
import { useThemePreference } from "@/core/theme/use-theme";
import type { ThemePreference } from "@/core/theme/theme";
import { accountService } from "@/features/account/services/account.service";
import { authClient } from "@/lib/auth-client";
import { resetUser, track } from "@/lib/observability/client";
import { SPRING_LAYOUT } from "@/lib/ease";
import { siteConfig } from "@/lib/site";
import { getPathname, usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";
import { toISODate } from "../lib/format";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

/** Valor guardado (símbolo) → key de su etiqueta en `settings.currency.options`. */
const CURRENCIES = [
  { value: "S/", key: "sol" },
  { value: "$", key: "dollar" },
  { value: "€", key: "euro" },
  { value: "$COP", key: "peso" },
] as const;

const LANGUAGES = routing.locales.map((locale) => ({ value: locale, label: localeNames[locale] }));

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  transactionCount: number;
  onCurrencyChange: (currency: string) => void;
}

export function SettingsSheet({
  isOpen,
  onOpenChange,
  currency,
  transactionCount,
  onCurrencyChange,
}: SettingsSheetProps) {
  const t = useTranslations("settings");

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={t("title")}>
      <ConnectionRow />

      <div className="border-app-border flex items-center justify-between gap-3.5 border-b py-3.5">
        <span>
          <span className="text-app-fg block text-[14.5px] font-semibold">
            {t("currency.label")}
          </span>
          <span className="text-app-muted mt-px block text-xs">
            {t("currency.hint")}
          </span>
        </span>
        <PillSelect
          label={t("currency.label")}
          value={currency}
          options={CURRENCIES.map(({ value, key }) => ({ value, label: t(`currency.options.${key}`) }))}
          onChange={onCurrencyChange}
          display={currency}
          className="bg-app-fill"
        />
      </div>

      <LanguageRow />

      <AppearanceRow />

      <DataRow transactionCount={transactionCount} currency={currency} />

      <SignOutRow />
    </Sheet>
  );
}

/** Cambia la URL al mismo sitio en otro idioma (`/admin` ↔ `/en/admin`). */
function LanguageRow() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="border-app-border flex items-center justify-between gap-3.5 border-b py-3.5">
      <span>
        <span className="text-app-fg block text-[14.5px] font-semibold">
          {t("common.language")}
        </span>
        <span className="text-app-muted mt-px block text-xs">
          {t("settings.language.hint")}
        </span>
      </span>
      <PillSelect
        label={t("common.language")}
        value={locale}
        options={LANGUAGES}
        onChange={(next: Locale) => router.replace(pathname, { locale: next })}
        className="bg-app-fill"
      />
    </div>
  );
}

function AppearanceRow() {
  const t = useTranslations("settings.appearance");
  const { preference, setPreference } = useThemePreference();

  return (
    <div className="border-app-border flex items-center justify-between gap-3.5 border-b py-3.5">
      <span>
        <span className="text-app-fg block text-[14.5px] font-semibold">
          {t("label")}
        </span>
        <span className="text-app-muted mt-px block text-xs">
          {t(preference === "system" ? "followsDevice" : "thisDeviceOnly")}
        </span>
      </span>
      <div
        role="group"
        aria-label={t("label")}
        className="bg-app-fill inline-flex shrink-0 items-center gap-0.5 rounded-full p-[3px]"
      >
        {THEMES.map((value) => {
          const active = preference === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setPreference(value)}
              className={cn(
                "relative min-h-[30px] rounded-full px-3 text-[13px] font-semibold transition-colors",
                active ? "text-app-fg" : "text-app-muted hover:text-app-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId="settings-theme-pill"
                  transition={SPRING_LAYOUT}
                  className="bg-app-surface absolute inset-0 rounded-full shadow-[0_1px_3px_color-mix(in_oklch,var(--app-ink)_14%,transparent)]"
                />
              )}
              <span className="relative">{t(`themes.${value}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Descarga un archivo generado en memoria con el diálogo nativo del navegador. */
function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Safari necesita que la URL siga viva un momento tras el clic
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exporta movimientos y categorías a Excel. Se genera en el servidor a
 * partir de la base de datos, así que requiere conexión y siempre incluye
 * todo el historial (no sólo lo que está en el dispositivo).
 */
function DataRow({ transactionCount, currency }: { transactionCount: number; currency: string }) {
  const t = useTranslations("settings.data");
  const locale = useLocale();
  const { online } = useSyncStatus();
  const [status, setStatus] = useState<"idle" | "exporting" | "failed">("idle");

  async function exportData() {
    setStatus("exporting");
    try {
      const file = await accountService.exportData({ locale, currency });
      saveFile(file, `zentlet-${toISODate(new Date())}.xlsx`);
      track("data_exported", {});
      setStatus("idle");
    } catch {
      setStatus("failed");
    }
  }

  const hint = !online
    ? t("exportOffline")
    : status === "failed"
      ? t("exportFailed")
      : t("count", { count: transactionCount });

  return (
    <div className="border-app-border flex items-center justify-between gap-3.5 border-b py-3.5">
      <span>
        <span className="text-app-fg block text-[14.5px] font-semibold">{t("label")}</span>
        <span
          role={status === "failed" ? "alert" : undefined}
          className={cn("mt-px block text-xs", status === "failed" ? "text-app-expense" : "text-app-muted")}
        >
          {hint}
        </span>
      </span>
      <button
        type="button"
        onClick={exportData}
        disabled={!online || status === "exporting"}
        className="bg-app-fill hover:bg-app-fill-strong text-app-fg inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors disabled:opacity-50"
      >
        <Download className="size-3.5" strokeWidth={2.2} aria-hidden />
        {t(status === "exporting" ? "exporting" : "export")}
      </button>
    </div>
  );
}

/**
 * Estado de la conexión. Sin internet se sigue pudiendo trabajar: los
 * cambios quedan en el dispositivo y se envían al volver la conexión.
 */
function ConnectionRow() {
  const t = useTranslations("settings.connection");
  const { online, pendingCount, syncingCount } = useSyncStatus();

  const hint = online
    ? syncingCount > 0
      ? t("syncing", { count: syncingCount })
      : t("synced")
    : pendingCount > 0
      ? t("pending", { count: pendingCount })
      : t("noPending");

  return (
    <div role="status" aria-live="polite" className="border-app-border border-b py-3.5">
      <div className="flex items-center justify-between gap-3.5">
        <span>
          <span className="text-app-fg block text-[14.5px] font-semibold">
            {t("label")}
          </span>
          <span className="text-app-muted mt-px block text-xs">
            {hint}
          </span>
        </span>
        <span
          className={cn(
            "inline-flex min-h-[28px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
            online ? "bg-app-income-soft text-app-income" : "bg-app-expense-soft text-app-expense",
          )}
        >
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", online ? "bg-app-income" : "bg-app-expense")}
          />
          {t(online ? "online" : "offline")}
        </span>
      </div>

      {!online && (
        <p className="bg-app-fill text-app-fg mt-3 flex gap-2.5 rounded-2xl p-3 text-xs leading-relaxed">
          <CloudOff className="text-app-expense mt-px size-4 shrink-0" aria-hidden />
          <span>
            <span className="block font-semibold">{t("offlineTitle")}</span>
            <span className="text-app-muted">{t("offlineBody")}</span>
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * Cerrar sesión borra también la cache local del usuario (IndexedDB y las
 * páginas guardadas): en un dispositivo compartido no deben quedar sus
 * datos. Si hay cambios sin sincronizar se perderían, así que se pide un
 * segundo toque; sin conexión no se puede cerrar la sesión en el servidor.
 */
function SignOutRow() {
  const t = useTranslations("settings.signOut");
  const locale = useLocale();
  const { clearLocalData } = useOfflineSession();
  const { online, pendingCount } = useSyncStatus();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // la confirmación caduca sola, como la de eliminar un movimiento
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function signOut() {
    if (pendingCount > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setSigningOut(false);
      return;
    }
    resetUser();
    await clearLocalData();
    window.location.replace(getPathname({ href: siteConfig.routes.signIn, locale }));
  }

  const hint = !online
    ? t("offline")
    : confirming
      ? t("confirm", { count: pendingCount })
      : t("hint");

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={!online || signingOut}
      className="flex w-full items-center justify-between gap-3.5 py-3.5 text-left disabled:opacity-50"
    >
      <span>
        <span
          className={cn(
            "block text-[14.5px] font-semibold",
            confirming ? "text-app-expense" : "text-app-fg",
          )}
        >
          {t(signingOut ? "pending" : "label")}
        </span>
        <span className="text-app-muted mt-px block text-xs">{hint}</span>
      </span>
      <LogOut className="text-app-muted size-4 shrink-0" aria-hidden />
    </button>
  );
}
