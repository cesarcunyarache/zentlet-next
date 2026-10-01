"use client";

import { useRef } from "react";
import { ScanLine } from "lucide-react";
import { SPRING_PRESS } from "@/lib/ease";
import { EntryFabButton } from "../entry/entry-fab-button";

const BUTTON_TRANSITION = { ...SPRING_PRESS, delay: 0.12 };

interface ReceiptCameraButtonProps {
  label: string;
  onPick: (file: File | undefined) => void;
}

export function ReceiptCameraButton({ label, onPick }: ReceiptCameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <EntryFabButton label={label} transition={BUTTON_TRANSITION} onClick={() => inputRef.current?.click()}>
        <ScanLine className="size-5" strokeWidth={2} />
      </EntryFabButton>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </>
  );
}
