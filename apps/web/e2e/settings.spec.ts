import { statSync } from "node:fs";
import { expect, freshAccount, openSettings, subscribeFromSettings, test } from "./fixtures";

test.describe("ajustes", () => {
  test("la moneda elegida se guarda en la cuenta", async ({ browser }) => {
    const { page } = await freshAccount(browser);
    await openSettings(page);
    await page
      .getByRole("button", { name: /Moneda/ })
      .or(page.getByLabel("Moneda"))
      .first()
      .click();
    await page.getByRole("option", { name: "€ · euro" }).click();
    await page.keyboard.press("Escape");

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("€");
  });

  test("cambiar el idioma traduce la app", async ({ browser }) => {
    const { page } = await freshAccount(browser);
    await openSettings(page);
    await page
      .getByRole("button", { name: /Idioma/ })
      .or(page.getByLabel("Idioma"))
      .first()
      .click();
    await page.getByRole("option", { name: "English" }).click();

    await page.waitForURL(/\/en\//);
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  });

  test("enviar un comentario", async ({ browser }) => {
    const { page } = await freshAccount(browser);
    await openSettings(page);
    await page.getByRole("button", { name: /Enviar comentario/ }).click();
    await page.getByPlaceholder("Comparte una idea o reporta un error").fill("Me gustaría ver gráficos por semana");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();

    await expect(page.getByText("¡Gracias!")).toBeVisible();
  });

  test("cerrar sesión vuelve al inicio y protege la app", async ({ browser }) => {
    const { page } = await freshAccount(browser);
    await openSettings(page);
    await page.getByRole("button", { name: /Cerrar sesión/ }).click();

    await expect(page).not.toHaveURL(/\/admin/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("con Pro, exportar descarga un archivo con los datos", async ({ browser }) => {
    const { page } = await freshAccount(browser);
    await subscribeFromSettings(page);
    await page.getByRole("button", { name: "Ajustes" }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar", exact: true }).click();

    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
    expect(await file.failure()).toBeNull();
    expect(statSync(await file.path()).size).toBeGreaterThan(0);
  });
});
