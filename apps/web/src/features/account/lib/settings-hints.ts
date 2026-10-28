import { toISODate } from "@/lib/dates";

interface HintMessage<Key extends string> {
  key: Key;
  values?: { count: number };
}

type ConnectionHintKey = "syncing" | "synced" | "pending" | "noPending";
type ExportHintKey = "exportOffline" | "exportFailed" | "count";
type SignOutHintKey = "offline" | "confirm" | "hint";

interface ConnectionState {
  isOnline: boolean;
  pendingCount: number;
  syncingCount: number;
}

interface ExportState {
  isOnline: boolean;
  hasFailed: boolean;
  transactionCount: number;
}

interface SignOutState {
  isOnline: boolean;
  isConfirming: boolean;
  pendingCount: number;
}

const EXPORT_FILE_PREFIX = "zentlet";
const EXPORT_FILE_EXTENSION = "xlsx";

export function connectionHint({
  isOnline,
  pendingCount,
  syncingCount,
}: ConnectionState): HintMessage<ConnectionHintKey> {
  if (isOnline) {
    return syncingCount > 0 ? { key: "syncing", values: { count: syncingCount } } : { key: "synced" };
  }
  return pendingCount > 0 ? { key: "pending", values: { count: pendingCount } } : { key: "noPending" };
}

export function exportHint({ isOnline, hasFailed, transactionCount }: ExportState): HintMessage<ExportHintKey> {
  if (!isOnline) return { key: "exportOffline" };
  if (hasFailed) return { key: "exportFailed" };
  return { key: "count", values: { count: transactionCount } };
}

export function signOutHint({ isOnline, isConfirming, pendingCount }: SignOutState): HintMessage<SignOutHintKey> {
  if (!isOnline) return { key: "offline" };
  if (isConfirming) return { key: "confirm", values: { count: pendingCount } };
  return { key: "hint" };
}

export function needsSignOutConfirmation(pendingCount: number, isConfirming: boolean) {
  return pendingCount > 0 && !isConfirming;
}

export function exportFileName(date: Date) {
  return `${EXPORT_FILE_PREFIX}-${toISODate(date)}.${EXPORT_FILE_EXTENSION}`;
}
