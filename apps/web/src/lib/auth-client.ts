import { createAuthClient } from "better-auth/react";

/** Sin `NEXT_PUBLIC_BETTER_AUTH_URL`, el mismo origen que la página (localhost, túnel o dominio). */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || undefined,

  plugins: [],
});
