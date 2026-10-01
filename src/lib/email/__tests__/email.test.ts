import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportError } from "@/lib/observability/server";
import { sendEmail } from "./send-email";
import { emailLocale, resetPasswordEmail, verificationEmail } from "./templates";

vi.mock("@/lib/observability/server", () => ({ reportError: vi.fn() }));

const request = (referer?: string) =>
  new Request("http://localhost/api/auth/sign-up/email", { headers: referer ? { referer } : {} });

describe("emailLocale", () => {
  it("usa el idioma de la página desde la que se pidió", () => {
    expect(emailLocale(request("http://localhost/en/auth/sign-up"))).toBe("en");
    expect(emailLocale(request("http://localhost/auth/sign-up"))).toBe("es");
  });

  it("sin Referer o con uno inválido, el idioma por defecto", () => {
    expect(emailLocale(request())).toBe("es");
    expect(emailLocale(request("no es una url"))).toBe("es");
    expect(emailLocale()).toBe("es");
  });
});

describe("plantillas", () => {
  const data = { to: "ana@example.com", name: "Ana", url: "https://app.example.com/api/auth/verify-email?token=abc&x=1" };

  it("verificación en español, con el enlace en HTML y en texto plano", () => {
    const email = verificationEmail("es", data);
    expect(email.subject).toBe("Confirma tu correo en Zentlet");
    expect(email.to).toBe("ana@example.com");
    expect(email.html).toContain('href="https://app.example.com/api/auth/verify-email?token=abc&#38;x=1"');
    expect(email.text).toContain(data.url);
  });

  it("restablecer contraseña en inglés", () => {
    const email = resetPasswordEmail("en", data);
    expect(email.subject).toBe("Reset your Zentlet password");
    expect(email.text).toContain("Hi Ana,");
  });

  it("escapa el nombre del usuario: no se puede inyectar HTML en el correo", () => {
    const email = verificationEmail("es", { ...data, name: '<img src=x onerror="alert(1)">' });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&#60;img src=x");
  });
});

describe("sendEmail", () => {
  const email = verificationEmail("es", { to: "ana@example.com", name: "Ana", url: "https://x/verify" });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sin configurar, en desarrollo no envía nada y no falla", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendEmail(email)).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sin configurar, en producción lo reporta como error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendEmail(email)).toBe(false);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), "email.not_configured", expect.anything());
  });

  it("configurado, lo envía a Resend con el remitente del entorno", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Zentlet <hola@example.com>");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    expect(await sendEmail(email)).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer re_test" });
    expect(JSON.parse(String(init?.body))).toMatchObject({ from: "Zentlet <hola@example.com>", to: "ana@example.com" });
  });

  it("si el proveedor falla, devuelve false y lo reporta, sin lanzar", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Zentlet <hola@example.com>");
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    expect(await sendEmail(email)).toBe(false);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), "email.unavailable", expect.anything());
  });
});
