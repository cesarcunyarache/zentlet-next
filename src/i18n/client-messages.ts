import type { Messages } from "next-intl";

/** Todos los módulos menos `landing`, que recibe su copy por props desde el servidor. */
export function clientMessages(messages: Messages) {
  return Object.fromEntries(Object.entries(messages).filter(([namespace]) => namespace !== "landing"));
}
