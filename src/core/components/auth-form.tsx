"use client";

import { useEffect, useState } from "react";
import { Button, Description, InputGroup, Separator, toast } from "@heroui/react";
import { ChartBar, Eye, EyeSlash, Lock } from "@gravity-ui/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { authErrorKey, oauthErrorKey } from "@/lib/auth-errors";
import { siteConfig } from "@/lib/site";
import { Link, getPathname } from "@/i18n/navigation";
import { LEGAL_CONSENT_HEADER, LEGAL_VERSION } from "@/features/legal/config";
import { useTurnstile } from "@/core/components/turnstile";

/** Cabecera de consentimiento para las altas; sin la casilla marcada, ninguna. */
export function legalConsentHeaders(accepted: boolean): Record<string, string> {
  return accepted ? { [LEGAL_CONSENT_HEADER]: LEGAL_VERSION } : {};
}

type SocialProvider = "github" | "google";

export function AuthFormHeader({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link
        href="/"
        className="hidden flex-col items-center gap-2 font-medium lg:flex"
      >
        <div className="bg-app-fg text-app-bg flex size-10 items-center justify-center rounded-2xl shadow-[0_10px_24px_-8px_color-mix(in_oklch,var(--app-fg)_55%,transparent)]">
          <ChartBar className="size-5" />
        </div>
        <span className="sr-only">Zentlet</span>
      </Link>
      <h1 className="font-display m-0 lg:mt-2 text-2xl leading-tight font-bold tracking-[-0.03em]">{title}</h1>
      <Description className="text-app-muted">{children}</Description>
    </div>
  );
}

export function AuthSubmitButton({
  children,
  isPending = false,
  isDisabled = false,
  pendingLabel,
}: {
  children: React.ReactNode;
  isPending?: boolean;
  isDisabled?: boolean;
  pendingLabel: string;
}) {
  return (
    <Button
      type="submit"
      isPending={isPending}
      isDisabled={isDisabled}
      className="bg-app-fg text-app-bg mt-1 h-10 w-full rounded-xl font-semibold shadow-[0_12px_24px_-10px_color-mix(in_oklch,var(--app-fg)_60%,transparent)] transition-transform hover:-translate-y-0.5 data-[pending=true]:opacity-80"
    >
      {isPending ? pendingLabel : children}
    </Button>
  );
}

type AuthInputProps = Omit<InputGroup["InputProps"], "type"> & {
  type?: "text" | "email";
  icon: React.ComponentType<{ className?: string }>;
};

/** Campo del acceso con un icono al inicio. */
export function AuthInput({ icon: Icon, type = "text", "aria-invalid": invalid, ...props }: AuthInputProps) {
  return (
    <InputGroup fullWidth isInvalid={Boolean(invalid)}>
      <InputGroup.Prefix>
        <Icon className="text-app-muted size-4" />
      </InputGroup.Prefix>
      <InputGroup.Input type={type} aria-invalid={invalid} {...props} />
    </InputGroup>
  );
}

/** Contraseña con candado al inicio y un botón para mostrarla u ocultarla. */
export function PasswordInput({ "aria-invalid": invalid, ...props }: Omit<InputGroup["InputProps"], "type">) {
  const t = useTranslations("auth.fields");
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeSlash : Eye;

  return (
    <InputGroup fullWidth isInvalid={Boolean(invalid)}>
      <InputGroup.Prefix>
        <Lock className="text-app-muted size-4" />
      </InputGroup.Prefix>
      <InputGroup.Input type={visible ? "text" : "password"} aria-invalid={invalid} {...props} />
      <InputGroup.Suffix>
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={t(visible ? "hidePassword" : "showPassword")}
          aria-pressed={visible}
          className="text-app-muted hover:text-app-fg focus-visible:ring-app-fg -mr-1 flex size-7 items-center justify-center rounded-md outline-none focus-visible:ring-2"
        >
          <Toggle className="size-4" />
        </button>
      </InputGroup.Suffix>
    </InputGroup>
  );
}

/** Mensaje de validación bajo un campo; `role="alert"` lo anuncia al aparecer. */
export function FieldMessage({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-app-expense m-0 text-xs font-medium">
      {children}
    </p>
  );
}

export function showAuthError(message: string) {
  toast.danger(message, { timeout: 5000 });
}

/**
 * Google y GitHub salen de la app: si algo falla después, el proveedor
 * vuelve a esta misma página con `?error=`. Sólo el registro crea cuentas
 * nuevas (`requestSignUp`), después de aceptar los textos legales.
 */
export function SocialSignInButtons({
  requestSignUp = false,
  isDisabled = false,
}: {
  requestSignUp?: boolean;
  isDisabled?: boolean;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  // ruta real con prefijo de idioma: el proveedor vuelve aquí tal cual
  const pathname = usePathname();
  const [pending, setPending] = useState<SocialProvider | null>(null);

  async function signIn(provider: SocialProvider) {
    setPending(provider);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: getPathname({ href: siteConfig.routes.app, locale }),
        errorCallbackURL: pathname,
        requestSignUp,
        fetchOptions: { headers: legalConsentHeaders(requestSignUp) },
      });
      if (error) {
        showAuthError(t(`errors.${authErrorKey(error)}`));
        setPending(null);
      }
      // sin error el navegador ya va camino del proveedor
    } catch {
      showAuthError(t(`errors.${authErrorKey(null)}`));
      setPending(null);
    }
  }

  return (
    <>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <Button
          variant="outline"
          type="button"
          className="h-10 w-full rounded-xl"
          isPending={pending === "github"}
          isDisabled={isDisabled || pending !== null}
          onPress={() => signIn("github")}
        >
          <svg viewBox="0 0 1024 1024" fill="none">
            <path
              fill="#1b1f23"
              fillRule="evenodd"
              d="M512 0C229.12 0 0 229.12 0 512c0 226.56 146.56 417.92 350.08 485.76 25.6 4.48 35.2-10.88 35.2-24.32 0-12.16-.64-52.48-.64-95.36-128.64 23.68-161.92-31.36-172.16-60.16-5.76-14.72-30.72-60.16-52.48-72.32-17.92-9.6-43.52-33.28-.64-33.92 40.32-.64 69.12 37.12 78.72 52.48 46.08 77.44 119.68 55.68 149.12 42.24 4.48-33.28 17.92-55.68 32.64-68.48-113.92-12.8-232.96-56.96-232.96-252.8 0-55.68 19.84-101.76 52.48-137.6-5.12-12.8-23.04-65.28 5.12-135.68 0 0 42.88-13.44 140.8 52.48 40.96-11.52 84.48-17.28 128-17.28s87.04 5.76 128 17.28c97.92-66.56 140.8-52.48 140.8-52.48 28.16 70.4 10.24 122.88 5.12 135.68 32.64 35.84 52.48 81.28 52.48 137.6 0 196.48-119.68 240-233.6 252.8 18.56 16 34.56 46.72 34.56 94.72 0 68.48-.64 123.52-.64 140.8 0 13.44 9.6 29.44 35.2 24.32C877.44 929.92 1024 737.92 1024 512 1024 229.12 794.88 0 512 0"
              clipRule="evenodd"
            />
          </svg>
          {t("social.github")}
        </Button>
        <Button
          variant="outline"
          type="button"
          className="h-10 w-full rounded-xl"
          isPending={pending === "google"}
          isDisabled={isDisabled || pending !== null}
          onPress={() => signIn("google")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
              fill="currentColor"
            />
          </svg>
          {t("social.google")}
        </Button>
      </div>
    </>
  );
}

/** Muestra el error con el que volvió un login social y limpia la URL. */
export function OAuthErrorToast() {
  const t = useTranslations("auth.oauthErrors");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const error = params.get("error");

  useEffect(() => {
    if (!error) return;
    showAuthError(t(oauthErrorKey(error)));
    router.replace(pathname, { scroll: false });
  }, [error, pathname, router, t]);

  return null;
}

export function TermsNotice() {
  const t = useTranslations("auth");

  return (
    <Description className="px-6 text-center">
      {t.rich("terms", {
        terms: (chunks) => <Link href={siteConfig.routes.terms} className="underline underline-offset-2">{chunks}</Link>,
        privacy: (chunks) => <Link href={siteConfig.routes.privacy} className="underline underline-offset-2">{chunks}</Link>,
      })}
    </Description>
  );
}

/**
 * Consentimiento expreso para registrarse. Los ingresos y gastos son datos
 * sensibles (Ley 29733): aceptar no puede ser implícito ni venir marcado.
 */
export function LegalConsent({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const t = useTranslations("auth");

  return (
    <label className="text-app-muted flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed">
      <input
        type="checkbox"
        name="legalAccepted"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-app-fg mt-0.5 size-4 shrink-0"
      />
      <span>
        {t.rich("signUp.consent", {
          terms: (chunks) => legalLink(siteConfig.routes.terms, chunks),
          privacy: (chunks) => legalLink(siteConfig.routes.privacy, chunks),
        })}
      </span>
    </label>
  );
}

function legalLink(href: string, chunks: React.ReactNode) {
  return (
    <Link href={href} target="_blank" className="text-app-fg underline underline-offset-2">
      {chunks}
    </Link>
  );
}

/** Resultado de un paso del acceso (correo enviado, contraseña cambiada…) en lugar del formulario. */
export function AuthNotice({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  /** Acción bajo el texto (p. ej. reenviar el correo). */
  action?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <div role="status" className="flex flex-col gap-4">
        <AuthFormHeader title={title}>{children}</AuthFormHeader>
      </div>
      {action}
    </div>
  );
}

/** Espera entre reenvíos: el correo acaba de salir y puede tardar en llegar. */
const RESEND_COOLDOWN_MS = 60_000;

/**
 * Reenvía el correo de verificación. Empieza en espera (el correo del alta
 * acaba de enviarse) y vuelve a esperar tras cada reenvío. El servidor
 * responde igual exista o no la cuenta y limita los intentos por IP.
 */
export function ResendVerification({ email }: { email: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const captcha = useTurnstile();
  const [readyAt, setReadyAt] = useState(() => Date.now() + RESEND_COOLDOWN_MS);
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.ceil((readyAt - now) / 1000));
  const waiting = seconds > 0;

  async function resend() {
    setStatus("sending");
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: getPathname({ href: siteConfig.routes.app, locale }),
        fetchOptions: { headers: captcha.headers },
      });
      if (error) {
        showAuthError(t(`errors.${authErrorKey(error)}`));
        setStatus("idle");
        return;
      }
      setStatus("sent");
      setReadyAt(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
    } catch {
      showAuthError(t(`errors.${authErrorKey(null)}`));
      setStatus("idle");
    } finally {
      captcha.reset();
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      {captcha.widget}
      <Button
        variant="outline"
        type="button"
        onPress={resend}
        isPending={status === "sending"}
        isDisabled={waiting || !captcha.ready}
        className="h-11 w-full rounded-xl font-semibold"
      >
        {status === "sending"
          ? t("checkEmail.resending")
          : waiting
            ? t("checkEmail.resendIn", { seconds })
            : t("checkEmail.resend")}
      </Button>
      <p aria-live="polite" className="text-app-income m-0 min-h-4 text-xs font-medium">
        {status === "sent" ? t("checkEmail.resent") : null}
      </p>
    </div>
  );
}

/** Para `t.rich`: resalta el correo dentro de un texto. */
export const strong = (chunks: React.ReactNode) => <strong className="text-app-fg font-semibold">{chunks}</strong>;
