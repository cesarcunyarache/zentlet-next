"use client";

import { useContext } from "react";
import { OnboardingContext } from "../lib/onboarding-context";

export const useOnboarding = () => useContext(OnboardingContext);
