"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { DEFAULT_CURRENCY, currencySymbol, type CurrencyCode } from "../lib/currency";
import { changeCurrency, getDeviceCurrency, subscribeDeviceCurrency } from "../lib/device-currency";

function getServerSnapshot() {
  return null;
}

const AccountCurrencyContext = createContext<CurrencyCode | null>(null);

interface AccountCurrencyProviderProps {
  currency: CurrencyCode | null;
  children: ReactNode;
}

export function AccountCurrencyProvider({ currency, children }: AccountCurrencyProviderProps) {
  return <AccountCurrencyContext value={currency}>{children}</AccountCurrencyContext>;
}

export function useCurrency() {
  const { userId } = useOfflineSession();
  const accountCurrency = useContext(AccountCurrencyContext);
  const getSnapshot = useCallback(() => getDeviceCurrency(userId), [userId]);
  const deviceCurrency = useSyncExternalStore(subscribeDeviceCurrency, getSnapshot, getServerSnapshot);
  const currencyCode = deviceCurrency ?? accountCurrency ?? DEFAULT_CURRENCY;

  const setCurrency = useCallback((next: CurrencyCode) => changeCurrency(userId, next), [userId]);

  return { currency: currencySymbol(currencyCode), currencyCode, setCurrency };
}
