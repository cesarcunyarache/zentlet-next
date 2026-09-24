"use client";

import { useMemo, useState } from "react";
import { Form, Input, Label, TextField } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AuthFormHeader,
  AuthNotice,
  AuthSubmitButton,
  FieldMessage,
  LegalConsent,
  SocialSignInButtons,
  legalConsentHeaders,
  showAuthError,
  strong,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { useTurnstile } from "@/core/components/turnstile";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/lib/auth-errors";
import { siteConfig } from "@/lib/site";
import { getPathname } from "@/i18n/navigation";

const NAME_MIN = 2;
const PASSWORD_MIN = 8;

/** Los mensajes de validación se muestran bajo cada campo, en el idioma activo. */
function createSignUpSchema(t: ReturnType<typeof useTranslations<"auth">>) {
  return z
    .object({
      name: z.string().trim().min(NAME_MIN, t("validation.nameTooShort", { min: NAME_MIN })),
      email: z.email(t("validation.invalidEmail")),
      password: z
        .string()
        .min(PASSWORD_MIN, t("validation.passwordTooShort", { min: PASSWORD_MIN })),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsDontMatch"),
      path: ["confirmPassword"],
    });
}

type SignUpValues = z.infer<ReturnType<typeof createSignUpSchema>>;

export default function SignUp() {
  const t = useTranslations("auth");
  const locale = useLocale();
  // la cuenta queda creada pero sin sesión hasta confirmar el correo
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const captcha = useTurnstile();
  const signUpSchema = useMemo(() => createSignUpSchema(t), [t]);

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
        callbackURL: getPathname({ href: siteConfig.routes.app, locale }),
        fetchOptions: { headers: { ...captcha.headers, ...legalConsentHeaders(legalAccepted) } },
      });
      if (error) {
        captcha.reset();
        return showAuthError(t(`errors.${authErrorKey(error)}`));
      }
      setSentTo(values.email);
    } catch {
      captcha.reset();
      showAuthError(t(`errors.${authErrorKey(null)}`));
    }
  }

  if (sentTo) {
    return (
      <AuthNotice title={t("checkEmail.title")}>
        {t.rich("checkEmail.body", { email: sentTo, strong })}{" "}
        {t.rich("checkEmail.back", {
          link: (chunks) => <AuthLink href={siteConfig.routes.signIn}>{chunks}</AuthLink>,
        })}
      </AuthNotice>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <Form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} validationBehavior="aria">
          <AuthFormHeader title={t("signUp.title")}>
            {t.rich("signUp.hasAccount", {
              link: (chunks) => <AuthLink href={siteConfig.routes.signIn}>{chunks}</AuthLink>,
            })}
          </AuthFormHeader>
          <TextField>
            <Label htmlFor="name">{t("fields.name")}</Label>
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
            <Label htmlFor="email">{t("fields.email")}</Label>
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
            <Label htmlFor="password">{t("fields.password")}</Label>
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
          <LegalConsent checked={legalAccepted} onChange={setLegalAccepted} />
          {captcha.widget}
          <AuthSubmitButton
            isPending={isSubmitting}
            isDisabled={!legalAccepted || !captcha.ready}
            pendingLabel={t("signUp.pending")}
          >
            {t("signUp.submit")}
          </AuthSubmitButton>
          <SocialSignInButtons requestSignUp isDisabled={!legalAccepted} />
        </Form>
      </div>
    </div>
  );
}
