import type { routing } from "./routing";

import type esCommon from "@/locales/es/common.json";
import type esAuth from "@/locales/es/auth.json";
import type esLanding from "@/locales/es/landing.json";
import type esTransactions from "@/locales/es/transactions.json";
import type esCategories from "@/locales/es/categories.json";
import type esSettings from "@/locales/es/settings.json";
import type esOffline from "@/locales/es/offline.json";

import type enCommon from "@/locales/en/common.json";
import type enAuth from "@/locales/en/auth.json";
import type enLanding from "@/locales/en/landing.json";
import type enTransactions from "@/locales/en/transactions.json";
import type enCategories from "@/locales/en/categories.json";
import type enSettings from "@/locales/en/settings.json";
import type enOffline from "@/locales/en/offline.json";

/** El español es la referencia: sus keys son las únicas válidas en `t()`. */
type AppMessages = {
  common: typeof esCommon;
  auth: typeof esAuth;
  landing: typeof esLanding;
  transactions: typeof esTransactions;
  categories: typeof esCategories;
  settings: typeof esSettings;
  offline: typeof esOffline;
};

type EnMessages = {
  common: typeof enCommon;
  auth: typeof enAuth;
  landing: typeof enLanding;
  transactions: typeof enTransactions;
  categories: typeof enCategories;
  settings: typeof enSettings;
  offline: typeof enOffline;
};

/*
 * Cada idioma debe tener exactamente las mismas keys que `es`: una key que
 * falta o sobra rompe `tsc`. Al añadir un idioma, repite este bloque.
 */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type AssertTrue<T extends true> = T;
export type EnMatchesEs = AssertTrue<Same<EnMessages, AppMessages>>;

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: AppMessages;
  }
}
