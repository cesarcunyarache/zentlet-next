"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { DEFAULT_CURRENCY, currencySymbol, type CurrencyCode } from "../lib/currency";
import { changeCurrency, getDeviceCurrency, subscribeDeviceCurrency } from "../lib/device-currency";

function getServerSnapshot() {
  return null;
}

/**
 * Moneda de la cuenta leída al pintar en el servidor. La hidratación la usa
 * mientras no puede leer el dispositivo, así la primera pintura ya es la
 * correcta en vez de pasar por la de por defecto.
 */
const AccountCurrencyContext = createContext<CurrencyCode | null>(null);

export function AccountCurrencyProvider({
  currency,
  children,
}: {
  currency: CurrencyCode | null;
  children: React.ReactNode;
}) {
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
