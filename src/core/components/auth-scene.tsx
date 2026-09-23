"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";
import { AuthTransition } from "@/core/components/auth-transition";
import { cn } from "@heroui/react";
import { CategoryEmoji } from "@/features/transaction/components/category-emoji";
import { formatNumber } from "@/features/transaction/lib/format";
import { SPRING_MOUSE } from "@/lib/ease";

/*
 * Escena de las pantallas de acceso: una tarjeta partida que se inclina
 * siguiendo al puntero. A la izquierda, piezas de la propia app (balance,
 * movimientos, gasto por categoría) flotando a distintas profundidades;
 * a la derecha, el formulario tal cual.
 *
 * En móvil no hay tarjeta: la pantalla entera es la app, con una banda de
 * marca arriba y el formulario debajo (la inclinación no existe en táctil).
 */

const SLIDES = [
  {
    title: "Cada gasto, en su lugar",
    body: "Registra un movimiento en segundos y míralo sumarse al mes.",
  },
  {
    title: "Tu balance, de un vistazo",
    body: "Ingresos y gastos del periodo en una sola cifra.",
  },
  {
    title: "Categorías que se entienden",
    body: "Descubre en qué se va tu dinero sin abrir una hoja de cálculo.",
  },
];

const MOVEMENTS = [
  { id: "m", name: "Mercado", icon: "🛒", color: "oklch(0.93 0.06 75)", amount: -84.3 },
  { id: "a", name: "Alquiler", icon: "🏠", color: "oklch(0.92 0.05 300)", amount: -650 },
  { id: "n", name: "Nómina", icon: "💼", color: "oklch(0.93 0.06 150)", amount: 1920 },
];

const BARS = [
  { icon: "🏠", color: "oklch(0.72 0.12 300)", value: 88 },
  { icon: "🛒", color: "oklch(0.78 0.13 75)", value: 46 },
  { icon: "🚌", color: "oklch(0.74 0.11 230)", value: 28 },
];

/** Confeti del fondo: color, posición y cuánto se desplaza con el puntero. */
const PETALS = [
  { className: "top-[9%] left-[14%] size-4 rounded-full", color: "var(--app-expense)", depth: 18 },
  { className: "top-[14%] right-[12%] h-5 w-9 -rotate-[24deg] rounded-full", color: "var(--app-expense)", depth: 30 },
  { className: "bottom-[12%] left-[9%] h-3 w-6 rotate-[35deg] rounded-full", color: "var(--app-income)", depth: 24 },
  { className: "top-[48%] right-[5%] size-3 rounded-full", color: "oklch(0.62 0.16 265)", depth: 14 },
  { className: "bottom-[8%] right-[22%] h-4 w-7 rotate-[12deg] rounded-full", color: "oklch(0.82 0.14 85)", depth: 36 },
  { className: "top-[30%] left-[4%] size-2.5 rounded-full", color: "oklch(0.82 0.14 85)", depth: 12 },
];

export function AuthScene({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  // posición del puntero normalizada a [-0.5, 0.5] respecto a la ventana
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, SPRING_MOUSE);
  const y = useSpring(pointerY, SPRING_MOUSE);

  const rotateY = useTransform(x, [-0.5, 0.5], [-7, 7]);
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);

  // brillo que sigue al puntero sobre el panel oscuro
  const glareX = useTransform(x, [-0.5, 0.5], [10, 90]);
  const glareY = useTransform(y, [-0.5, 0.5], [10, 90]);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX}% ${glareY}%, color-mix(in oklch, var(--app-surface) 16%, transparent), transparent 70%)`;

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    // en móvil la escena es plana: sin tarjeta que inclinar
    if (reduceMotion || event.pointerType !== "mouse" || window.innerWidth < 640) return;
    pointerX.set(event.clientX / window.innerWidth - 0.5);
    pointerY.set(event.clientY / window.innerHeight - 0.5);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="bg-app-surface sm:bg-app-bg text-app-fg relative flex min-h-svh justify-center overflow-hidden sm:items-center sm:p-6 md:p-10"
    >
      {/* halo suave detrás de la tarjeta para despegarla del fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 hidden size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--app-fg)_6%,transparent)] blur-3xl sm:block"
      />

      {PETALS.map((petal, index) => (
        <Parallax
          key={index}
          x={x}
          y={y}
          depth={-petal.depth}
          className={cn("pointer-events-none absolute hidden opacity-80 sm:block", petal.className)}
          style={{ background: petal.color }}
        />
      ))}

      <div className="relative w-full max-w-5xl [perspective:1600px]">
        <motion.div
          style={{ rotateX, rotateY }}
          className="bg-app-surface grid min-h-svh overflow-hidden sm:min-h-0 sm:rounded-[28px] sm:shadow-[0_40px_80px_-32px_color-mix(in_oklch,var(--app-fg)_38%,transparent),0_2px_6px_color-mix(in_oklch,var(--app-fg)_6%,transparent)] lg:min-h-[680px] lg:grid-cols-[1.05fr_1fr]"
        >
          <Showcase x={x} y={y} glare={glare} />

          <div className="flex flex-col">
            <MobileBrand />
            <div className="flex flex-1 items-start justify-center px-6 pt-8 pb-10 sm:items-center sm:px-10 md:py-14">
              <AuthTransition>{children}</AuthTransition>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Parallax({
  x,
  y,
  depth,
  className,
  style,
  children,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  /** Píxeles que se desplaza en el extremo; negativo = contra el puntero. */
  depth: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const translateX = useTransform(x, [-0.5, 0.5], [-depth, depth]);
  const translateY = useTransform(y, [-0.5, 0.5], [-depth, depth]);

  return (
    <motion.div aria-hidden style={{ x: translateX, y: translateY, ...style }} className={className}>
      {children}
    </motion.div>
  );
}

function Showcase({
  x,
  y,
  glare,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  glare: MotionValue<string>;
}) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSlide((value) => (value + 1) % SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const current = SLIDES[slide];

  return (
    <div className="bg-app-fg text-app-bg relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
      <motion.div aria-hidden style={{ background: glare }} className="pointer-events-none absolute inset-0" />

      <Link href="/" className="font-display relative w-fit text-2xl font-bold tracking-[-0.03em]">
        Zentlet<span className="text-app-expense">.</span>
      </Link>

      <div className="relative mx-auto h-[330px] w-full max-w-[380px]">
        {/* balance del mes */}
        <Parallax
          x={x}
          y={y}
          depth={14}
          className="absolute top-2 left-0 w-[220px] -rotate-[5deg]"
        >
          <FloatCard delay={0}>
            <p className="text-app-muted m-0 text-[11px] font-semibold">Balance · este mes</p>
            <p className="font-display text-app-income m-0 mt-0.5 text-[30px] leading-none font-bold tracking-[-0.04em] tabular-nums">
              <span className="text-app-muted mr-1 text-base font-semibold">S/</span>
              {formatNumber(1185.7)}
            </p>
            <div className="mt-3 flex gap-1.5">
              <span className="bg-app-expense-soft text-app-expense num rounded-full px-2 py-0.5 text-[11px] font-semibold">
                −{formatNumber(734.3)}
              </span>
              <span className="bg-app-income-soft text-app-income num rounded-full px-2 py-0.5 text-[11px] font-semibold">
                +{formatNumber(1920)}
              </span>
            </div>
          </FloatCard>
        </Parallax>

        {/* últimos movimientos */}
        <Parallax
          x={x}
          y={y}
          depth={26}
          className="absolute right-0 bottom-4 w-[236px] rotate-[4deg]"
        >
          <FloatCard delay={0.8}>
            <p className="text-app-muted m-0 mb-2 text-[11px] font-semibold">Movimientos</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {MOVEMENTS.map((movement) => (
                <li key={movement.id} className="flex items-center gap-2.5">
                  <CategoryEmoji category={movement} className="size-8 rounded-xl text-base" />
                  <span className="flex-1 text-[13px] font-semibold">{movement.name}</span>
                  <span
                    className={cn(
                      "num text-[12px] font-semibold",
                      movement.amount < 0 ? "text-app-fg" : "text-app-income",
                    )}
                  >
                    {movement.amount < 0 ? "−" : "+"}
                    {formatNumber(Math.abs(movement.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </FloatCard>
        </Parallax>

        {/* gasto por categoría */}
        <Parallax
          x={x}
          y={y}
          depth={8}
          className="absolute top-[118px] right-3 w-[150px] rotate-[7deg]"
        >
          <FloatCard delay={1.6} className="p-3">
            <p className="text-app-muted m-0 mb-2 text-[10px] font-semibold">Por categoría</p>
            <div className="flex h-16 items-end gap-2">
              {BARS.map((bar) => (
                <div key={bar.icon} className="flex flex-1 flex-col items-center gap-1">
                  <span className="w-full rounded-md" style={{ height: `${bar.value}%`, background: bar.color }} />
                  <span className="text-[11px] leading-none">{bar.icon}</span>
                </div>
              ))}
            </div>
          </FloatCard>
        </Parallax>

        {/* el botón flotante de la app */}
        <Parallax x={x} y={y} depth={38} className="absolute bottom-0 left-8">
          <span className="bg-app-expense text-app-surface grid size-12 place-items-center rounded-full text-2xl font-light shadow-[var(--shadow-fab)]">
            +
          </span>
        </Parallax>
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-2"
          >
            <h2 className="font-display m-0 text-[26px] leading-tight font-bold tracking-[-0.02em]">
              {current.title}
            </h2>
            <p className="m-0 text-sm text-[color-mix(in_oklch,var(--app-bg)_70%,transparent)]">
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-1.5">
          {SLIDES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Ver mensaje ${index + 1}`}
              aria-current={index === slide}
              onClick={() => setSlide(index)}
              className="grid h-6 place-items-center"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  index === slide
                    ? "bg-app-bg w-5"
                    : "w-1.5 bg-[color-mix(in_oklch,var(--app-bg)_35%,transparent)]",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Cabecera de marca sólo en móvil: sustituye al panel oscuro de escritorio. */
function MobileBrand() {
  return (
    <div className="bg-app-fg text-app-bg relative overflow-hidden rounded-b-[32px] px-6 pt-7 pb-8 sm:rounded-none lg:hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-[color-mix(in_oklch,var(--app-expense)_45%,transparent)] blur-3xl"
      />
      <Link href="/" className="font-display relative text-xl font-bold tracking-[-0.03em]">
        Zentlet<span className="text-app-expense">.</span>
      </Link>

      <div className="relative mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-display m-0 text-[22px] leading-tight font-bold tracking-[-0.02em]">
            {SLIDES[0].title}
          </p>
          <p className="m-0 mt-1 text-sm text-[color-mix(in_oklch,var(--app-bg)_70%,transparent)]">
            {SLIDES[0].body}
          </p>
        </div>
        <FloatCard delay={0} className="shrink-0 -rotate-[4deg] px-3 py-2.5">
          <p className="text-app-muted m-0 text-[10px] font-semibold">Balance</p>
          <p className="font-display text-app-income m-0 text-lg leading-none font-bold tracking-[-0.03em] tabular-nums">
            {formatNumber(1185.7)}
          </p>
        </FloatCard>
      </div>
    </div>
  );
}

/** Tarjeta blanca que flota arriba y abajo, cada una a su ritmo. */
function FloatCard({
  delay,
  className,
  children,
}: {
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
      transition={{ duration: 5, delay, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "bg-app-surface text-app-fg rounded-2xl p-4 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
