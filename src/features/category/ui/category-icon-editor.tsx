"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button, ColorSlider, Label, parseColor } from "@heroui/react";
import { Check } from "@gravity-ui/icons";
import { useTranslations } from "next-intl";
import type { CategoryIcon } from "../ai/schemas/category-ai.schema";
import { CATEGORY_FALLBACK_ICON } from "../constants";

export const loadEmojiSearch = () => import("./category-emoji-search");

function EmojiSearchUnavailable() {
  const t = useTranslations("categories.form.customize");
  return <p className="text-app-muted py-10 text-center text-sm">{t("loadingError")}</p>;
}

const CategoryEmojiSearch = dynamic(
  () => loadEmojiSearch().catch(() => ({ default: EmojiSearchUnavailable })),
  {
    ssr: false,
    loading: () => <div className="bg-app-fill h-full w-full animate-pulse rounded-2xl" />,
  },
);

const DEFAULT_COLOR = "#E9E4F5";
const COLOR_CHANNELS = ["hue", "saturation", "lightness"] as const;

function toEditableColor(value: string) {
  try {
    return parseColor(value).toFormat("hsl");
  } catch {
    return parseColor(DEFAULT_COLOR).toFormat("hsl");
  }
}

interface CategoryIconEditorProps {
  value: CategoryIcon;
  onDone: (icon: CategoryIcon) => void;
}

export function CategoryIconEditor({ value, onDone }: CategoryIconEditorProps) {
  const t = useTranslations("categories.form.customize");
  const [icon, setIcon] = useState(value.icon || CATEGORY_FALLBACK_ICON);
  const [color, setColor] = useState(() => toEditableColor(value.color));
  const hex = color.toString("hex");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid size-20 shrink-0 place-items-center rounded-2xl text-4xl"
          style={{ background: hex }}
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {COLOR_CHANNELS.map((channel) => (
            <ColorSlider
              key={channel}
              channel={channel}
              colorSpace="hsl"
              value={color}
              onChange={setColor}
              className="gap-1"
            >
              <Label className="text-app-muted text-xs">{t(channel)}</Label>
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          ))}
        </div>
      </div>

      <div className="relative min-h-[300px] flex-1">
        <div className="absolute inset-0">
          <CategoryEmojiSearch onSelect={setIcon} />
        </div>
      </div>

      <Button className="w-full shrink-0" onPress={() => onDone({ icon, color: hex })}>
        <Check />
        {t("done")}
      </Button>
    </div>
  );
}
