"use client";

import { Mic } from "lucide-react";
import { SPRING_PRESS } from "@/lib/ease";
import { EntryFabButton } from "../entry/entry-fab-button";

const MIC_BUTTON_TRANSITION = { ...SPRING_PRESS, delay: 0.08 };

interface VoiceMicButtonProps {
  label: string;
  onPress: () => void;
}

export function VoiceMicButton({ label, onPress }: VoiceMicButtonProps) {
  return (
    <EntryFabButton label={label} transition={MIC_BUTTON_TRANSITION} onClick={onPress}>
      <Mic className="size-5" strokeWidth={2} />
    </EntryFabButton>
  );
}
