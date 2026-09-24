import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import type { AuthMethod } from "./observability/events";
import { trackServerEvent } from "./observability/server";

type HookContext = { path?: string; params?: Record<string, string> } | null;

/** Email por su ruta; OAuth por el proveedor del callback (`/callback/:id`). */
function authMethod(context: HookContext): AuthMethod {
  if (context?.path?.endsWith("/email")) return "email";
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
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // pendiente de un servicio de correo: por ahora no se envía nada
    sendVerificationEmail: async () => {},
  },

  socialProviders: {
    google: {
      // Redirect URL: http://localhost:3000/api/auth/callback/google
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },

  // analytics de producto: el alta y cada inicio de sesión, con el id interno
  databaseHooks: {
    user: {
      create: {
        after: async (user, context: HookContext) => {
          trackServerEvent(user.id, "user_signed_up", { method: authMethod(context) });
        },
      },
    },
    session: {
      create: {
        after: async (session, context: HookContext) => {
          // el alta con email ya abre sesión: eso es `user_signed_up`
          if (context?.path?.startsWith("/sign-up")) return;
          trackServerEvent(session.userId, "login_completed", { method: authMethod(context) });
        },
      },
    },
  },
});
