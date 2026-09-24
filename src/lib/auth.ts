import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { captcha } from "better-auth/plugins";
import { LEGAL_CONSENT_HEADER, LEGAL_VERSION } from "@/features/legal/config";
import prisma from "./prisma";
import { sendEmail } from "./email/send-email";
import { emailLocale, resetPasswordEmail, verificationEmail } from "./email/templates";
import type { AuthMethod } from "./observability/events";
import { logger } from "./observability/logger";
import { trackServerEvent } from "./observability/server";

type HookContext = { path?: string; params?: Record<string, string> } | null;

const DAY = 60 * 60 * 24;

/*
 * CAPTCHA de Cloudflare Turnstile en registro, login con correo y
 * recuperación de contraseña. Sólo con las dos claves: con una sola, o
 * nadie podría entrar (falta la del navegador) o no se comprobaría nada.
 */
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const captchaEnabled = Boolean(turnstileSecret && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/** Email por su ruta (o el enlace de verificación); OAuth por el proveedor del callback (`/callback/:id`). */
function authMethod(context: HookContext): AuthMethod {
  if (context?.path?.endsWith("/email") || context?.path === "/verify-email") return "email";
  const provider = context?.params?.id;
  return provider === "google" || provider === "github" ? provider : "unknown";
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  /*
   * La sesión viaja firmada en una cookie durante 5 min: el middleware y
   * cada Route Handler la validan sin consultar la base de datos. A cambio,
   * cerrar sesión en otro dispositivo tarda hasta 5 min en surtir efecto.
   */
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
    // caduca tras 7 días sin uso; usarla al menos una vez al día la prorroga otros 7
    expiresIn: 7 * DAY,
    updateAge: DAY,
  },

  /*
   * Intentos de login, registro y recuperación, contados en la base de datos:
   * el mismo límite para todas las instancias. Por defecto, 3 intentos cada
   * 10 s en esas rutas y 100 por minuto en el resto (Better Auth).
   */
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "database",
  },

  plugins: captchaEnabled
    ? [captcha({ provider: "cloudflare-turnstile", secretKey: turnstileSecret as string })]
    : [],

  /*
   * Ingresos y gastos son datos sensibles (Ley 29733, art. 2.5): su
   * tratamiento exige consentimiento expreso y por escrito. Todo alta (con
   * correo, o con Google/GitHub pidiendo `requestSignUp`) debe traer la
   * cabecera de la casilla marcada; se comprueba aquí, no sólo en pantalla.
   */
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const isSignUp = ctx.path === "/sign-up/email" || (ctx.path === "/sign-in/social" && ctx.body?.requestSignUp);
      if (isSignUp && ctx.headers?.get(LEGAL_CONSENT_HEADER) !== LEGAL_VERSION) {
        throw new APIError("BAD_REQUEST", { code: "LEGAL_CONSENT_REQUIRED", message: "Legal consent is required" });
      }
    }),
  },

  /*
   * Sin verificar el correo no se entra: quien registra una dirección debe
   * poder leerla. Intentar entrar sin verificar reenvía el enlace.
   * Restablecer la contraseña cierra las demás sesiones.
   */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }, request) => {
      await sendEmail(resetPasswordEmail(emailLocale(request), { to: user.email, name: user.name, url }));
    },
  },

  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      await sendEmail(verificationEmail(emailLocale(request), { to: user.email, name: user.name, url }));
    },
  },

  /*
   * Con Google o GitHub sólo se crea una cuenta desde la pantalla de
   * registro (`requestSignUp`), después de aceptar los textos legales.
   * Desde el login, una cuenta nueva vuelve con `?error=signup_disabled`.
   */
  socialProviders: {
    google: {
      // Redirect URL: http://localhost:3000/api/auth/callback/google
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      disableImplicitSignUp: true,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      disableImplicitSignUp: true,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      /*
       * Google o GitHub sólo se unen a una cuenta existente si su correo ya
       * está verificado. Si no, quien registró antes ese correo (sin
       * poseerlo) quedaría con acceso a la cuenta del verdadero dueño.
       * Es el valor por defecto de Better Auth; se deja explícito.
       */
      requireLocalEmailVerified: true,
    },
  },

  /*
   * El usuario puede borrar su cuenta desde Ajustes. Con contraseña se pide
   * de nuevo; sin ella, una sesión reciente. Categorías, movimientos y
   * sesiones se borran en cascada en la base de datos.
   */
  user: {
    // prueba del consentimiento: cuándo y qué versión de los textos
    additionalFields: {
      legalAcceptedAt: { type: "date", required: false, input: false },
      legalVersion: { type: "string", required: false, input: false },
      // null = cuenta nueva que aún no vio el recorrido de bienvenida
      onboardingCompletedAt: { type: "date", required: false, input: false },
    },
    deleteUser: {
      enabled: true,
      afterDelete: async (user) => {
        logger.info({ userId: user.id }, "account.deleted");
      },
    },
  },

  // analytics de producto: el alta y cada inicio de sesión, con el id interno
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, legalAcceptedAt: new Date(), legalVersion: LEGAL_VERSION },
        }),
        after: async (user, context: HookContext) => {
          trackServerEvent(user.id, "user_signed_up", { method: authMethod(context) });
        },
      },
    },
    session: {
      create: {
        after: async (session, context: HookContext) => {
          // el alta con email no abre sesión: la abre el enlace de verificación
          if (context?.path?.startsWith("/sign-up")) return;
          trackServerEvent(session.userId, "login_completed", { method: authMethod(context) });
        },
      },
    },
  },
});
