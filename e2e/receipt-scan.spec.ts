import path from "node:path";
import { expect, freshAccount, SHARED_CATEGORY, test } from "./fixtures";

const YAPE_SCREENSHOT = path.join(__dirname, "assets/yape-sent.png");

test.describe("escanear comprobante", () => {
  test("una captura de Yape se lee en el dispositivo y se guarda como gasto", async ({ browser }) => {
    const { page } = await freshAccount(browser);

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(YAPE_SCREENSHOT);

    await expect(page.getByText("Yape a Juan Carlos Pérez R.").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Leído en tu celular, sin IA")).toBeVisible();
    await expect(page.getByText(/−\s*S\/\s*25/)).toBeVisible();

    await page
      .getByRole("group", { name: "Cambiar categoría" })
      .getByRole("button", { name: SHARED_CATEGORY.name })
      .click();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await expect(page.getByText("Gasto registrado")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/25\.00/);
  });
});
