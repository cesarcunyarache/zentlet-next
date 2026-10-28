import { useEffect, useEffectEvent } from "react";
import { track } from "@/lib/observability/client";
import { GMAIL_CONNECT_RESULTS, GMAIL_RESULT_PARAM, type GmailConnectResult } from "../types";

function isConnectResult(value: string | null): value is GmailConnectResult {
  return GMAIL_CONNECT_RESULTS.includes(value as GmailConnectResult);
}

function takeResultFromUrl() {
  const url = new URL(window.location.href);
  const result = url.searchParams.get(GMAIL_RESULT_PARAM);
  if (!isConnectResult(result)) return null;
  url.searchParams.delete(GMAIL_RESULT_PARAM);
  window.history.replaceState(window.history.state, "", url);
  return result;
}

export function useGmailConnectResult(onResult: (result: GmailConnectResult) => void) {
  const notify = useEffectEvent(onResult);

  useEffect(() => {
    const result = takeResultFromUrl();
    if (!result) return;
    track("inbox_gmail_result", { outcome: result });
    notify(result);
  }, []);
}
