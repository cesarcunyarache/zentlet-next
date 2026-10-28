import { useState } from "react";
import { DEFAULT_LIST_ICON, type ListIcon } from "../lib/presets";
import type { TList } from "../types";

const MIN_NAME_LENGTH = 1;

export function useListForm(list: TList | null) {
  const [name, setName] = useState(list?.name ?? "");
  const [icon, setIcon] = useState<ListIcon>(list ? { icon: list.icon, color: list.color } : DEFAULT_LIST_ICON);
  const trimmed = name.trim();

  return {
    name,
    icon,
    setName,
    setIcon,
    isValid: trimmed.length >= MIN_NAME_LENGTH,
    payload: { name: trimmed, icon: icon.icon, color: icon.color },
  };
}
