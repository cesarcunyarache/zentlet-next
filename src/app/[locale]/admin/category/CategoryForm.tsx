"use client";

import { Button, Form, cn } from "@heroui/react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { AnimatePresence, motion } from "motion/react";

import { useDebounce } from "use-debounce";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  categorySchema,
  type CategoryFormValues,
} from "@/features/category/schemas/category.schema";
import { useCategoryStore } from "@/features/category/stores/category.store";
import { Check } from "@gravity-ui/icons";
import { EASE_OUT } from "@/lib/ease";
import { GestureCarousel } from "@/core/components/carrusel";
import { generateCategory } from "@/features/category/ai/actions/category-generator";
import { track } from "@/lib/observability/client";
import { useIsOnline } from "@/core/offline/sync-status";
import { Sheet } from "@/core/components/ui/sheet";

interface CategoryIcon {
  icon: string;
  color: string;
}

/**
 * Iconos de reserva cuando la IA no está disponible (sin conexión, cuota
 * agotada, sin sesión): la categoría se puede crear igual.
 */
const FALLBACK_ICONS: CategoryIcon[] = [
  { icon: "🏷️", color: "#E9E4F5" },
  { icon: "🛒", color: "#FDECC8" },
  { icon: "🍽️", color: "#FBDDD5" },
  { icon: "🚌", color: "#D6E8F7" },
  { icon: "🏠", color: "#E4DDF3" },
  { icon: "💡", color: "#FFF1B8" },
  { icon: "🎉", color: "#F8D9EA" },
  { icon: "💼", color: "#D5F0DD" },
];

const TOUCH_FIELD = { shouldValidate: true, shouldDirty: true } as const;

/** Iconos sugeridos por la IA, o `null` si no está disponible. */
async function suggestIcons(name: string): Promise<CategoryIcon[] | null> {
  // sin red la llamada fallaría seguro
  if (!navigator.onLine) return null;
  try {
    return (await generateCategory(name)).categories;
  } catch {
    return null;
  }
}

export interface EditableCategory {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export default function CategoryForm({
  onSuccess,
  initialName = "",
  category,
}: {
  onSuccess: () => void;
  /** Nombre con el que arranca, p. ej. la primera palabra del asunto. */
  initialName?: string;
  /** Si llega, el formulario edita esta categoría en lugar de crear una. */
  category?: EditableCategory;
}) {
  const t = useTranslations();
  const { createCategory, updateCategory } = useCategoryStore();
  // al editar, el carrusel ya arranca con el icono actual
  const current = category?.icon
    ? { icon: category.icon, color: category.color || "" }
    : null;
  const [categoriesIcons, setCategoriesIcons] = useState<CategoryIcon[]>(
    current ? [current] : [],
  );
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const online = useIsOnline();

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

  const name = form.watch("name");
  const [debouncedName] = useDebounce(name, 700);

  function selectIcon({ icon, color }: CategoryIcon) {
    form.setValue("icon", icon, TOUCH_FIELD);
    form.setValue("color", color, TOUCH_FIELD);
  }

  useEffect(() => {
    if (!debouncedName.trim()) return;
    // editando sin cambiar el nombre no hace falta pedir iconos nuevos
    if (category && debouncedName === category.name) return;
    let cancelled = false;

    async function generate() {
      try {
        setLoadingAI(true);
        const fromAI = await suggestIcons(debouncedName);
        if (cancelled) return;
        setAiUnavailable(!fromAI);
        const suggested = fromAI ?? FALLBACK_ICONS;
        // al editar, el icono actual sigue siendo una opción del carrusel
        const icons = current
          ? [current, ...suggested.filter((s) => s.icon !== current.icon)]
          : suggested;
        setCategoriesIcons(icons);

        // el carrusel muestra el primero si el icono actual no está en la
        // lista; sin esto el form queda vacío y Guardar no se habilita
        // hasta deslizar
        const selected = form.getValues("icon");
        const first = icons[0];
        if (first && !icons.some((item) => item.icon === selected)) {
          selectIcon(first);
        }
      } finally {
        if (!cancelled) {
          setLoadingAI(false);
        }
      }
    }
    generate();
    return () => {
      cancelled = true;
    };
    // category/current sólo cambian al abrir otra categoría (se remonta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName]);

  /**
   * No se espera al servidor: la categoría aparece al instante y se
   * sincroniza por detrás (en cola si no hay conexión). Si el servidor la
   * rechaza después, el aviso llega por `onSyncError`.
   */
  function onSubmit(values: CategoryFormValues) {
    if (category) {
      const { description, ...rest } = values;
      updateCategory(
        category.id,
        category.description === undefined ? rest : { ...rest, description },
      );
      track("category_updated", {});
    } else {
      createCategory(values);
      // el carrusel sólo ofrece iconos de la IA o, si falló, los de reserva
      track("category_created", { ai_suggested: !aiUnavailable });
    }
    form.reset();
    onSuccess();
  }

  return (
    <Form
      className="flex flex-1 flex-col gap-5 h-full justify-center justify-items-center"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-1 flex-col  justify-center gap-5">
        <div className="h-32 w-32">
          <AnimatePresence mode="wait">
            {loadingAI ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full rounded-2xl bg-gray-100 overflow-hidden relative"
              >
                <motion.div
                  className="absolute inset-0 -translate-x-full from-transparent via-white/40 to-transparent"
                  animate={{
                    translateX: ["-100%", "100%"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "linear",
                  }}
                />
              </motion.div>
            ) : categoriesIcons.length > 0 ? (
              <motion.div
                key="carousel"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                <GestureCarousel
                  items={categoriesIcons}
                  value={{
                    icon: form.watch("icon"),
                    color: form.watch("color"),
                  }}
                  onChange={selectIcon}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <GhostInput
          id=""
          value={name}
          inputSize="text-4xl sm:text-3xl"
          placeholder={t("categories.form.namePlaceholder")}
          onChange={(value) => form.setValue("name", value, TOUCH_FIELD)}
        />
      </div>

      {aiUnavailable && (
        <p className="text-app-muted w-full text-center text-sm">
          {t(online ? "categories.form.aiUnavailable" : "categories.form.aiOffline")}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        isDisabled={!form.formState.isValid}
      >
        <Check />
        {t("common.actions.save")}
      </Button>
    </Form>
  );
}

export function CategoryFormSheet({
  isOpen,
  category,
  initialName,
  onClose,
}: {
  isOpen: boolean;
  category?: EditableCategory | null;
  initialName?: string;
  onClose: () => void;
}) {
  const t = useTranslations("categories.form");

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t(category ? "edit" : "new")}
      hideTitle
      className="min-h-[70dvh]"
      bodyClassName="flex flex-col"
    >
      <div className="flex flex-1 flex-col pb-4">
        <CategoryForm
          key={category?.id ?? "new"}
          category={category ?? undefined}
          initialName={initialName}
          onSuccess={onClose}
        />
      </div>
    </Sheet>
  );
}

function keyedChars(value: string) {
  const seen = new Map<string, number>();
  return value.split("").map((char) => {
    const count = seen.get(char) ?? 0;
    seen.set(char, count + 1);
    return { id: `${char}-${count}`, char };
  });
}

const CHAR_TRANSITION = { duration: 0.18, ease: EASE_OUT } as const;

function GhostInput({
  id,
  value,
  placeholder,
  inputSize,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  inputSize: string;
  onChange: (value: string) => void;
}) {
  const displayValue = value || placeholder || "";
  const chars = keyedChars(displayValue);

  return (
    <div className="flex min-w-0 items-center overflow-hidden">
      <div className="relative min-w-0 shrink">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          className={cn(
            "bg-transparent font-semibold tracking-normal text-transparent outline-none",
            "caret-foreground transition-[font-size] duration-200 placeholder:text-transparent selection:bg-foreground/10 disabled:cursor-not-allowed",
            inputSize,
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex min-w-0 items-center justify-start overflow-hidden font-semibold leading-none tracking-normal text-foreground transition-[font-size] duration-200",
            !value && "text-app-muted/40",
            inputSize,
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {chars.map(({ id: charId, char }) => (
              <motion.span
                key={charId}
                layout="position"
                initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -14, filter: "blur(10px)" }}
                transition={CHAR_TRANSITION}
                className="inline-block text-center will-change-[transform,opacity,filter]"
              >
                {char}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
