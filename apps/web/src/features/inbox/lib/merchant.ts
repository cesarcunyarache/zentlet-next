import { fold } from "@/features/transaction/lib/parse-description";

const MIN_TOKEN_LENGTH = 2;

export function merchantKey(value: string | null | undefined) {
  if (!value) return null;
  const tokens = fold(value)
    .split(/[^a-z0-9ñ]+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !/\d/.test(token));
  return tokens.length ? tokens.join(" ") : null;
}
