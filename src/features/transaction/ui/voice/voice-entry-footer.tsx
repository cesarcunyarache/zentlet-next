"use client";

import { Button, cn } from "@heroui/react";
import { Check, Keyboard, Pencil, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SpeechError } from "../../types";
import type { VoiceStage } from "../../lib/voice-entry";

const CHECK_ICON = <Check className="size-[17px]" strokeWidth={2.4} />;
const PENCIL_ICON = <Pencil className="size-4" strokeWidth={2.2} />;
const KEYBOARD_ICON = <Keyboard className="size-4" strokeWidth={2.2} />;
const RETRY_ICON = <RotateCcw className="size-4" strokeWidth={2.2} />;

interface VoiceEntryFooterProps {
  stage: VoiceStage;
  error: SpeechError | null;
  canSave: boolean;
  onStop: () => void;
  onEdit: () => void;
  onSave: () => void;
  onTypeInstead: () => void;
  onRetry: () => void;
}

export function VoiceEntryFooter({
  stage,
  error,
  canSave,
  onStop,
  onEdit,
  onSave,
  onTypeInstead,
  onRetry,
}: VoiceEntryFooterProps) {
  const t = useTranslations();

  if (stage === "listening") {
    return (
      <div className="flex">
        <FooterButton onPress={onStop} icon={CHECK_ICON}>
          {t("transactions.voice.done")}
        </FooterButton>
      </div>
    );
  }

  if (stage === "preview") {
    return (
      <div className="flex gap-2.5">
        <FooterButton variant="secondary" onPress={onEdit} icon={PENCIL_ICON}>
          {t("common.actions.edit")}
        </FooterButton>
        <FooterButton onPress={onSave} isDisabled={!canSave} icon={CHECK_ICON}>
          {t("common.actions.save")}
        </FooterButton>
      </div>
    );
  }

  if (stage === "error") {
    const canRetry = error !== "unsupported";
    return (
      <div className="flex gap-2.5">
        <FooterButton variant="secondary" onPress={onTypeInstead} icon={KEYBOARD_ICON}>
          {t("transactions.voice.typeIt")}
        </FooterButton>
        {canRetry ? (
          <FooterButton onPress={onRetry} icon={RETRY_ICON}>
            {t("transactions.voice.retry")}
          </FooterButton>
        ) : null}
      </div>
    );
  }

  return null;
}

interface FooterButtonProps {
  children: React.ReactNode;
  icon: React.ReactNode;
  onPress: () => void;
  isDisabled?: boolean;
  variant?: "primary" | "secondary";
}

function FooterButton({ children, icon, onPress, isDisabled = false, variant = "primary" }: FooterButtonProps) {
  return (
    <Button
      type="button"
      onPress={onPress}
      isDisabled={isDisabled}
      className={cn(
        "min-h-[54px] flex-1 rounded-2xl text-base font-semibold transition-[background-color,transform] active:scale-[0.98]",
        variant === "primary"
          ? "bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted"
          : "bg-app-fill text-app-fg hover:bg-app-fill-strong",
      )}
    >
      {icon}
      {children}
    </Button>
  );
}
