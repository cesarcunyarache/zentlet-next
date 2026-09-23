"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useDebounce } from "use-debounce";
import { Button, cn } from "@heroui/react";
import { Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { Sheet } from "@/core/components/ui/sheet";
import CategoryForm from "@/app/admin/category/CategoryForm";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { CategoryEmoji } from "./category-emoji";
import {
  cleanAmountInput,
  dayLabel,
  dayShift,
  parseAmount,
  toISODate,
} from "../lib/format";
import { readDescription } from "../lib/parse-description";
import {
  transactionSchema,
  type TransactionFormValues,
} from "../schemas/transaction.schema";
import { suggestTransactionCategory } from "../ai/actions/category-suggester";
import type { TransactionSuggestion } from "../ai/schemas/transaction-ai.schema";
import type { CategoryLike, TransactionType } from "../types";

interface TransactionFormSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryLike[];
  currency: string;
  onSubmit: (values: TransactionFormValues) => void;
}

const EMPTY: TransactionFormValues = {
  description: "",
  amount: 0,
  type: "expense",
  categoryId: "",
  transactionDate: "",
};

/** Muestra el monto con separador de miles mientras se escribe. */
function displayAmount(raw: string) {
  if (!raw) return "";
  const [int, dec] = raw.split(".");
  const grouped = Number(int || 0).toLocaleString("es-PE");
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

export function TransactionFormSheet({
  isOpen,
  onOpenChange,
  categories,
  currency,
  onSubmit,
}: TransactionFormSheetProps) {
  const reduceMotion = useReducedMotion();

  // el monto vive aparte porque se sanea mientras se teclea
  const [rawAmount, setRawAmount] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // categoría elegida automáticamente (texto o IA), para marcarla con ✨
  const [autoCategoryId, setAutoCategoryId] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  // lo que el usuario toca a mano manda sobre cualquier inferencia
  const picked = useRef({ category: false, type: false, amount: false });
  const cache = useRef(new Map<string, TransactionSuggestion | null>());
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const knownCategoryIds = useRef<Set<string> | null>(null);

  // se recalcula en cada render: si la app quedó abierta de un día para
  // otro, "Hoy" tiene que seguir siendo hoy
  const dayOptions = [0, 1, 2, 3, 4, 5, 6].map((offset) => toISODate(dayShift(offset)));

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode: "onChange",
    defaultValues: { ...EMPTY, transactionDate: dayOptions[0] },
  });

  const type = form.watch("type");
  const categoryId = form.watch("categoryId");
  const transactionDate = form.watch("transactionDate");
  const amount = form.watch("amount");
  const description = form.watch("description");
  const [debouncedDescription] = useDebounce(description, 550);

  // hoja en limpio sólo al abrirse; no al cambiar las categorías
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setRawAmount("");
      setAutoCategoryId(null);
      picked.current = { category: false, type: false, amount: false };
      form.reset({ ...EMPTY, transactionDate: toISODate(dayShift(0)) });
    }
    wasOpen.current = isOpen;
  }, [isOpen, form]);

  function setAmount(value: number, raw: string) {
    setRawAmount(raw);
    form.setValue("amount", value, { shouldValidate: true, shouldDirty: true });
  }

  function applyCategory(id: string | null) {
    if (!id || picked.current.category) return;
    form.setValue("categoryId", id, { shouldValidate: true });
    setAutoCategoryId(id);
  }

  function applyType(next: TransactionType | null) {
    if (!next || picked.current.type) return;
    form.setValue("type", next);
  }

  function applyAmount(value: number | null) {
    if (!value || picked.current.amount) return;
    setAmount(value, String(value));
  }

  // 1 · lectura instantánea del texto, a cada tecla
  function handleDescription(value: string) {
    form.setValue("description", value, { shouldValidate: true });
    const hints = readDescription(value, categories);
    applyAmount(hints.amount);
    applyType(hints.type);
    applyCategory(hints.categoryId);
  }

  // 2 · la IA afina cuando el usuario hace una pausa
  useEffect(() => {
    const text = debouncedDescription.trim().toLowerCase();
    if (!isOpen || text.length < 3 || !categories.length) return;
    let cancelled = false;

    function apply(result: TransactionSuggestion | null) {
      if (!result) return;
      applyCategory(result.categoryId);
      applyType(result.type);
      applyAmount(result.amount);
    }

    async function run() {
      if (cache.current.has(text)) {
        apply(cache.current.get(text) ?? null);
        return;
      }
      setThinking(true);
      try {
        const result = await suggestTransactionCategory({
          description: text,
          categories: categories.map(({ id, name }) => ({ id, name })),
        });
        cache.current.set(text, result);
        if (!cancelled) apply(result);
      } finally {
        if (!cancelled) setThinking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // apply* sólo leen refs y el form, estables entre renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDescription, isOpen, categories]);

  // una categoría recién creada desde aquí queda elegida
  useEffect(() => {
    const known = knownCategoryIds.current;
    if (!known) return;
    const created = categories.find((c) => !known.has(c.id));
    if (created) {
      picked.current.category = true;
      form.setValue("categoryId", created.id, { shouldValidate: true });
      knownCategoryIds.current = null;
    }
  }, [categories, form]);

  // la categoría elegida siempre queda a la vista
  useEffect(() => {
    chipRefs.current
      .get(categoryId)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [categoryId]);

  function submit(values: TransactionFormValues) {
    const category = categories.find((c) => c.id === values.categoryId);
    onSubmit({
      ...values,
      description: values.description.trim() || category?.name || "Movimiento",
    });
    onOpenChange(false);
  }

  const canSave = form.formState.isValid && amount > 0;
  const needsCategory = !categoryId && description.trim().length >= 3 && !thinking;

  return (
    <>
      <Sheet
        isOpen={isOpen && !creatingCategory}
        onOpenChange={onOpenChange}
        title="Nuevo movimiento"
        hideTitle
        footer={
          <Button
            type="button"
            onPress={() => form.handleSubmit(submit)()}
            isDisabled={!canSave}
            className="bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted min-h-[54px] w-full rounded-2xl text-base font-semibold transition-[background-color,transform] active:scale-[0.98]"
          >
            <Check className="size-[17px]" strokeWidth={2.4} />
            Guardar
          </Button>
        }
      >
        <div className="flex flex-col gap-4 pt-6 pb-2">
          {/* fecha: una píldora, el select nativo debajo */}
          <label className="bg-app-fill hover:bg-app-fill-strong relative inline-flex min-h-9 w-fit items-center gap-1 rounded-full px-3 text-[13px] font-semibold transition-colors">
            {dayLabel(transactionDate || dayOptions[0])}
            <ChevronDown className="text-app-muted size-3.5" strokeWidth={2.2} />
            <select
              aria-label="Fecha"
              value={transactionDate}
              onChange={(event) =>
                form.setValue("transactionDate", event.target.value, { shouldValidate: true })
              }
              className="absolute inset-0 cursor-pointer appearance-none opacity-0"
            >
              {dayOptions.map((date) => (
                <option key={date} value={date}>
                  {dayLabel(date)}
                </option>
              ))}
            </select>
          </label>

          <input
            value={description}
            onChange={(event) => handleDescription(event.target.value)}
            placeholder="¿En qué fue?"
            maxLength={42}
            autoComplete="off"
            aria-label="Descripción"
            autoFocus
            className="font-display text-app-fg placeholder:text-app-muted/50 w-full border-0 bg-transparent text-[30px] leading-tight font-bold tracking-[-0.03em] outline-none"
          />

          <div className="flex items-center gap-3">
            <span
              role="group"
              aria-label="Gasto o ingreso"
              className="bg-app-fill inline-flex shrink-0 items-center rounded-full p-[3px]"
            >
              {(["expense", "income"] as const).map((kind) => (
                <SignButton
                  key={kind}
                  type={kind}
                  active={type === kind}
                  onClick={() => {
                    picked.current.type = true;
                    form.setValue("type", kind);
                  }}
                />
              ))}
            </span>

            <label
              className={cn(
                "font-display flex min-w-0 flex-1 items-baseline gap-1 text-[34px] font-bold tracking-[-0.035em] tabular-nums transition-colors duration-300",
                type === "expense" ? "text-app-expense" : "text-app-income",
              )}
            >
              <span className="text-[24px]">{currency}</span>
              <input
                value={displayAmount(rawAmount)}
                onChange={(event) => {
                  picked.current.amount = true;
                  const clean = cleanAmountInput(event.target.value.replace(/,/g, ""));
                  setAmount(parseAmount(clean), clean);
                }}
                type="text"
                inputMode="decimal"
                placeholder="0"
                maxLength={16}
                autoComplete="off"
                aria-label="Monto"
                className="placeholder:text-app-muted/40 min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
              />
            </label>
          </div>

          <div
            role="group"
            aria-label="Categoría"
            className="scroll-clean -mx-[22px] flex gap-2 overflow-x-auto px-[22px] py-1 sm:-mx-7 sm:px-7"
          >
            <motion.button
              type="button"
              aria-label="Nueva categoría"
              whileTap={{ scale: 0.9 }}
              transition={SPRING_PRESS}
              onClick={() => {
                knownCategoryIds.current = new Set(categories.map((c) => c.id));
                setCreatingCategory(true);
              }}
              className="bg-app-fill hover:bg-app-fill-strong text-app-fg grid size-11 shrink-0 place-items-center rounded-full transition-colors"
            >
              <Plus className="size-[18px]" strokeWidth={2} />
            </motion.button>

            {categories.map((category) => {
              const active = categoryId === category.id;
              const suggested = active && autoCategoryId === category.id;

              return (
                <motion.button
                  key={category.id}
                  ref={(node) => {
                    if (node) chipRefs.current.set(category.id, node);
                    else chipRefs.current.delete(category.id);
                  }}
                  type="button"
                  aria-pressed={active}
                  whileTap={{ scale: 0.94 }}
                  transition={SPRING_PRESS}
                  onClick={() => {
                    picked.current.category = true;
                    setAutoCategoryId(null);
                    form.setValue("categoryId", active ? "" : category.id, {
                      shouldValidate: true,
                    });
                  }}
                  className={cn(
                    "relative flex min-h-11 shrink-0 items-center gap-2 rounded-full py-0 pr-4 pl-2 text-sm font-semibold transition-colors",
                    active ? "text-app-surface" : "bg-app-fill text-app-fg hover:bg-app-fill-strong",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tx-category-pill"
                      transition={SPRING_LAYOUT}
                      className="bg-app-fg absolute inset-0 rounded-full"
                    />
                  )}
                  <motion.span
                    animate={active && !reduceMotion ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative inline-grid"
                  >
                    <CategoryEmoji category={category} className="size-7 rounded-full text-[15px]" />
                  </motion.span>
                  <span className="relative">{category.name}</span>
                  {suggested && (
                    <Sparkles aria-hidden className="relative size-3.5" strokeWidth={2.2} />
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="min-h-5">
            <AnimatePresence mode="wait" initial={false}>
              {thinking ? (
                <Hint key="thinking" pulse={!reduceMotion}>
                  Buscando la categoría…
                </Hint>
              ) : autoCategoryId && autoCategoryId === categoryId ? (
                <Hint key="auto">Categoría detectada del texto</Hint>
              ) : needsCategory ? (
                <Hint key="none" muted>
                  Ninguna categoría encaja · elige una o crea otra con +
                </Hint>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </Sheet>

      <Sheet
        isOpen={isOpen && creatingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingCategory(false);
          }
        }}
        title="Nueva categoría"
        hideTitle
        className="min-h-[70dvh]"
        bodyClassName="flex flex-col"
      >
        <div className="flex flex-1 flex-col pb-4">
          <CategoryForm
            initialName={description.trim().split(/\s+/)[0] ?? ""}
            onSuccess={() => setCreatingCategory(false)}
          />
        </div>
      </Sheet>
    </>
  );
}

function Hint({
  children,
  muted = false,
  pulse = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  pulse?: boolean;
}) {
  return (
    <motion.p
      role="status"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "m-0 flex items-center gap-1.5 text-xs font-semibold",
        muted ? "text-app-muted" : "text-app-fg",
      )}
    >
      {!muted && (
        <motion.span
          animate={pulse ? { rotate: [0, 18, -12, 0], scale: [1, 1.15, 1] } : undefined}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="inline-grid"
        >
          <Sparkles className="size-3.5" strokeWidth={2} />
        </motion.span>
      )}
      {children}
    </motion.p>
  );
}

function SignButton({
  type,
  active,
  onClick,
}: {
  type: TransactionType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      aria-label={type === "expense" ? "Gasto" : "Ingreso"}
      whileTap={{ scale: 0.9 }}
      transition={SPRING_PRESS}
      onClick={onClick}
      className={cn(
        "relative grid h-9 w-11 place-items-center rounded-full text-lg font-bold transition-colors",
        active ? "text-app-surface" : "text-app-muted hover:text-app-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="tx-sign-pill"
          transition={SPRING_LAYOUT}
          className={cn(
            "absolute inset-0 rounded-full transition-colors duration-300",
            type === "expense" ? "bg-app-expense" : "bg-app-income",
          )}
        />
      )}
      <span className="relative">{type === "expense" ? "−" : "+"}</span>
    </motion.button>
  );
}
