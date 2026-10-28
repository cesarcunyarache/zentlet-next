import { createContext } from "react";
import type { CurrencyCode } from "./currency";

export const AccountCurrencyContext = createContext<CurrencyCode | null>(null);
