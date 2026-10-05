import { createContext } from "react";

export interface OnboardingState {
  open: boolean;
  finish: () => void;
}

export const OnboardingContext = createContext<OnboardingState>({ open: false, finish: () => {} });
