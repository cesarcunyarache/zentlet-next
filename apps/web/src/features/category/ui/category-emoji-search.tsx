"use client";

import type { CSSProperties } from "react";
import EmojiPicker from "emoji-picker-react";
import spanishEmojis from "emoji-picker-react/data/emojis-es";
import { useLocale, useTranslations } from "next-intl";
import { resolveTheme } from "@/core/theme/use-theme";

const PICKER_THEME = {
  "--epr-bg-color": "transparent",
  "--epr-category-label-bg-color": "var(--app-bg)",
  "--epr-picker-border-color": "transparent",
  "--epr-text-color": "var(--app-muted)",
  "--epr-highlight-color": "var(--app-fg)",
  "--epr-hover-bg-color": "var(--app-fill)",
  "--epr-focus-bg-color": "var(--app-fill-strong)",
  "--epr-search-input-bg-color": "var(--app-fill)",
  "--epr-search-input-bg-color-active": "var(--app-fill)",
  "--epr-search-border-color": "transparent",
  "--epr-search-input-text-color": "var(--app-fg)",
  "--epr-search-input-placeholder-color": "var(--app-muted)",
  "--epr-category-label-text-color": "var(--app-muted)",
  "--epr-emoji-size": "28px",
} as CSSProperties;

interface CategoryEmojiSearchProps {
  onSelect: (emoji: string) => void;
}

export default function CategoryEmojiSearch({ onSelect }: CategoryEmojiSearchProps) {
  const t = useTranslations("categories.form.customize");
  const locale = useLocale();

  return (
    <EmojiPicker
      width="100%"
      height="100%"
      style={PICKER_THEME}
      colorScheme={resolveTheme()}
      emojiData={locale === "es" ? spanishEmojis : undefined}
      autoFocusSearch={false}
      skinTonesDisabled
      previewConfig={{ showPreview: false }}
      labels={{
        searchPlaceholder: t("searchPlaceholder"),
        searchLabel: t("searchLabel"),
        searchClear: t("searchClear"),
        searchResultsNone: t("searchResultsNone"),
        categoryNavigation: t("categoryNavigation"),
        loading: t("loading"),
        loadingError: t("loadingError"),
        retryLoading: t("retryLoading"),
      }}
      onEmojiClick={(emoji) => onSelect(emoji.emoji)}
    />
  );
}
