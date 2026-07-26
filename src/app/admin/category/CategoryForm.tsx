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
import { useCategory } from "@/features/category/hooks/useCategory";
import { Check } from "@gravity-ui/icons";
import { EASE_OUT } from "@/lib/ease";
import { GestureCarousel } from "@/core/components/carrusel";
import { generateCategory } from "@/features/category/ai/actions/category-generator";

interface CategoryIcon {
  icon: string;
  color: string;
}

export default function CategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const { createCategory } = useCategory();
  const [categoriesIcons, setCategoriesIcons] = useState<CategoryIcon[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      icon: "",
      description: "",
      color: "",
    },
  });

  const name = form.watch("name");
  const [debouncedName] = useDebounce(name, 700);

  useEffect(() => {
    if (!debouncedName.trim()) return;
    let cancelled = false;

    async function generate() {
      try {
        setLoadingAI(true);
        const suggestion = await generateCategory(debouncedName);
        if (cancelled) return;
        setCategoriesIcons(suggestion.categories);
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
  }, [debouncedName]);

  async function onSubmit(values: CategoryFormValues) {
    await createCategory(values);
    form.reset();
    onSuccess();
  }

  return (
    <Form
      className="flex flex-col gap-5 h-full justify-center justify-items-center"
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

      <Button
        type="submit"
        className="w-full"
        isDisabled={!form.formState.isValid}
      >
        <Check />
        Guardar
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
            !value && "text-muted-foreground/55",
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
