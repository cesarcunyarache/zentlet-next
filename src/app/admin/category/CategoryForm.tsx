"use client";

import { Button, Form, cn } from "@heroui/react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { AnimatePresence, motion } from "motion/react";

import { useDebounce } from "use-debounce";
import { useEffect, useState } from "react";

import {
  categorySchema,
  type CategoryFormValues,
} from "@/features/category/schemas/category.schema";
import { useCategoryStore } from "@/features/category/stores/category.store";
import { getApiErrorMessage } from "@/core/services/api-error";
import { Check } from "@gravity-ui/icons";
import { EASE_OUT } from "@/lib/ease";
import { GestureCarousel } from "@/core/components/carrusel";
import { generateCategory } from "@/features/category/ai/actions/category-generator";

interface CategoryIcon {
  icon: string;
  color: string;
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
  const { createCategory, updateCategory, isCreating, isUpdating } =
    useCategoryStore();
  const isSaving = isCreating || isUpdating;
  // al editar, el carrusel ya arranca con el icono actual
  const current = category?.icon
    ? { icon: category.icon, color: category.color || "" }
    : null;
  const [categoriesIcons, setCategoriesIcons] = useState<CategoryIcon[]>(
    current ? [current] : [],
  );
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!debouncedName.trim()) return;
    // editando sin cambiar el nombre no hace falta pedir iconos nuevos
    if (category && debouncedName === category.name) return;
    let cancelled = false;

    async function generate() {
      try {
        setLoadingAI(true);
        const suggestion = await generateCategory(debouncedName);
        if (cancelled) return;
        // al editar, el icono actual sigue siendo una opción del carrusel
        const icons = current
          ? [current, ...suggestion.categories.filter((s) => s.icon !== current.icon)]
          : suggestion.categories;
        setCategoriesIcons(icons);

        // el carrusel muestra el primero si el icono actual no está en la
        // lista; sin esto el form queda vacío y Guardar no se habilita
        // hasta deslizar
        const selected = form.getValues("icon");
        const first = icons[0];
        if (first && !icons.some((item) => item.icon === selected)) {
          form.setValue("icon", first.icon, { shouldValidate: true, shouldDirty: true });
          form.setValue("color", first.color, { shouldValidate: true, shouldDirty: true });
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

  async function onSubmit(values: CategoryFormValues) {
    try {
      if (category) {
        const { description, ...rest } = values;
        await updateCategory({
          categoryId: category.id,
          data: category.description === undefined ? rest : { ...rest, description },
        });
      } else {
        await createCategory(values);
      }
      form.reset();
      onSuccess();
    } catch (error) {
      // El panel sigue abierto para reintentar; el store conserva el error.
      setSubmitError(
        getApiErrorMessage(
          error,
          category ? "No se pudo guardar la categoría" : "No se pudo crear la categoría",
        ),
      );
    }
  }

  return (
    <Form
      className="flex flex-1 flex-col gap-5 h-full justify-center justify-items-center"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-1 flex-col  justify-center gap-5">
        {/* {categoriesIcons.length > 0 && (
          <div className="h-32 w-32">
            <GestureCarousel
              items={categoriesIcons}
              value={{
                icon: form.watch("icon"),
                color: form.watch("color"),
              }}
              onChange={({ icon, color }) => {
                form.setValue("icon", icon, {
                  shouldValidate: true,
                  shouldDirty: true,
                });

                form.setValue("color", color, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
          </div>
        )} */}

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
                  onChange={({ icon, color }) => {
                    form.setValue("icon", icon, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });

                    form.setValue("color", color, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <GhostInput
          id=""
          value={form.watch("name")}
          disabled={false}
          inputSize="text-4xl sm:text-3xl"
          reduce={false}
          placeholder="Categoría"
          onChange={(value) =>
            form.setValue("name", value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      </div>

      {submitError && (
        <p role="alert" className="text-danger w-full text-center text-sm">
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        isDisabled={!form.formState.isValid || isSaving}
      >
        <Check />
        {isSaving ? "Guardando…" : "Guardar"}
      </Button>
    </Form>
  );
}

function keyedAmountChars(value: string) {
  const seen = new Map<string, number>();
  return value.split("").map((char) => {
    const count = seen.get(char) ?? 0;
    seen.set(char, count + 1);
    return { id: `${char}-${count}`, char };
  });
}

const DIGIT_TRANSITION = { duration: 0.18, ease: EASE_OUT } as const;

function GhostInput({
  id,
  value,
  placeholder,
  inputSize,
  disabled,
  reduce,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  inputSize: string;
  disabled: boolean;
  reduce: boolean;
  onChange: (value: string) => void;
}) {
  const displayValue = value || placeholder || "";
  const chars = keyedAmountChars(displayValue);

  return (
    <div className="flex min-w-0 items-center overflow-hidden">
      <div className="relative min-w-0 shrink">
        <input
          id={id}
          value={value}
          disabled={disabled}
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
                layout={reduce ? false : "position"}
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: 18, filter: "blur(10px)" }
                }
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: -14, filter: "blur(10px)" }
                }
                transition={DIGIT_TRANSITION}
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
