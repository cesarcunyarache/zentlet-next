import { BrandMark } from "@/core/components/brand-mark";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display inline-flex items-center gap-2 text-2xl font-bold tracking-[-0.03em]", className)}>
      <BrandMark className="size-[1.25em]" />
      Zentlet
    </span>
  );
}
