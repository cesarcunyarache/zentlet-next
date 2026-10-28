"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AUTH_SHIFT, directionTo } from "@/core/components/auth-transition";
import { EASE_OUT } from "@/lib/ease";

/*
 * A diferencia del layout, el template se vuelve a montar en cada
 * navegación: sólo el formulario entra animado; la escena se queda
 * quieta. Registro llega desde la derecha y login desde la izquierda.
 */
export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const direction = directionTo(pathname);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: AUTH_SHIFT * direction }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex w-full justify-center"
    >
      {children}
    </motion.div>
  );
}
