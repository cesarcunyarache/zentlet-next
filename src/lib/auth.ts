import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { twoFactor } from "better-auth/plugins/two-factor";

export const auth = betterAuth({
  // plugins: [twoFactor()],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email Providers
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: false, // ! al inicio false (para facilitar)
    requireEmailVerification: false,
  },

  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      console.log("sendVerificationEmail", { user, url, token });
      // await sendVerificationEmail({ user, url, token });
    },
  },

  // Social Providers
  socialProviders: {
    google: {
      // Redirect URL: http://localhost:3000/api/auth/callback/google
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      // Redirect URL:
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
});
