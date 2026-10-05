import { expect, test as base, type Browser, type Page } from "@playwright/test";
import { LEGAL_CONSENT_HEADER, LEGAL_VERSION } from "../src/features/legal/config";
import { resetBillingData } from "./database";
import { MOCK_URL } from "./env";

interface GatewayState {
  preapprovals: { id: string; status: string; payer_email: string; auto_recurring: { start_date?: string } }[];
  refunds: unknown[];
}

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export const SHARED_USER: TestUser = { name: "Ana E2E", email: "ana.e2e@example.com", password: "Zentlet-e2e-2026!" };
export const SHARED_CATEGORY = {
  id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  name: "Comida",
  icon: "🍜",
  color: "#FDDCC4",
};

async function control(path: string, body: object = {}) {
  const response = await fetch(`${MOCK_URL}/__control/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Mock gateway ${path} failed: ${response.status}`);
}

export const gateway = {
  reset: () => control("reset"),
  setWebhooks: (enabled: boolean) => control("webhooks", { enabled }),
  charge: (status: "approved" | "rejected") => control("charge", { status }),
  failNextCancel: () => control("fail-next-cancel"),
  state: async () => (await (await fetch(`${MOCK_URL}/__control/state`)).json()) as GatewayState,
};

export const newUser = (prefix = "e2e"): TestUser => ({
  name: "Nuevo E2E",
  email: `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`,
  password: "Zentlet-e2e-2026!",
});

export async function newPage(browser: Browser) {
  const context = await browser.newContext({ locale: "es-PE", serviceWorkers: "block" });
  return context.newPage();
}

export async function freshAccount(browser: Browser) {
  const user = newUser();
  const page = await newPage(browser);
  await createAccount(page, user);
  expect(
    await apiStatus(page, "/api/category", { method: "POST", body: { ...SHARED_CATEGORY, id: crypto.randomUUID() } }),
  ).toBe(201);
  await page.reload();
  return { page, user };
}

export const test = base.extend<{ cleanState: void }>({
  cleanState: [
    async ({}, provide) => {
      await resetBillingData();
      await gateway.reset();
      await provide();
    },
    { auto: true },
  ],
});

export { expect };

export function apiStatus(
  page: Page,
  path: string,
  init: { method?: string; body?: object; headers?: Record<string, string> } = {},
) {
  return page.evaluate(
    async ({ path, init }) => {
      const response = await fetch(path, {
        method: init.method ?? "GET",
        headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
      return response.status;
    },
    { path, init },
  );
}

export async function createAccount(page: Page, user: TestUser) {
  await page.goto("/auth/sign-up");
  const signUp = await apiStatus(page, "/api/auth/sign-up/email", {
    method: "POST",
    body: user,
    headers: { [LEGAL_CONSENT_HEADER]: LEGAL_VERSION },
  });
  expect(signUp).toBe(200);
  expect(await apiStatus(page, "/api/account/onboarding", { method: "POST" })).toBe(204);
  expect(await apiStatus(page, "/api/auth/get-session?disableCookieCache=true")).toBe(200);

  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "Ajustes" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export function planRow(page: Page) {
  return page
    .locator("div")
    .filter({ has: page.getByText("Plan", { exact: true }) })
    .last();
}

export async function openSettings(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(page.getByText("Plan", { exact: true })).toBeVisible();
}

async function payInGateway(page: Page) {
  await expect(page.getByRole("heading", { name: "Mercado Pago (simulado)" })).toBeVisible();
  await page.getByRole("button", { name: "Pagar" }).click();
  await page.waitForURL(/\/admin/);
}

export async function subscribeFromSettings(page: Page, buttonName = "Probar 15 días") {
  await openSettings(page);
  await planRow(page).getByRole("button", { name: buttonName }).click();
  await payInGateway(page);
}

export async function cancelFromSettings(page: Page) {
  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText(/No se renovará/)).toBeVisible();
}

export async function openBudgetSheet(page: Page, categoryName: string) {
  await page.goto("/admin");
  await page.getByRole("button", { name: new RegExp(`^${categoryName},`) }).click({ button: "right" });
  await expect(page.getByText(`Presupuesto de ${categoryName}`)).toBeVisible();
}
