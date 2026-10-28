"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PillSelect } from "@/core/components/ui/pill-select";
import { track } from "@/lib/observability/client";
import { useListName } from "../../hooks/useListName";
import { useCreateList, useLists } from "../../stores/list.store";
import type { TListPayload } from "../../types";
import { ListFormSheet } from "../form/list-form-sheet";

const NEW = "new";

interface ListFilterSelectProps {
  value: string | null;
  onChange: (listId: string) => void;
}

export function ListFilterSelect({ value, onChange }: ListFilterSelectProps) {
  const t = useTranslations("lists");
  const { lists } = useLists();
  const listName = useListName();
  const create = useCreateList();
  const [isCreating, setIsCreating] = useState(false);

  const options = [
    ...lists.map((list) => ({ value: list.id, label: listName(list) })),
    { value: NEW, label: `+ ${t("create")}` },
  ];

  function select(next: string) {
    if (next === NEW) {
      create.reset();
      setIsCreating(true);
      return;
    }
    onChange(next);
  }

  function createList(payload: TListPayload) {
    create.mutate(payload, {
      onSuccess: (created) => {
        track("list_created", {});
        setIsCreating(false);
        onChange(created.id);
      },
    });
  }

  if (!value) return null;

  return (
    <>
      <PillSelect
        label={t("filter.label")}
        value={value}
        options={options}
        onChange={select}
        className="hover:bg-app-fill"
      />
      <ListFormSheet
        isOpen={isCreating}
        list={null}
        isSaving={create.isPending}
        error={create.isError ? t("errors.generic") : null}
        onClose={() => setIsCreating(false)}
        onSubmit={createList}
      />
    </>
  );
}
