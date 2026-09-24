"use client";

import { useEffect } from "react";
import { identifyUser } from "./client";

/** Asocia la sesión a su id interno en analytics y errores. No pinta nada. */
export function AnalyticsIdentity({ userId }: { userId: string }) {
  useEffect(() => identifyUser(userId), [userId]);
  return null;
}
