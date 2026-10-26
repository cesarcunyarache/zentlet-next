"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { Drawer } from "vaul";
import { cn } from "@heroui/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBodyScrollLock } from "@/core/hooks/useBodyScrollLock";
import { isKeyboardOpen, useVisualViewportHeight } from "@/core/hooks/useVisualViewportHeight";
import { showStatusBarScrim } from "@/core/theme/theme";
import type { SheetProps } from "./sheet-props";

/**
 * Los diálogos anidados viven en un portal, pero sus eventos suben por el
 * árbol de React hasta el arrastre de vaul: un roce sobre ellos movía la hoja.
 */
function stopPortalPointer(event: PointerEvent<HTMLDivElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation();
}

/**
 * Hoja sobre vaul. La página de detrás no se encoge: en la PWA de iOS la
 * barra de estado queda fuera de la página y no puede encogerse con ella.
 *
 * El teclado lo resuelve esta hoja y no vaul, que no tiene en cuenta el
 * desplazamiento de iOS al enfocar un campo y dejaba la hoja fuera de pantalla.
 * La hoja se ancla por arriba al borde inferior de la zona visible, que es lo
 * único que iOS informa bien con el teclado abierto.
 *
 * Va sin `modal` a propósito: el modo modal de Radix atrapa el foco y anula
 * los clics fuera de la hoja, y los popovers y diálogos de HeroUI que se
 * abren desde dentro viven en otro portal. El fondo oscuro y el cierre al
 * tocarlo los pone esta hoja.
 */
export function BottomSheet({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  className,
  hideTitle = false,
  bodyClassName,
}: SheetProps) {
  const t = useTranslations("common.actions");
  const contentRef = useRef<HTMLDivElement>(null);
  const viewport = useVisualViewportHeight(isOpen);
  const viewportStyle =
    viewport === null
      ? undefined
      : ({
          "--visual-viewport-height": `${viewport.height}px`,
          // con el teclado fuera, la barra de inicio queda tapada y no hace falta dejarle sitio
          ...(isKeyboardOpen(viewport) && { "--sheet-bottom-inset": "0px" }),
          top: `calc(${viewport.offsetTop + viewport.height}px - var(--sheet-height))`,
          bottom: "auto",
        } as CSSProperties);

  useBodyScrollLock(isOpen);

  // `autoFocus` enfoca con la hoja aún fuera de pantalla por la animación y
  // iOS desplaza toda la vista para mostrar el campo. Se enfoca en el mismo
  // gesto para que salga el teclado, pero sin ese desplazamiento.
  useLayoutEffect(() => {
    if (!isOpen) return;
    contentRef.current?.querySelector<HTMLElement>("[data-sheet-autofocus]")?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    return showStatusBarScrim();
  }, [isOpen]);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={onOpenChange}
      modal={false}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <div
          aria-hidden
          data-state={isOpen ? "open" : "closed"}
          onClick={() => onOpenChange(false)}
          className={cn(
            "fixed inset-0 z-50 touch-none bg-(--app-scrim)",
            "data-[state=open]:animate-[fadeIn_0.5s_cubic-bezier(0.32,0.72,0,1)]",
            "data-[state=closed]:animate-[fadeOut_0.5s_cubic-bezier(0.32,0.72,0,1)_forwards]",
          )}
        />
        <Drawer.Content
          ref={contentRef}
          aria-describedby={undefined}
          style={viewportStyle}
          // Escape dentro de un diálogo anidado lo cierra a él, no a la hoja
          onEscapeKeyDown={(event) => {
            if (!contentRef.current?.contains(document.activeElement)) event.preventDefault();
          }}
          className={cn(
            "[--sheet-visible-height:calc(var(--visual-viewport-height,100dvh)_-_env(safe-area-inset-top)_-_8px)]",
            "[--sheet-height:min(95dvh,var(--sheet-visible-height))]",
            "bg-app-bg fixed inset-x-0 bottom-0 z-50 mx-auto flex h-(--sheet-height) w-full flex-col outline-none",
            "rounded-t-[34px] shadow-[var(--shadow-sheet)]",
            "sm:max-w-[520px]",
            className,
          )}
        >
          <div className="grid shrink-0 place-items-center pt-[9px] pb-[3px]">
            <Drawer.Handle className="bg-app-border! h-[5px]! w-[38px]! opacity-100!" />
          </div>

          <div className="flex shrink-0 items-center justify-between pt-0.5 pr-3.5 pl-[22px] sm:pr-4 sm:pl-7">
            <Drawer.Title
              className={cn(
                "font-display text-app-fg text-[17px] font-bold tracking-[-0.01em] sm:text-xl",
                hideTitle && "sr-only",
              )}
            >
              {title}
            </Drawer.Title>
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => onOpenChange(false)}
              className="text-app-muted bg-app-fill hover:bg-app-fill-strong hover:text-app-fg ml-auto grid size-10 place-items-center rounded-full transition-colors"
            >
              <X className="size-5" strokeWidth={1.9} />
            </button>
          </div>

          <div
            data-slot="drawer-body"
            onPointerDown={stopPortalPointer}
            className={cn(
              "scroll-clean min-h-0 flex-1 overflow-y-auto overscroll-contain px-[22px] pt-2.5 sm:px-7",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div
              onPointerDown={stopPortalPointer}
              className="shrink-0 px-[22px] pt-3 pb-[max(12px,var(--sheet-bottom-inset,env(safe-area-inset-bottom)))] sm:px-7 sm:pb-6"
            >
              {footer}
            </div>
          ) : (
            <div className="h-[max(12px,var(--sheet-bottom-inset,env(safe-area-inset-bottom)))] shrink-0 sm:h-6" />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
