"use client";

import type { ReactNode } from "react";
import type { CurrencyCode } from "../lib/currency";
import { AccountCurrencyContext } from "../lib/account-currency-context";

interface AccountCurrencyProviderProps {
  currency: CurrencyCode | null;
  children: ReactNode;
}

export function AccountCurrencyProvider({ currency, children }: AccountCurrencyProviderProps) {
  return <AccountCurrencyContext value={currency}>{children}</AccountCurrencyContext>;
}
