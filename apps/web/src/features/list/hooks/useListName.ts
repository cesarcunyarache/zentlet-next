import { useTranslations } from "next-intl";
import type { TList } from "../types";

export function useListName() {
  const t = useTranslations("lists");
  return (list: Pick<TList, "name" | "isPrivate">) => (list.isPrivate ? t("private") : list.name);
}
