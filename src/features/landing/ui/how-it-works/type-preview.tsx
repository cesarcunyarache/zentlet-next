import { Check } from "lucide-react";
import { TypingAnimation } from "@/core/components/ui/typing-animation";
import { cn } from "@/lib/utils";
import { DemoTypingField } from "../shared/demo-typing-field";
import { TYPED_TEXT_CLASS } from "../shared/tokens";
import { PREVIEW_FRAME_CLASS } from "./preview-frame";

const TYPE_SPEED_MS = 70;
const PAUSE_MS = 1400;

interface TypePreviewProps {
  phrases: string[];
  savedLabel: string;
}

export function TypePreview({ phrases, savedLabel }: TypePreviewProps) {
  return (
    <div aria-hidden className={cn(PREVIEW_FRAME_CLASS, "bg-app-surface ring-1 ring-[var(--app-border)]")}>
      <DemoTypingField staticText={phrases[0]}>
        <TypingAnimation
          words={phrases}
          loop
          typeSpeed={TYPE_SPEED_MS}
          pauseDelay={PAUSE_MS}
          startOnView={false}
          className={TYPED_TEXT_CLASS}
        />
      </DemoTypingField>
      <div className="mt-6 flex items-center gap-3">
        <span className="bg-app-income-soft text-app-income grid size-9 place-items-center rounded-full">
          <Check className="size-4" />
        </span>
        <span className="text-app-fg text-sm font-semibold">{savedLabel}</span>
      </div>
    </div>
  );
}
