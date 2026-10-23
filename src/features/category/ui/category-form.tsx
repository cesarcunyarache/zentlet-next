"use client";

import { Button, Form } from "@heroui/react";
import { Check } from "@gravity-ui/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useIsOnline } from "@/core/offline/sync-status";
import { track } from "@/lib/observability/client";
import type { CategoryIcon } from "../ai/schemas/category-ai.schema";
import { useIconSuggestions } from "../hooks/useIconSuggestions";
import { withCurrentFirst } from "../lib/icon-order";
import { categorySchema, type CategoryFormValues } from "../schemas/category.schema";
import { useCategoryStore } from "../stores/category.store";
import type { EditableCategory } from "../types";
import { CategoryIconEditor } from "./category-icon-editor";
import { CategoryIconPicker } from "./category-icon-picker";
import { GhostInput } from "./ghost-input";

const TOUCH_FIELD = { shouldValidate: true, shouldDirty: true } as const;

interface CategoryFormProps {
  onSuccess: () => void;
  initialName?: string;
  category?: EditableCategory;
}

export function CategoryForm({ onSuccess, initialName = "", category }: CategoryFormProps) {
  const t = useTranslations();
  const { createCategory, updateCategory } = useCategoryStore();
  const online = useIsOnline();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customIcon, setCustomIcon] = useState<CategoryIcon | null>(null);
  const customIconRef = useRef<CategoryIcon | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    mode: "onChange",
    defaultValues: {
      name: category?.name ?? initialName,
      icon: category?.icon ?? "",
      description: category?.description ?? "",
      color: category?.color ?? "",
    },
  });
  const [name, icon, color] = useWatch({ control: form.control, name: ["name", "icon", "color"] });

  function selectIcon(next: CategoryIcon) {
    form.setValue("icon", next.icon, TOUCH_FIELD);
    form.setValue("color", next.color, TOUCH_FIELD);
  }

  function ensureIconSelected(suggested: CategoryIcon[]) {
    const icons = withCurrentFirst(suggested, customIconRef.current);
    const selected = form.getValues("icon");
    const first = icons[0];
    if (first && !icons.some((item) => item.icon === selected)) selectIcon(first);
  }

  function chooseCustomIcon(next: CategoryIcon) {
    customIconRef.current = next;
    setCustomIcon(next);
    selectIcon(next);
    setIsCustomizing(false);
  }

  const { icons: suggestedIcons, aiSuggestions, isLoading, isAiUnavailable } = useIconSuggestions({
    name,
    category,
    onIconsChange: ensureIconSelected,
  });
  const icons = withCurrentFirst(suggestedIcons, customIcon);

  if (isCustomizing) {
    return <CategoryIconEditor value={{ icon, color }} onDone={chooseCustomIcon} />;
  }

  function onSubmit(values: CategoryFormValues) {
    if (category) {
      const { description, ...rest } = values;
      updateCategory(category.id, {
        ...rest,
        ...(category.description !== undefined && { description }),
        ...(aiSuggestions && { aiSuggestions }),
      });
      track("category_updated", {});
    } else {
      createCategory({ ...values, aiSuggestions: aiSuggestions ?? null });
      track("category_created", { ai_suggested: !isAiUnavailable });
    }
    form.reset();
    onSuccess();
  }

  return (
    <Form className="flex h-full flex-1 flex-col justify-center gap-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-1 flex-col justify-center gap-5">
        <CategoryIconPicker
          icons={icons}
          value={{ icon, color }}
          isLoading={isLoading}
          onChange={selectIcon}
          onCustomize={() => setIsCustomizing(true)}
        />
        <GhostInput
          label={t("categories.form.nameLabel")}
          value={name}
          inputSize="text-4xl sm:text-3xl"
          placeholder={t("categories.form.namePlaceholder")}
          onChange={(value) => form.setValue("name", value, TOUCH_FIELD)}
        />
      </div>

      {isAiUnavailable && (
        <p className="text-app-muted w-full text-center text-sm">
          {t(online ? "categories.form.aiUnavailable" : "categories.form.aiOffline")}
        </p>
      )}

      <Button type="submit" className="w-full" isDisabled={!form.formState.isValid}>
        <Check />
        {t("common.actions.save")}
      </Button>
    </Form>
  );
}
