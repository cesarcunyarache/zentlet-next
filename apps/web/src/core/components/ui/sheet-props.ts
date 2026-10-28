import type { ReactNode } from "react";

export interface SheetProps {
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
