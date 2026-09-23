"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useAnimate, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/ease";

/*
 * Salida animada entre login y registro. El App Router desmonta la página
 * vieja al instante, así que un `exit` de Motion nunca se vería: el enlace
 * primero anima la salida del formulario y después navega (sin recargar).
 * La entrada de la página nueva la hace app/auth/template.tsx.
 *
 * Registro es más alto que login: el alto del contenedor sigue al del
 * contenido con un resorte suave para que la tarjeta no salte de tamaño.
 */

/** Desplazamiento de las transiciones, compartido con el template. */
export const AUTH_SHIFT = 12;

const HEIGHT_SPRING = { type: "spring", stiffness: 170, damping: 26, mass: 0.9 } as const;

const SIGN_UP = "/auth/sign-up";

/** Registro va "hacia la derecha": sale por la izquierda y entra por la derecha. */
function directionTo(href: string) {
  return href.endsWith(SIGN_UP) ? 1 : -1;
}

type Leave = (href: string) => Promise<void>;

const AuthTransitionContext = createContext<Leave | null>(null);

export function AuthTransition({ children }: { children: React.ReactNode }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // al llegar la página nueva, el contenedor vuelve a estar visible (la
  // entrada propia la anima el template)
  useLayoutEffect(() => {
    if (scope.current) animate(scope.current, { opacity: 1, x: 0, filter: "blur(0px)" }, { duration: 0 });
  }, [pathname, animate, scope]);

  async function leave(href: string) {
    if (reduceMotion || !scope.current) return;
    await animate(
      scope.current,
      { opacity: 0, x: -AUTH_SHIFT * directionTo(href), filter: "blur(2px)" },
      { duration: 0.2, ease: EASE_OUT },
    );
  }

  return (
    <AuthTransitionContext.Provider value={leave}>
      <motion.div
        initial={false}
        animate={{ height }}
        transition={reduceMotion ? { duration: 0 } : HEIGHT_SPRING}
        className="w-full"
      >
        <div ref={contentRef}>
          <div ref={scope} className="flex w-full justify-center">
            {children}
          </div>
        </div>
      </motion.div>
    </AuthTransitionContext.Provider>
  );
}

/** Enlace entre pantallas de acceso: sale animado y luego navega. */
export function AuthLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const leave = useContext(AuthTransitionContext);
  const router = useRouter();

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // abrir en otra pestaña, etc.: comportamiento normal del navegador
    if (!leave || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    await leave(href);
    router.replace(href, { scroll: false });
  }

  return (
    <Link href={href} replace scroll={false} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
