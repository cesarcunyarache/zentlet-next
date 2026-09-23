import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

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
});
