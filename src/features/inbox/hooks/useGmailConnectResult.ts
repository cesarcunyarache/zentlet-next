import { useEffect, useRef } from "react";
import { track } from "@/lib/observability/client";
import { GMAIL_CONNECT_RESULTS, type GmailConnectResult } from "../types";

const PARAM = "gmail";

function isResult(value: string | null): value is GmailConnectResult {
  return GMAIL_CONNECT_RESULTS.includes(value as GmailConnectResult);
}

export function useGmailConnectResult(onResult: (result: GmailConnectResult) => void) {
  const handler = useRef(onResult);

  useEffect(() => {
    handler.current = onResult;
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get(PARAM);
    if (!isResult(result)) return;
    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, "", url);
    track("inbox_gmail_result", { outcome: result });
    handler.current(result);
  }, []);
}
