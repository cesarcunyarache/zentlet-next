"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { accountService } from "@/features/account/services/account.service";

/*
 * El recorrido de bienvenida se muestra una sola vez por cuenta: sólo a
 * cuentas nuevas (el servidor lo sabe: `onboardingCompletedAt` nulo) y
 * nunca más tras verlo, terminarlo u omitirlo. Se marca en el servidor y,
 * por si eso falla sin conexión, también en el dispositivo; la próxima vez
 * con red se vuelve a intentar.
 */

const doneKey = (userId: string) => `zentlet-onboarding-done:${userId}`;

function isDoneOnDevice(userId: string) {
  try {
    return localStorage.getItem(doneKey(userId)) !== null;
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

interface OnboardingState {
  open: boolean;
  finish: () => void;
}

const OnboardingContext = createContext<OnboardingState>({ open: false, finish: () => {} });

export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({
  userId,
  pending,
  children,
}: {
  userId: string;
  /** El servidor dice que esta cuenta aún no vio el recorrido. */
  pending: boolean;
  children: React.ReactNode;
}) {
  // en el servidor no se muestra: aparece al hidratar, con su animación de entrada
  const doneOnDevice = useSyncExternalStore(noopSubscribe, () => isDoneOnDevice(userId), () => true);
  const [finished, setFinished] = useState(false);

  // visto en este dispositivo pero el servidor no se enteró (p. ej. sin conexión): reintentar
  useEffect(() => {
    if (pending && doneOnDevice) accountService.completeOnboarding().catch(() => {});
  }, [pending, doneOnDevice]);

  const finish = useCallback(() => {
    setFinished(true);
    try {
      localStorage.setItem(doneKey(userId), new Date().toISOString());
    } catch {
      // sin almacenamiento, basta con el servidor
    }
    accountService.completeOnboarding().catch(() => {});
  }, [userId]);

  return (
    <OnboardingContext.Provider value={{ open: pending && !doneOnDevice && !finished, finish }}>
      {children}
    </OnboardingContext.Provider>
  );
}
