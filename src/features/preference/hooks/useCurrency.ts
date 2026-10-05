"use client";

import { useCallback, useContext, useSyncExternalStore } from "react";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { AccountCurrencyContext } from "../lib/account-currency-context";
import { DEFAULT_CURRENCY, currencySymbol, type CurrencyCode } from "../lib/currency";
import { changeCurrency, getDeviceCurrency, subscribeDeviceCurrency } from "../lib/device-currency";

const getServerSnapshot = () => null;

export function useCurrency() {
  const { userId } = useOfflineSession();
  const accountCurrency = useContext(AccountCurrencyContext);
  const getSnapshot = useCallback(() => getDeviceCurrency(userId), [userId]);
  const deviceCurrency = useSyncExternalStore(subscribeDeviceCurrency, getSnapshot, getServerSnapshot);
  const currencyCode = deviceCurrency ?? accountCurrency ?? DEFAULT_CURRENCY;

  const setCurrency = useCallback((next: CurrencyCode) => changeCurrency(userId, next), [userId]);

  return { currency: currencySymbol(currencyCode), currencyCode, setCurrency };
}
