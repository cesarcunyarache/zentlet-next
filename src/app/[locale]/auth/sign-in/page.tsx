"use client";

import { useState, type FormEvent } from "react";
import { Form, Input, Label, TextField } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import {
  AuthFormHeader,
  AuthSubmitButton,
  SocialSignInButtons,
  TermsNotice,
  showAuthError,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/lib/auth-errors";
import { siteConfig } from "@/lib/site";
import { getPathname } from "@/i18n/navigation";

export default function SignIn() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsPending(true);

    try {
      const { error } = await authClient.signIn.email({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
        callbackURL: getPathname({ href: siteConfig.routes.app, locale }),
      });
      // con éxito, el cliente ya redirige a `callbackURL`
      if (error) {
        showAuthError(t(`errors.${authErrorKey(error)}`));
        setIsPending(false);
      }
    } catch {
      showAuthError(t(`errors.${authErrorKey(null)}`));
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <AuthFormHeader title={t("signIn.title")}>
            {t.rich("signIn.noAccount", {
              link: (chunks) => <AuthLink href={siteConfig.routes.signUp}>{chunks}</AuthLink>,
            })}
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
          <TextField>
            <Label htmlFor="password">{t("fields.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </TextField>
          <AuthLink
            href={siteConfig.routes.forgotPassword}
            className="text-app-muted hover:text-app-fg -mt-2 self-end text-xs font-medium"
          >
            {t("signIn.forgot")}
          </AuthLink>
          <AuthSubmitButton isPending={isPending} pendingLabel={t("signIn.pending")}>
            {t("signIn.submit")}
          </AuthSubmitButton>
          <SocialSignInButtons />
        </Form>
        <TermsNotice />
      </div>
    </div>
  );
}
