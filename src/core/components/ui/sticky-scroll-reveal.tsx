"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * Aceternity · Sticky Scroll Reveal, adaptado para que avance con el scroll
 * de la página (el original usa un contenedor con scroll propio, que atrapa
 * la rueda del ratón). Los textos van a la izquierda; la vista previa queda
 * fija a la derecha y cambia según el paso activo.
 */

export interface StickyScrollItem {
  title: string;
  description: string;
  content: React.ReactNode;
}

interface StickyScrollProps {
  content: StickyScrollItem[];
  className?: string;
  contentClassName?: string;
}

export function StickyScroll({ content, className, contentClassName }: StickyScrollProps) {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const index = Math.min(content.length - 1, Math.max(0, Math.floor(latest * content.length)));
    setActiveCard(index);
  });

  return (
    <div ref={ref} className={cn("relative flex justify-center gap-10 lg:gap-20", className)}>
      <ol className="m-0 flex max-w-xl list-none flex-col p-0">
        {content.map((item, index) => (
          <li key={item.title} className="flex min-h-[55vh] flex-col justify-center py-10 lg:min-h-[70vh]">
            <motion.div
              animate={{ opacity: activeCard === index ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            >
              <span className="num text-app-muted text-sm font-semibold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-app-fg mt-3 text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                {item.title}
              </h3>
              <p className="text-app-muted mt-4 max-w-sm text-lg leading-relaxed">{item.description}</p>
            </motion.div>

            {/* en móvil la vista previa acompaña a cada paso */}
            <div className="mt-8 lg:hidden">{item.content}</div>
          </li>
        ))}
      </ol>

      <div className="hidden lg:block">
        <div
          className={cn(
            "sticky top-[calc(50vh-11rem)] h-88 w-104 overflow-hidden rounded-[28px]",
            contentClassName,
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCard}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full"
            >
              {content[activeCard]?.content}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
