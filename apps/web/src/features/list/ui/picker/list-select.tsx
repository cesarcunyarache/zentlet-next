"use client";

import { useTranslations } from "next-intl";
import { PillSelect } from "@/core/components/ui/pill-select";
import { useListName } from "../../hooks/useListName";
import { useLists } from "../../stores/list.store";

interface ListSelectProps {
  value: string | null;
  onChange: (listId: string) => void;
  isPending?: boolean;
  className?: string;
}

export function ListSelect({ value, onChange, isPending = false, className }: ListSelectProps) {
  const t = useTranslations("lists");
  const { lists } = useLists();
  const listName = useListName();
  const writable = lists.filter((list) => list.role !== "viewer");
  const current = lists.find((list) => list.id === value) ?? writable.find((list) => list.isPrivate);
  if (!current) return null;

  return (
    <PillSelect
      label={t("picker.label")}
      value={current.id}
      options={writable.map((list) => ({ value: list.id, label: listName(list) }))}
      onChange={onChange}
      className={className}
      display={<span className="truncate">{isPending ? "…" : listName(current)}</span>}
    />
  );
}
