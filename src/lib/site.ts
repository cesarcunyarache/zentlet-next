/**
 * Datos del sitio que no dependen del idioma: nombre, dominio y rutas.
 * La URL pública sale de `NEXT_PUBLIC_SITE_URL`; sin ella se usa la de
 * Better Auth, que en local ya apunta a la app.
 */
export const siteConfig = {
  name: "Zentlet",
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, ""),
  routes: {
    home: "/",
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    app: "/admin",
    privacy: "/legal/privacy",
    terms: "/legal/terms",
  },
} as const;
