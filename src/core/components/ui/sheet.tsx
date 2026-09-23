"use client";

import type { ReactNode } from "react";
import { Drawer, cn } from "@heroui/react";
import { X } from "lucide-react";

interface SheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** El título sigue ahí para lectores de pantalla, pero no se ve. */
  hideTitle?: boolean;
  /** Clases extra para el cuerpo scrollable. */
  bodyClassName?: string;
}

/**
 * Panel modal de la app: hoja que sube desde abajo en móvil y tarjeta
 * centrada en escritorio. Mantiene el lenguaje visual del diseño —asa,
 * cabecera con título y cierre, cuerpo scrollable, pie fijo— sin atarlo
 * a la forma de un teléfono.
 */
export function Sheet({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  className,
  hideTitle = false,
  bodyClassName,
}: SheetProps) {
  /**
   * Sin `<Drawer>` raíz a propósito: esa raíz es el `DialogTrigger` de
   * react-aria y monta un `PressResponder` que espera un hijo pulsable como
   * disparador. Aquí la apertura es controlada desde fuera, así que el
   * estado vive en el backdrop (`ModalOverlay`), que es su dueño natural.
   */
  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      variant="blur"
      className="bg-[var(--app-scrim)]"
    >
      <Drawer.Content
        placement="bottom"
        className="items-end justify-center sm:items-center"
      >
        <Drawer.Dialog
          className={cn(
            "bg-app-bg flex max-h-[90dvh] w-full flex-col p-0",
            "rounded-t-[34px] shadow-[var(--shadow-sheet)]",
            "sm:max-w-[520px] sm:rounded-[28px]",
            className,
          )}
        >
          <div className="grid shrink-0 place-items-center pt-[9px] pb-[3px] sm:hidden">
            <span
              aria-hidden
              className="bg-app-border h-[5px] w-[38px] rounded-full"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between pt-0.5 pr-3.5 pl-[22px] sm:pt-4 sm:pr-4 sm:pl-7">
            <Drawer.Heading
              className={cn(
                "font-display text-app-fg text-[17px] font-bold tracking-[-0.01em] sm:text-xl",
                hideTitle && "sr-only",
              )}
            >
              {title}
            </Drawer.Heading>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => onOpenChange(false)}
              className="text-app-muted bg-app-fill hover:bg-app-fill-strong hover:text-app-fg ml-auto grid size-10 place-items-center rounded-full transition-colors"
            >
              <X className="size-5" strokeWidth={1.9} />
            </button>
          </div>

          <div
            className={cn(
              "scroll-clean min-h-0 flex-1 overflow-y-auto px-[22px] pt-2.5 sm:px-7",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 px-[22px] pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-7 sm:pb-6">
              {footer}
            </div>
          ) : (
            <div className="h-[calc(14px+env(safe-area-inset-bottom))] shrink-0 sm:h-6" />
          )}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
