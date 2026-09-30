import type { Browser, Page } from "@playwright/test";
import {
  apiStatus,
  createAccount,
  expect,
  gateway,
  openSettings,
  subscribeFromSettings,
  test,
  type TestUser,
} from "./fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

const newUser = (): TestUser => ({
  name: "Borrar E2E",
  email: `borrar.${Date.now()}@example.com`,
  password: "Zentlet-e2e-2026!",
});

async function subscribedAccount(browser: Browser) {
  const user = newUser();
  const page = await (await browser.newContext({ locale: "es-PE", serviceWorkers: "block" })).newPage();
  await createAccount(page, user);
  await subscribeFromSettings(page);
  return { page, user };
}

async function deleteAccount(page: Page, password: string) {
  await openSettings(page);
  await page.getByRole("button", { name: /^Eliminar cuenta/ }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Escribe tu contraseña para confirmar").fill(password);
  await dialog.getByRole("button", { name: "Eliminar cuenta" }).click();
  return dialog;
}

test.describe("borrar la cuenta con una suscripción activa", () => {
  test("cancela la suscripción en la pasarela antes de borrar", async ({ browser }) => {
    const { page, user } = await subscribedAccount(browser);

    await deleteAccount(page, user.password);

    await expect(page).not.toHaveURL(/\/admin/);
    const [preapproval] = (await gateway.state()).preapprovals;
    expect(preapproval).toMatchObject({ payer_email: user.email, status: "cancelled" });
    expect(await apiStatus(page, "/api/billing/me")).toBe(401);
  });

  test("si la pasarela no puede cancelar, la cuenta no se borra y el usuario lo ve", async ({ browser }) => {
    const { page, user } = await subscribedAccount(browser);
    await gateway.failNextCancel();

    const dialog = await deleteAccount(page, user.password);

    await expect(dialog.getByRole("alert")).toHaveText("No pudimos eliminar tu cuenta. Inténtalo de nuevo.");
    expect((await gateway.state()).preapprovals[0].status).toBe("authorized");
    expect(await apiStatus(page, "/api/billing/me")).toBe(200);
  });
});
