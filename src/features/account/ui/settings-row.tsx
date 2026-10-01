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

export function SettingsRowText({
  label,
  hint,
  labelTone = "default",
  hintTone = "default",
  hintRole,
}: SettingsRowTextProps) {
  return (
    <span>
      <span className={cn("block text-[14.5px] font-semibold", LABEL_TONE_CLASS[labelTone])}>{label}</span>
      <span role={hintRole} className={cn("mt-px block text-xs", HINT_TONE_CLASS[hintTone])}>
        {hint}
      </span>
    </span>
  );
}

export function SettingsRow({ children, ...textProps }: SettingsRowProps) {
  return (
    <div className="border-app-border flex items-center justify-between gap-3.5 border-b py-3.5">
      <SettingsRowText {...textProps} />
      {children}
    </div>
  );
}
