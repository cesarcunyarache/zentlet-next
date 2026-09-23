"use client";
import {
  cn,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import {
  AuthFormHeader,
  AuthSubmitButton,
  SocialSignInButtons,
  TermsNotice,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { authClient } from "@/lib/auth-client";
import type { FormEvent } from "react";

export default function SignIn({
  className,
  ...props
}: React.ComponentProps<"div">) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    await authClient.signIn.email(
      {
        email,
        password,
        callbackURL: "/admin",
      },
      {
        onError: async (ctx) => {
          if (ctx.error.status === 403) {
            alert(
              "Email no verificado. Por favor, verifica tu email para continuar.",
            );
            await authClient.sendVerificationEmail({
              email: email,
              callbackURL: "/",
            });
            return;
          }

          alert(ctx.error.message);
        },
      },
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div>
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <AuthFormHeader title="Bienvenido a Zentlet">
              ¿No tienes una cuenta? <AuthLink href="/auth/sign-up">Regístrate</AuthLink>
            </AuthFormHeader>
            <TextField>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </TextField>
            <TextField>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </TextField>
            <AuthSubmitButton>Login</AuthSubmitButton>
            <SocialSignInButtons
              onSelect={(provider) => authClient.signIn.social({ provider })}
            />
          </Form>
          <TermsNotice />
        </div>
      </div>
    </div>
  );
}
