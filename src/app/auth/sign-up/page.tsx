"use client";

import { Form, Input, Label, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AuthFormHeader,
  AuthSubmitButton,
  FieldMessage,
  SocialSignInButtons,
  TermsNotice,
  showAuthError,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { siteConfig } from "@/lib/site";

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.email("Correo inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Repite la contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignUpValues) {
    try {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL: siteConfig.routes.app,
      });
      if (error) return showAuthError(authErrorMessage(error));
      router.push(siteConfig.routes.app);
    } catch {
      showAuthError(authErrorMessage(null));
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <Form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} validationBehavior="aria">
          <AuthFormHeader title="Regístrate en Zentlet">
            ¿Ya tienes una cuenta? <AuthLink href="/auth/sign-in">Inicia sesión</AuthLink>
          </AuthFormHeader>
          <TextField>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldMessage>{errors.name?.message}</FieldMessage>
          </TextField>
          <TextField>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="m@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldMessage>{errors.email?.message}</FieldMessage>
          </TextField>
          <TextField>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <FieldMessage>{errors.password?.message}</FieldMessage>
          </TextField>
          <TextField>
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            <FieldMessage>{errors.confirmPassword?.message}</FieldMessage>
          </TextField>
          <AuthSubmitButton isPending={isSubmitting} pendingLabel="Creando tu cuenta…">
            Registrarse
          </AuthSubmitButton>
          <SocialSignInButtons />
        </Form>
        <TermsNotice />
      </div>
    </div>
  );
}
