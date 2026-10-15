import { normalize } from "@/features/transaction/lib/parse-description";

export type Command =
  | { kind: "link"; code: string }
  | { kind: "unlink" }
  | { kind: "cancel" }
  | { kind: "undo" }
  | { kind: "help" };

const LINK_COMMAND = /^(?:vincular|conectar|link|connect)\s+([a-z0-9-]{4,20})$/;

const KEYWORDS: Record<Exclude<Command["kind"], "link">, string[]> = {
  unlink: ["desvincular", "desconectar", "unlink", "disconnect"],
  cancel: ["cancelar", "cancela", "olvidalo", "cancel", "nevermind"],
  undo: ["deshacer", "deshaz", "borra eso", "borralo", "undo"],
  help: ["ayuda", "help", "menu", "?"],
};

export function parseCommand(text: string): Command | null {
  const clean = normalize(text).replace(/[!.¡¿]/g, "").trim();
  const link = LINK_COMMAND.exec(clean);
  if (link) return { kind: "link", code: link[1] };
  for (const [kind, words] of Object.entries(KEYWORDS)) {
    if (words.includes(clean)) return { kind } as Command;
  }
  return null;
}
