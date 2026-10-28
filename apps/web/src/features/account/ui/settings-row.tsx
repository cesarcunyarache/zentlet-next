import type { AriaRole, ReactNode } from "react";
import { cn } from "@heroui/react";

type Tone = "default" | "danger";

const LABEL_TONE_CLASS: Record<Tone, string> = {
  default: "text-app-fg",
  danger: "text-app-expense",
};

const HINT_TONE_CLASS: Record<Tone, string> = {
  default: "text-app-muted",
  danger: "text-app-expense",
};

const ROW_CLASS = "border-app-border flex w-full items-center justify-between gap-3.5 border-t py-3.5 text-left";

interface SettingsRowTextProps {
  label: ReactNode;
  hint: ReactNode;
  labelTone?: Tone;
  hintTone?: Tone;
  hintRole?: AriaRole;
}

interface SettingsRowProps extends SettingsRowTextProps {
  children: ReactNode;
}

interface SettingsButtonRowProps extends SettingsRowTextProps {
  onClick: () => void;
  disabled?: boolean;
  hasPopup?: boolean;
}

interface SettingsGroupProps {
  title?: string;
  children: ReactNode;
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <section className="mb-7 last:mb-2 [&:not(:has([data-slot=settings-row]))]:hidden">
      {title && (
        <h3 className="text-app-muted mb-1 text-[11.5px] font-semibold tracking-[0.06em] uppercase">{title}</h3>
      )}
      <div className="[&>:first-child[data-slot=settings-row]]:border-t-0 [&>:first-child_[data-slot=settings-row]]:border-t-0">
        {children}
      </div>
    </section>
  );
}

export function SettingsRowText({
  label,
  hint,
  labelTone = "default",
  hintTone = "default",
  hintRole,
}: SettingsRowTextProps) {
  return (
    <span className="min-w-0">
      <span className={cn("block text-[14.5px] font-semibold", LABEL_TONE_CLASS[labelTone])}>{label}</span>
      <span role={hintRole} className={cn("mt-px block text-xs", HINT_TONE_CLASS[hintTone])}>
        {hint}
      </span>
    </span>
  );
}

export function SettingsRow({ children, ...textProps }: SettingsRowProps) {
  return (
    <div data-slot="settings-row" className={ROW_CLASS}>
      <SettingsRowText {...textProps} />
      {children}
    </div>
  );
}

export function SettingsButtonRow({ onClick, disabled, hasPopup, ...textProps }: SettingsButtonRowProps) {
  return (
    <button
      type="button"
      data-slot="settings-row"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup={hasPopup ? "dialog" : undefined}
      className={cn(ROW_CLASS, "disabled:opacity-50")}
    >
      <SettingsRowText {...textProps} />
    </button>
  );
}
