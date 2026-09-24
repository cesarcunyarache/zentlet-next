import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import type { Email } from "./send-email";

/*
 * Correos de la cuenta, en el idioma de la página desde la que se pidieron
 * (el `Referer` lleva el prefijo `/en/…`; sin él, el idioma por defecto).
 */

const COPY = {
  es: {
    greeting: (name: string) => `Hola, ${name}:`,
    verify: {
      subject: "Confirma tu correo en Zentlet",
      body: "Confirma tu correo para empezar a registrar tus gastos.",
      action: "Confirmar correo",
      footer: "Si no creaste una cuenta en Zentlet, ignora este mensaje.",
    },
    reset: {
      subject: "Restablece tu contraseña de Zentlet",
      body: "Recibimos una solicitud para cambiar tu contraseña. El enlace vence en 1 hora.",
      action: "Elegir una contraseña nueva",
      footer: "Si no lo pediste, ignora este mensaje: tu contraseña no cambiará.",
    },
    fallbackLink: "Si el botón no funciona, copia este enlace en tu navegador:",
  },
  en: {
    greeting: (name: string) => `Hi ${name},`,
    verify: {
      subject: "Confirm your email for Zentlet",
      body: "Confirm your email to start tracking your expenses.",
      action: "Confirm email",
      footer: "If you didn't create a Zentlet account, you can ignore this message.",
    },
    reset: {
      subject: "Reset your Zentlet password",
      body: "We received a request to change your password. The link expires in 1 hour.",
      action: "Choose a new password",
      footer: "If you didn't request this, ignore this message: your password won't change.",
    },
    fallbackLink: "If the button doesn't work, paste this link into your browser:",
  },
} satisfies Record<Locale, unknown>;

export function emailLocale(request?: Request): Locale {
  const referer = request?.headers.get("referer");
  if (!referer) return routing.defaultLocale;
  try {
    const [, first] = new URL(referer).pathname.split("/");
    return routing.locales.find((locale) => locale === first) ?? routing.defaultLocale;
  } catch {
    return routing.defaultLocale;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function accountEmail(
  locale: Locale,
  kind: "verify" | "reset",
  { to, name, url }: { to: string; name: string; url: string },
): Email {
  const copy = COPY[locale];
  const { subject, body, action, footer } = copy[kind];
  const greeting = copy.greeting(name);
  const safeUrl = escapeHtml(url);

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:32px 16px;background:#f6f6f4;font-family:system-ui,-apple-system,sans-serif;color:#1c1c1a">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <p style="margin:0 0 24px;font-size:20px;font-weight:700">${siteConfig.name}</p>
      <p style="margin:0 0 12px;font-size:15px">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5">${body}</p>
      <a href="${safeUrl}" style="display:inline-block;background:#1c1c1a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px">${action}</a>
      <p style="margin:24px 0 4px;font-size:12px;color:#6b6b66">${copy.fallbackLink}</p>
      <p style="margin:0 0 24px;font-size:12px;word-break:break-all"><a href="${safeUrl}" style="color:#6b6b66">${safeUrl}</a></p>
      <p style="margin:0;font-size:12px;color:#6b6b66">${footer}</p>
    </div>
  </body>
</html>`;

  const text = [greeting, "", body, "", `${action}: ${url}`, "", footer].join("\n");

  return { to, subject, html, text };
}

export const verificationEmail = (locale: Locale, data: { to: string; name: string; url: string }) =>
  accountEmail(locale, "verify", data);

export const resetPasswordEmail = (locale: Locale, data: { to: string; name: string; url: string }) =>
  accountEmail(locale, "reset", data);
