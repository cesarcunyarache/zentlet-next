"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { useRouter } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { track } from "@/lib/observability/client";
import { useCreateList, useLists } from "../../stores/list.store";
import type { TListPayload } from "../../types";
import { ListFormSheet } from "../form/list-form-sheet";
import { ListCard } from "./list-card";

interface ListsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListsSheet({ isOpen, onOpenChange }: ListsSheetProps) {
  const t = useTranslations("lists");
  const router = useRouter();
  const { lists, isLoading, isError } = useLists();
  const create = useCreateList();
  const [isCreating, setIsCreating] = useState(false);

  function openList(listId: string) {
    onOpenChange(false);
    router.push(`${siteConfig.routes.lists}/${listId}`);
  }

  function createList(payload: TListPayload) {
    create.mutate(payload, {
      onSuccess: (created) => {
        track("list_created", {});
        setIsCreating(false);
        openList(created.id);
      },
    });
  }

  return (
    <>
      <Sheet isOpen={isOpen && !isCreating} onOpenChange={onOpenChange} title={t("title")} hideTitle>
        <h2 className="font-display text-app-fg mt-2 mb-6 text-[28px] font-bold tracking-[-0.03em]">{t("title")}</h2>

        {isLoading ? (
          <ListsSkeleton />
        ) : isError ? (
          <p className="text-app-muted m-0 py-6 text-center text-sm">{t("loadFailed")}</p>
        ) : lists.length === 0 ? (
          <p className="text-app-muted m-0 py-6 text-center text-sm text-balance">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} onPress={() => openList(list.id)} />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            create.reset();
            setIsCreating(true);
          }}
          className="bg-app-fill text-app-fg hover:bg-app-fill-strong mt-5 mb-2 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-colors"
        >
          <Plus className="size-5" strokeWidth={2.2} aria-hidden />
          {t("create")}
        </button>
      </Sheet>

      <ListFormSheet
        isOpen={isOpen && isCreating}
        list={null}
        isSaving={create.isPending}
        error={create.isError ? t("errors.generic") : null}
        onClose={() => setIsCreating(false)}
        onSubmit={createList}
      />
    </>
  );
}

function ListsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center gap-3.5 px-1 py-2.5">
          <span className="bg-app-fill size-12 animate-pulse rounded-2xl" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="bg-app-fill h-3.5 w-36 animate-pulse rounded-full" />
            <span className="bg-app-fill h-2.5 w-20 animate-pulse rounded-full" />
          </span>
        </div>
      ))}
    </div>
  );
}
