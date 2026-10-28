import { createContext } from "react";

interface OnboardingState {
  open: boolean;
  finish: () => void;
}

export const OnboardingContext = createContext<OnboardingState>({ open: false, finish: () => {} });
