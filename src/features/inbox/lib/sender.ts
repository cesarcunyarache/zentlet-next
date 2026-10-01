import type { SenderRule, SenderVerdict } from "../types";
import { knownBankFor, senderDomain } from "./banks";

const ADDRESS = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const AUTO_BLOCK_DISMISSALS = 3;

export function normalizeAddress(value: string) {
  return ADDRESS.exec(value)?.[0].toLowerCase() ?? "";
}

export function normalizeSenderPattern(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (/^@?[\w-]+(?:\.[\w-]+)+$/.test(trimmed) && !trimmed.includes("@", 1)) {
    return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  }
  return normalizeAddress(trimmed);
}

export function ruleMatches(rule: Pick<SenderRule, "address">, address: string) {
  if (rule.address.startsWith("@")) {
    const domain = senderDomain(address);
    const pattern = rule.address.slice(1);
    return domain === pattern || domain.endsWith(`.${pattern}`);
  }
  return rule.address === address;
}

export function findSenderRule<T extends Pick<SenderRule, "address">>(rules: T[], address: string) {
  return rules.find((rule) => rule.address === address) ?? rules.find((rule) => ruleMatches(rule, address)) ?? null;
}

export function senderVerdict(address: string, rules: SenderRule[]): SenderVerdict {
  const rule = findSenderRule(rules, address);
  if (rule?.status === "blocked") return "blocked";
  if (knownBankFor(address)) return "known";
  return rule && isTrustedRule(rule) ? "trusted" : "unknown";
}

export function isTrustedRule(rule: Pick<SenderRule, "status" | "origin" | "acceptedCount">) {
  return rule.status === "trusted" && (rule.origin === "manual" || rule.acceptedCount > 0);
}

export function shouldAutoBlock(address: string, rule: Pick<SenderRule, "origin" | "acceptedCount" | "dismissedCount">) {
  if (knownBankFor(address) || rule.origin === "manual") return false;
  return rule.acceptedCount === 0 && rule.dismissedCount >= AUTO_BLOCK_DISMISSALS;
}
