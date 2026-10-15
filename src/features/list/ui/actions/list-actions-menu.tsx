"use client";

import { useState } from "react";
import { Button, Dropdown, Label } from "@heroui/react";
import { EllipsisVertical, Pencil, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { track } from "@/lib/observability/client";
import { useListName } from "../../hooks/useListName";
import { listErrorKey } from "../../lib/errors";
import { useDeleteList, useListDetail, useUpdateList } from "../../stores/list.store";
import type { TList, TListDetail, TListPayload } from "../../types";
import { ListFormSheet } from "../form/list-form-sheet";
import { ShareSheet } from "../share/share-sheet";
import { DeleteListDialog } from "./delete-list-dialog";

type Action = "edit" | "share" | "delete";

interface ListActionsMenuProps {
  list: TList;
  onToast: (message: string) => void;
}

export function ListActionsMenu({ list, onToast }: ListActionsMenuProps) {
  const t = useTranslations("lists.menu");
  const [action, setAction] = useState<Action | null>(null);
  const isOwner = list.role === "owner";

  return (
    <>
      <Dropdown>
        <Button isIconOnly aria-label={t("label")} variant="ghost" size="sm" className="text-app-muted rounded-full">
          <EllipsisVertical className="size-4" />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={(key) => setAction(key as Action)}>
            {isOwner ? (
              <Dropdown.Item id="edit" textValue={t("edit")}>
                <Pencil className="text-muted size-4 shrink-0" />
                <Label>{t("edit")}</Label>
              </Dropdown.Item>
            ) : null}
            <Dropdown.Item id="share" textValue={t("share")}>
              <UserPlus className="text-muted size-4 shrink-0" />
              <Label>{t("share")}</Label>
            </Dropdown.Item>
            {isOwner ? (
              <Dropdown.Item id="delete" textValue={t("delete")} variant="danger">
                <Trash2 className="text-danger size-4 shrink-0" />
                <Label>{t("delete")}</Label>
              </Dropdown.Item>
            ) : null}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {action === "share" ? (
        <ShareAction listId={list.id} onClose={() => setAction(null)} onToast={onToast} />
      ) : null}
      <EditAction list={list} isOpen={action === "edit"} onClose={() => setAction(null)} onToast={onToast} />
      <DeleteAction list={list} isOpen={action === "delete"} onClose={() => setAction(null)} onToast={onToast} />
    </>
  );
}

interface ActionProps {
  list: TList;
  isOpen: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}

function EditAction({ list, isOpen, onClose, onToast }: ActionProps) {
  const t = useTranslations("lists");
  const update = useUpdateList(list.id);

  function save(payload: TListPayload) {
    update.mutate(payload, {
      onSuccess: () => {
        onClose();
        onToast(t("toast.updated"));
      },
    });
  }

  return (
    <ListFormSheet
      isOpen={isOpen}
      list={list}
      isSaving={update.isPending}
      error={update.isError ? t(`errors.${listErrorKey(update.error)}`, { currency: list.currency }) : null}
      onClose={() => {
        update.reset();
        onClose();
      }}
      onSubmit={save}
    />
  );
}

function DeleteAction({ list, isOpen, onClose, onToast }: ActionProps) {
  const t = useTranslations("lists");
  const listName = useListName();
  const remove = useDeleteList();

  function confirm() {
    remove.mutate(list.id, {
      onSuccess: () => {
        track("list_deleted", {});
        onClose();
        onToast(t("toast.deleted"));
      },
      onError: (error) => {
        onClose();
        onToast(t(`errors.${listErrorKey(error)}`, { currency: list.currency }));
      },
    });
  }

  return (
    <DeleteListDialog
      isOpen={isOpen}
      listName={listName(list)}
      isDeleting={remove.isPending}
      onCancel={onClose}
      onConfirm={confirm}
    />
  );
}

interface ShareActionProps {
  listId: string;
  onClose: () => void;
  onToast: (message: string) => void;
}

function ShareAction({ listId, onClose, onToast }: ShareActionProps) {
  const { data: list } = useListDetail(listId);
  return list ? <LoadedShareAction list={list} onClose={onClose} onToast={onToast} /> : null;
}

function LoadedShareAction({ list, onClose, onToast }: Omit<ShareActionProps, "listId"> & { list: TListDetail }) {
  const t = useTranslations("lists");
  const { userId } = useOfflineSession();

  return (
    <ShareSheet
      list={list}
      userId={userId}
      isOpen
      onOpenChange={(open) => !open && onClose()}
      onToast={onToast}
      onLeft={() => {
        track("list_left", {});
        onClose();
        onToast(t("toast.left"));
      }}
    />
  );
}
