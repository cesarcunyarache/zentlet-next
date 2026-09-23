import { TextReveal } from "@/core/components/ui/text-reveal";

/** Frase que se ilumina palabra a palabra mientras bajas. */
export function ManifestoSection({ text }: { text: string }) {
  return (
    <section className="relative">
      {/* TextReveal duplica cada palabra para el efecto: se lee sólo esta */}
      <p className="sr-only">{text}</p>
      <div aria-hidden>
        <TextReveal className="font-display h-[160vh] tracking-[-0.03em] md:h-[200vh]">{text}</TextReveal>
      </div>
    </section>
  );
}
