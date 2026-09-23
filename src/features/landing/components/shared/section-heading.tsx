import { BlurFade } from "@/core/components/ui/blur-fade";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  /** Sobre fondo oscuro (`bg-app-fg`). */
  inverted?: boolean;
  className?: string;
}

/** Antetítulo + título + bajada, con entrada al hacer scroll. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = "center",
  inverted = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-4",
        align === "center" && "mx-auto items-center text-center",
        className,
      )}
    >
      <BlurFade inView direction="up" offset={12}>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
            inverted ? "bg-app-bg/10 text-app-bg/80" : "bg-app-fill text-app-muted",
          )}
        >
          <span aria-hidden className="bg-app-expense size-1.5 rounded-full" />
          {eyebrow}
        </span>
      </BlurFade>
      <BlurFade inView direction="up" offset={16} delay={0.08}>
        <h2
          id={id}
          className={cn(
            "font-display m-0 text-4xl leading-[1.05] font-bold tracking-[-0.04em] text-balance md:text-5xl",
            inverted ? "text-app-bg" : "text-app-fg",
          )}
        >
          {title}
        </h2>
      </BlurFade>
      {subtitle && (
        <BlurFade inView direction="up" offset={16} delay={0.16}>
          <p
            className={cn(
              "m-0 text-lg leading-relaxed text-pretty",
              inverted ? "text-app-bg/70" : "text-app-muted",
            )}
          >
            {subtitle}
          </p>
        </BlurFade>
      )}
    </div>
  );
}
