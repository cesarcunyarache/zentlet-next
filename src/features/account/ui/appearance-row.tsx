"use client";

import { motion } from "motion/react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useThemePreference } from "@/core/theme/use-theme";
import type { ThemePreference } from "@/core/theme/theme";
import { SPRING_LAYOUT } from "@/lib/ease";
import { SettingsRow } from "./settings-row";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

interface ThemeOptionProps {
  label: string;
  isActive: boolean;
  onSelect: () => void;
}

export function AppearanceRow() {
  const t = useTranslations("settings.appearance");
  const { preference, setPreference } = useThemePreference();

  return (
    <SettingsRow label={t("label")} hint={t(preference === "system" ? "followsDevice" : "thisDeviceOnly")}>
      <div
        role="group"
        aria-label={t("label")}
        className="bg-app-fill inline-flex shrink-0 items-center gap-0.5 rounded-full p-[3px]"
      >
        {THEMES.map((theme) => (
          <ThemeOption
            key={theme}
            label={t(`themes.${theme}`)}
            isActive={preference === theme}
            onSelect={() => setPreference(theme)}
          />
        ))}
      </div>
    </SettingsRow>
  );
}

function ThemeOption({ label, isActive, onSelect }: ThemeOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onSelect}
      className={cn(
        "relative min-h-[30px] rounded-full px-3 text-[13px] font-semibold transition-colors",
        isActive ? "text-app-fg" : "text-app-muted hover:text-app-fg",
      )}
    >
      {isActive && (
        <motion.span
          layoutId="settings-theme-pill"
          transition={SPRING_LAYOUT}
          className="bg-app-surface absolute inset-0 rounded-full shadow-[0_1px_3px_color-mix(in_oklch,var(--app-ink)_14%,transparent)]"
        />
      )}
      <span className="relative">{label}</span>
    </button>
  );
}
