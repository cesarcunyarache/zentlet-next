import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-2xl font-bold tracking-[-0.03em]", className)}>
      Zentlet<span className="text-app-expense">.</span>
    </span>
  );
}
