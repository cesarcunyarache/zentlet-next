"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button, cn } from "@heroui/react";
import { Check, Keyboard, Mic, MicOff, Pencil, RotateCcw, Sparkles, WifiOff } from "lucide-react";
import { Sheet } from "@/core/components/ui/sheet";
import { SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { useSpeechRecognition, type SpeechError } from "../hooks/use-speech-recognition";
import { parseVoiceEntry, type VoiceDraft } from "../lib/parse-voice";
import { dayLabel, formatNumber } from "../lib/format";
import { suggestTransactionCategory } from "../ai/actions/category-suggester";
import { CategoryEmoji } from "./category-emoji";
import type { TransactionFormValues } from "../schemas/transaction.schema";
import type { CategoryLike } from "../types";

const EXAMPLES = [
  "Gasté 35 soles en almuerzo",
  "Ayer pagué 50 en gasolina",
  "Me pagaron 2500 de sueldo",
  "Compré un mouse por 120",
];

const BAR_PEAKS = [18, 30, 42, 26, 38, 22, 14];

const ERROR_COPY: Record<SpeechError, { title: string; body: string }> = {
  denied: {
    title: "Sin permiso para el micrófono",
    body: "Actívalo desde el candado junto a la dirección de la página (Configuración del sitio → Micrófono → Permitir) y vuelve a intentarlo.",
  },
  "no-mic": {
    title: "No encontramos un micrófono",
    body: "Conecta uno o revisa que ninguna otra app lo esté usando.",
  },
  "no-speech": {
    title: "No te escuché",
    body: "Habla cerca del micrófono, por ejemplo: «gasté 35 soles en almuerzo».",
  },
  network: {
    title: "El dictado necesita internet",
    body: "Tu navegador transcribe la voz en línea. Sin conexión puedes registrarlo escribiendo; se sincroniza al volver la red.",
  },
  unsupported: {
    title: "Tu navegador no permite dictar",
    body: "Prueba con Chrome, Edge o Safari, o regístralo escribiendo.",
  },
  unknown: {
    title: "No pudimos escucharte",
    body: "Algo falló con el micrófono. Inténtalo de nuevo.",
  },
};

interface VoiceEntryProps {
  categories: CategoryLike[];
  currency: string;
  onSave: (values: TransactionFormValues) => void;
  /** Abre el formulario completo con lo interpretado. */
  onEdit: (draft: Partial<TransactionFormValues>) => void;
}

/** Botón de micrófono y hoja de dictado: escuchar → interpretar → confirmar. */
export function VoiceEntry({ categories, currency, onSave, onEdit }: VoiceEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const speech = useSpeechRecognition();
  // categoría elegida a mano o sugerida por la IA, ligada a su dictado
  const [picked, setPicked] = useState<{ transcript: string; categoryId: string } | null>(null);
  const [aiPick, setAiPick] = useState<{ transcript: string; categoryId: string } | null>(null);

  const parsed = useMemo(
    () => (speech.status === "done" ? parseVoiceEntry(speech.transcript, categories) : null),
    [speech.status, speech.transcript, categories],
  );
  const pickedId = picked?.transcript === speech.transcript ? picked.categoryId : null;
  const aiCategoryId = !parsed?.categoryId && aiPick?.transcript === speech.transcript ? aiPick.categoryId : null;
  const draft: VoiceDraft | null = parsed && {
    ...parsed,
    categoryId: pickedId ?? parsed.categoryId ?? aiCategoryId,
  };

  function open() {
    setIsOpen(true);
    // en el mismo toque: Safari sólo pide el micrófono tras un gesto
    speech.start();
  }

  function close() {
    speech.cancel();
    setIsOpen(false);
  }

  function retry() {
    speech.start();
  }

  // el texto no alcanzó: la IA propone entre las categorías del usuario
  const needsAi = Boolean(parsed && !parsed.categoryId && parsed.description);
  useEffect(() => {
    if (!needsAi || !parsed || !navigator.onLine) return;
    const transcript = speech.transcript;
    let cancelled = false;
    suggestTransactionCategory({
      description: parsed.description,
      categories: categories.map(({ id, name }) => ({ id, name })),
    })
      .then((result) => {
        if (!cancelled && result?.categoryId) setAiPick({ transcript, categoryId: result.categoryId });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // una sola consulta por dictado; categories cambia de identidad a menudo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAi, speech.transcript]);

  const values = draft && toFormValues(draft, categories);
  const canSave = Boolean(values && values.amount > 0 && values.categoryId);

  function save() {
    if (!values || !canSave) return;
    onSave(values);
    setIsOpen(false);
  }

  function edit() {
    if (!draft) return;
    setIsOpen(false);
    onEdit({
      type: draft.type,
      amount: draft.amount ?? undefined,
      description: draft.description,
      categoryId: draft.categoryId ?? undefined,
      transactionDate: draft.transactionDate,
    });
  }

  const isListening = speech.status === "starting" || speech.status === "listening";
  const showPreview = speech.status === "done" && draft;

  return (
    <>
      <MicButton onPress={open} />

      <Sheet
        isOpen={isOpen}
        onOpenChange={(next) => !next && close()}
        title="Dictar movimiento"
        hideTitle
        className="min-h-[62dvh]"
        bodyClassName="flex flex-col"
        footer={
          isListening ? (
            <div className="flex">
              <FooterButton onPress={speech.stop} icon={<Check className="size-[17px]" strokeWidth={2.4} />}>
                Listo
              </FooterButton>
            </div>
          ) : showPreview ? (
            <div className="flex gap-2.5">
              <FooterButton variant="secondary" onPress={edit} icon={<Pencil className="size-4" strokeWidth={2.2} />}>
                Editar
              </FooterButton>
              <FooterButton onPress={save} isDisabled={!canSave} icon={<Check className="size-[17px]" strokeWidth={2.4} />}>
                Guardar
              </FooterButton>
            </div>
          ) : speech.status === "error" ? (
            <div className="flex gap-2.5">
              <FooterButton
                variant="secondary"
                onPress={() => {
                  close();
                  onEdit({});
                }}
                icon={<Keyboard className="size-4" strokeWidth={2.2} />}
              >
                Escribirlo
              </FooterButton>
              {speech.error !== "unsupported" && (
                <FooterButton onPress={retry} icon={<RotateCcw className="size-4" strokeWidth={2.2} />}>
                  Reintentar
                </FooterButton>
              )}
            </div>
          ) : null
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {isListening || speech.status === "idle" ? (
            <ListeningView
              key="listening"
              isReady={speech.status === "listening"}
              isSpeaking={speech.isSpeaking}
              transcript={speech.transcript}
            />
          ) : showPreview && values ? (
            <PreviewView
              key="preview"
              transcript={speech.transcript}
              draft={draft}
              values={values}
              currency={currency}
              categories={categories}
              suggested={aiCategoryId !== null && !pickedId && aiCategoryId === draft.categoryId}
              onPickCategory={(categoryId) => setPicked({ transcript: speech.transcript, categoryId })}
              onRetry={retry}
            />
          ) : speech.error ? (
            <ErrorView key="error" error={speech.error} />
          ) : null}
        </AnimatePresence>
      </Sheet>
    </>
  );
}

function toFormValues(draft: VoiceDraft, categories: CategoryLike[]): TransactionFormValues {
  const category = categories.find((c) => c.id === draft.categoryId);
  return {
    type: draft.type,
    amount: draft.amount ?? 0,
    categoryId: draft.categoryId ?? "",
    transactionDate: draft.transactionDate,
    description: draft.description || category?.name || "Movimiento",
  };
}

function MicButton({ onPress }: { onPress: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Dictar movimiento"
      onClick={onPress}
      initial={{ scale: 0, y: 12 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      transition={{ ...SPRING_PRESS, delay: 0.08 }}
      className="bg-app-surface text-app-fg pointer-events-auto grid size-12 place-items-center rounded-full shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--app-ink)_35%,transparent)] ring-1 ring-[var(--app-border)]"
    >
      <Mic className="size-5" strokeWidth={2} />
    </motion.button>
  );
}

function FooterButton({
  children,
  icon,
  onPress,
  isDisabled = false,
  variant = "primary",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onPress: () => void;
  isDisabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button
      type="button"
      onPress={onPress}
      isDisabled={isDisabled}
      className={cn(
        "min-h-[54px] flex-1 rounded-2xl text-base font-semibold transition-[background-color,transform] active:scale-[0.98]",
        variant === "primary"
          ? "bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted"
          : "bg-app-fill text-app-fg hover:bg-app-fill-strong",
      )}
    >
      {icon}
      {children}
    </Button>
  );
}

const VIEW_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: SPRING_SWAP,
};

function ListeningView({
  isReady,
  isSpeaking,
  transcript,
}: {
  isReady: boolean;
  isSpeaking: boolean;
  transcript: string;
}) {
  const reduceMotion = useReducedMotion();
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    if (transcript) return;
    const timer = setInterval(() => setExampleIndex((i) => (i + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(timer);
  }, [transcript]);

  const label = !isReady ? "Preparando el micrófono…" : isSpeaking ? "Escuchando…" : "Te escucho, habla cuando quieras";

  return (
    <motion.div {...VIEW_MOTION} className="flex flex-1 flex-col items-center justify-center gap-7 py-6">
      <div className="relative grid size-44 place-items-center">
        {!reduceMotion &&
          [0, 1, 2].map((ring) => (
            <span
              key={ring}
              aria-hidden
              className="bg-app-expense voice-ring absolute inset-4 rounded-full opacity-0"
              style={
                {
                  "--ring-scale": isSpeaking ? 1.45 : 1.25,
                  "--ring-opacity": isSpeaking ? 0.32 : 0.2,
                  "--ring-duration": isSpeaking ? "1.3s" : "2.4s",
                  "--ring-delay": `${ring * (isSpeaking ? 0.43 : 0.8)}s`,
                } as React.CSSProperties
              }
            />
          ))}
        <motion.span
          aria-hidden
          className="bg-app-expense text-app-surface relative grid size-24 place-items-center rounded-full shadow-[var(--shadow-fab)]"
          animate={isSpeaking && !reduceMotion ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={{ duration: 0.7, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }}
        >
          <Mic className="size-10" strokeWidth={2} />
        </motion.span>
      </div>

      <div aria-hidden className="flex h-12 items-center gap-1.5">
        {BAR_PEAKS.map((peak, index) => (
          <motion.span
            key={index}
            className={cn("w-1.5 rounded-full", isSpeaking ? "bg-app-expense" : "bg-app-fill-strong")}
            animate={
              isSpeaking && !reduceMotion
                ? { height: [8, peak, 12, peak * 0.7, 8] }
                : { height: isReady && !reduceMotion ? [6, 10, 6] : 6 }
            }
            transition={{
              duration: isSpeaking ? 0.9 + (index % 3) * 0.15 : 1.6,
              repeat: Infinity,
              delay: index * 0.08,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="flex min-h-[112px] w-full flex-col items-center gap-2 text-center">
        <p role="status" aria-live="polite" className="text-app-muted m-0 text-sm font-semibold">
          {label}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          {transcript ? (
            <motion.p
              key="transcript"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display text-app-fg m-0 max-w-sm text-[26px] leading-tight font-bold tracking-[-0.02em]"
            >
              {transcript}
            </motion.p>
          ) : (
            <motion.p
              key={EXAMPLES[exampleIndex]}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="font-display text-app-muted/60 m-0 text-[22px] leading-tight font-bold tracking-[-0.02em]"
            >
              «{EXAMPLES[exampleIndex]}»
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function PreviewView({
  transcript,
  draft,
  values,
  currency,
  categories,
  suggested,
  onPickCategory,
  onRetry,
}: {
  transcript: string;
  draft: VoiceDraft;
  values: TransactionFormValues;
  currency: string;
  categories: CategoryLike[];
  suggested: boolean;
  onPickCategory: (categoryId: string) => void;
  onRetry: () => void;
}) {
  const isIncome = values.type === "income";
  const category = categories.find((c) => c.id === draft.categoryId);

  return (
    <motion.div {...VIEW_MOTION} className="flex flex-col gap-5 pt-5 pb-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-app-muted m-0 text-sm leading-snug">
          <span aria-hidden>“</span>
          {transcript}
          <span aria-hidden>”</span>
        </p>
        <button
          type="button"
          onClick={onRetry}
          aria-label="Volver a dictar"
          className="bg-app-fill hover:bg-app-fill-strong text-app-fg grid size-9 shrink-0 place-items-center rounded-full transition-colors"
        >
          <Mic className="size-4" strokeWidth={2} />
        </button>
      </div>

      <div className="bg-app-surface rounded-3xl p-5 ring-1 ring-[var(--app-border)]">
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            isIncome ? "bg-app-income-soft text-app-income" : "bg-app-expense-soft text-app-expense",
          )}
        >
          {isIncome ? "Ingreso" : "Gasto"}
        </span>

        {draft.amount ? (
          <p className="font-display text-app-fg m-0 mt-3 flex items-baseline gap-1.5 text-[44px] leading-none font-bold tracking-[-0.04em] tabular-nums">
            <span className="text-app-muted text-xl font-semibold">
              {isIncome ? "+" : "−"} {currency}
            </span>
            {formatNumber(draft.amount)}
          </p>
        ) : (
          <p className="text-app-expense m-0 mt-3 text-sm font-semibold">
            No escuché el monto · toca Editar para escribirlo
          </p>
        )}

        <dl className="m-0 mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-app-muted">Categoría</dt>
          <dd className="text-app-fg m-0 flex items-center gap-1.5 font-semibold">
            {category ? (
              <>
                <CategoryEmoji category={category} className="size-6 rounded-full text-[13px]" />
                {category.name}
                {suggested && <Sparkles aria-label="Sugerida por IA" className="size-3.5" strokeWidth={2.2} />}
              </>
            ) : (
              <span className="text-app-expense">Elige una abajo</span>
            )}
          </dd>
          <dt className="text-app-muted">Fecha</dt>
          <dd className="text-app-fg m-0 font-semibold">{dayLabel(draft.transactionDate)}</dd>
          <dt className="text-app-muted">Descripción</dt>
          <dd className="text-app-fg m-0 font-semibold">{values.description}</dd>
        </dl>
      </div>

      <div
        role="group"
        aria-label="Cambiar categoría"
        className="scroll-clean -mx-[22px] flex gap-2 overflow-x-auto px-[22px] sm:-mx-7 sm:px-7"
      >
        {categories.map((option) => {
          const active = option.id === draft.categoryId;
          return (
            <motion.button
              key={option.id}
              type="button"
              aria-pressed={active}
              whileTap={{ scale: 0.94 }}
              transition={SPRING_PRESS}
              onClick={() => onPickCategory(option.id)}
              className={cn(
                "relative flex min-h-10 shrink-0 items-center gap-2 rounded-full py-0 pr-3.5 pl-1.5 text-[13px] font-semibold transition-colors",
                active ? "text-app-surface" : "bg-app-fill text-app-fg hover:bg-app-fill-strong",
              )}
            >
              {active && (
                <motion.span
                  layoutId="voice-category-pill"
                  transition={SPRING_LAYOUT}
                  className="bg-app-fg absolute inset-0 rounded-full"
                />
              )}
              <CategoryEmoji category={option} className="relative size-7 rounded-full text-[14px]" />
              <span className="relative">{option.name}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function ErrorView({ error }: { error: SpeechError }) {
  const copy = ERROR_COPY[error];
  const Icon = error === "network" ? WifiOff : MicOff;

  return (
    <motion.div {...VIEW_MOTION} className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <motion.span
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRING_PRESS}
        className="bg-app-expense-soft text-app-expense grid size-20 place-items-center rounded-full"
      >
        <Icon className="size-8" strokeWidth={2} />
      </motion.span>
      <h3 className="font-display text-app-fg m-0 text-2xl font-bold tracking-[-0.02em]">{copy.title}</h3>
      <p role="alert" className="text-app-muted m-0 max-w-sm text-sm leading-relaxed">
        {copy.body}
      </p>
    </motion.div>
  );
}
