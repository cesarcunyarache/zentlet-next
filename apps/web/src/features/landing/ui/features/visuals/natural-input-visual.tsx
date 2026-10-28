import { Marquee } from "@/core/components/ui/marquee";
import { splitInHalf } from "../../../lib/visuals";

export function NaturalInputVisual({ phrases }: { phrases: string[] }) {
  const [firstHalf, secondHalf] = splitInHalf(phrases);
  const rows = [phrases, [...secondHalf, ...firstHalf]];

  return (
    <div
      aria-hidden
      className="relative flex h-full flex-col justify-center gap-1 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
    >
      {rows.map((row, index) => (
        <Marquee key={index} reverse={index === 1} pauseOnHover className="[--duration:28s] [--gap:0.75rem]">
          {row.map((phrase) => (
            <span
              key={phrase}
              className="bg-app-bg text-app-fg flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium ring-1 ring-[var(--app-border)]"
            >
              <span className="text-app-muted">“</span>
              {phrase}
              <span className="text-app-muted">”</span>
            </span>
          ))}
        </Marquee>
      ))}
    </div>
  );
}
