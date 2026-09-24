"use client";

import { useState, type FormEvent } from "react";
import { Form, Input, Label, TextField } from "@heroui/react";
import {
  AuthFormHeader,
  AuthSubmitButton,
  SocialSignInButtons,
  TermsNotice,
  showAuthError,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { siteConfig } from "@/lib/site";

export default function SignIn() {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsPending(true);

    try {
      const { error } = await authClient.signIn.email({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
        callbackURL: siteConfig.routes.app,
      });
      // con éxito, el cliente ya redirige a `callbackURL`
      if (error) {
        showAuthError(authErrorMessage(error));
        setIsPending(false);
      }
    } catch {
      showAuthError(authErrorMessage(null));
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <AuthFormHeader title="Bienvenido a Zentlet">
            ¿No tienes una cuenta? <AuthLink href="/auth/sign-up">Regístrate</AuthLink>
          </AuthFormHeader>
          <TextField>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="m@example.com"
              required
            />
          </TextField>
          <TextField>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </TextField>
          <AuthSubmitButton isPending={isPending} pendingLabel="Entrando…">
            Iniciar sesión
          </AuthSubmitButton>
          <SocialSignInButtons />
        </Form>
        <TermsNotice />
      </div>
    </div>
  );
}
