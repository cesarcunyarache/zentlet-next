import { useTranslations } from "next-intl";

const EXAMPLE_KEYS = ["lunch", "gas", "salary", "mouse"] as const;

export function useVoiceExamples() {
  const t = useTranslations("transactions.voice");
  return EXAMPLE_KEYS.map((key) => t(`examples.${key}`));
}
