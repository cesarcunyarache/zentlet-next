"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Form, Input, Label, TextField } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AuthFormHeader,
  AuthNotice,
  AuthSubmitButton,
  FieldMessage,
  showAuthError,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/lib/auth-errors";
import { siteConfig } from "@/lib/site";

const PASSWORD_MIN = 8;

function createResetSchema(t: ReturnType<typeof useTranslations<"auth">>) {
  return z
    .object({
      password: z.string().min(PASSWORD_MIN, t("validation.passwordTooShort", { min: PASSWORD_MIN })),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsDontMatch"),
      path: ["confirmPassword"],
    });
}

type ResetValues = z.infer<ReturnType<typeof createResetSchema>>;

/**
 * Destino del enlace del correo. Better Auth valida el token antes de
 * redirigir aquí: si venció, llega con `?error=INVALID_TOKEN` en vez de
 * `?token=`.
 */
export default function ResetPasswordPage() {
  // useSearchParams sin Suspense haría dinámica esta página estática
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const t = useTranslations("auth");
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<"form" | "done" | "invalid">(token ? "form" : "invalid");
  const resetSchema = useMemo(() => createResetSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit({ password }: ResetValues) {
    if (!token) return;
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error?.code === "INVALID_TOKEN") return setStatus("invalid");
      if (error) return showAuthError(t(`errors.${authErrorKey(error)}`));
      setStatus("done");
    } catch {
      showAuthError(t(`errors.${authErrorKey(null)}`));
    }
  }

  if (status === "done") {
    return (
      <AuthNotice title={t("resetPassword.doneTitle")}>
        {t.rich("resetPassword.doneBody", {
          link: (chunks) => <AuthLink href={siteConfig.routes.signIn}>{chunks}</AuthLink>,
        })}
      </AuthNotice>
    );
  }

  if (status === "invalid") {
    return (
      <AuthNotice title={t("resetPassword.invalidTitle")}>
        {t.rich("resetPassword.invalidBody", {
          link: (chunks) => <AuthLink href={siteConfig.routes.forgotPassword}>{chunks}</AuthLink>,
        })}
      </AuthNotice>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} validationBehavior="aria">
        <AuthFormHeader title={t("resetPassword.title")}>{t("resetPassword.description")}</AuthFormHeader>
        <TextField>
          <Label htmlFor="password">{t("fields.newPassword")}</Label>
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
          <Label htmlFor="confirm-password">{t("fields.confirmPassword")}</Label>
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
        <AuthSubmitButton isPending={isSubmitting} pendingLabel={t("resetPassword.pending")}>
          {t("resetPassword.submit")}
        </AuthSubmitButton>
      </Form>
    </div>
  );
}
