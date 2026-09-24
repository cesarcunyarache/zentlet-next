"use client";

import { useState, type FormEvent } from "react";
import { Form, Input, Label, TextField } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import {
  AuthFormHeader,
  AuthNotice,
  AuthSubmitButton,
  showAuthError,
  strong,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { useTurnstile } from "@/core/components/turnstile";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/lib/auth-errors";
import { siteConfig } from "@/lib/site";
import { getPathname } from "@/i18n/navigation";

/**
 * Pide el enlace para restablecer la contraseña. La respuesta es la misma
 * exista o no la cuenta: así no se puede averiguar qué correos están
 * registrados.
 */
export default function ForgotPassword() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [isPending, setIsPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const captcha = useTurnstile();

  const backToSignIn = (chunks: React.ReactNode) => (
    <AuthLink href={siteConfig.routes.signIn}>{chunks}</AuthLink>
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setIsPending(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: getPathname({ href: siteConfig.routes.resetPassword, locale }),
        fetchOptions: { headers: captcha.headers },
      });
      // sólo los fallos de red, de límite o de CAPTCHA se muestran; el resto no revela nada
      if (error && (error.status === 429 || !error.status || error.code === "VERIFICATION_FAILED" || error.code === "MISSING_RESPONSE")) {
        captcha.reset();
        showAuthError(t(`errors.${authErrorKey(error)}`));
        return;
      }
      setSentTo(email);
    } catch {
      showAuthError(t(`errors.${authErrorKey(null)}`));
    } finally {
      setIsPending(false);
    }
  }

  if (sentTo) {
    return (
      <AuthNotice title={t("checkEmail.title")}>
        {t.rich("forgotPassword.sentBody", { email: sentTo, strong })}{" "}
        {t.rich("checkEmail.back", { link: backToSignIn })}
      </AuthNotice>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthFormHeader title={t("forgotPassword.title")}>
          {t.rich("forgotPassword.description", { link: backToSignIn })}
        </AuthFormHeader>
        <TextField>
          <Label htmlFor="email">{t("fields.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            required
          />
        </TextField>
        {captcha.widget}
        <AuthSubmitButton isPending={isPending} isDisabled={!captcha.ready} pendingLabel={t("forgotPassword.pending")}>
          {t("forgotPassword.submit")}
        </AuthSubmitButton>
      </Form>
    </div>
  );
}
