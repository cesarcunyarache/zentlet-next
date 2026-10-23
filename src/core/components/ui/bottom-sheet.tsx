"use client";

import { useEffect, type ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@heroui/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { showStatusBarScrim } from "@/core/theme/theme";

interface BottomSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideTitle?: boolean;
  bodyClassName?: string;
}

/**
 * Variante de `Sheet` sobre vaul: al abrirse, la página de detrás se encoge
 * y se redondea como las hojas de iOS. Requiere el `[vaul-drawer-wrapper]`
 * del layout raíz.
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
}: BottomSheetProps) {
  const t = useTranslations("common.actions");

  useEffect(() => {
    if (!isOpen) return;
    return showStatusBarScrim();
  }, [isOpen]);

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[var(--app-scrim)]" />
        <Drawer.Content
          aria-describedby={undefined}
          className={cn(
            "[--sheet-visible-height:calc(var(--visual-viewport-height,100dvh)_-_env(safe-area-inset-top)_-_8px)]",
            "bg-app-bg fixed inset-x-0 bottom-0 z-50 mx-auto flex min-h-[min(85dvh,var(--sheet-visible-height))] max-h-[min(90dvh,var(--sheet-visible-height))] w-full flex-col outline-none",
            "rounded-t-[34px] shadow-[var(--shadow-sheet)]",
            "sm:max-w-[520px]",
            className,
          )}
        >
          <div className="grid shrink-0 place-items-center pt-[9px] pb-[3px]">
            <Drawer.Handle className="!bg-app-border !h-[5px] !w-[38px] !opacity-100" />
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
            className={cn(
              "scroll-clean min-h-0 flex-1 overflow-y-auto px-[22px] pt-2.5 sm:px-7",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 px-[22px] pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] sm:px-7 sm:pb-6">
              {footer}
            </div>
          ) : (
            <div className="h-[calc(16px+env(safe-area-inset-bottom))] shrink-0 sm:h-6" />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
