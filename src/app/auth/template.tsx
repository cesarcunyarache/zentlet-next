"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AUTH_SHIFT } from "@/core/components/auth-transition";
import { EASE_OUT } from "@/lib/ease";

/*
 * A diferencia del layout, el template se vuelve a montar en cada
 * navegación: sólo el formulario entra animado; la escena se queda
 * quieta. Registro llega desde la derecha y login desde la izquierda.
 */
export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const direction = pathname.endsWith("/sign-up") ? 1 : -1;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: AUTH_SHIFT * direction, filter: "blur(2px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="flex w-full justify-center"
    >
      {children}
    </motion.div>
  );
}
