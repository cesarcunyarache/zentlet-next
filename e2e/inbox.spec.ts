import { makePro } from "./database";
import { INBOUND_EMAIL_SECRET } from "./env";
import { expect, freshAccount, SHARED_CATEGORY, test } from "./fixtures";

const SCREENSHOTS = process.env.E2E_SCREENSHOTS_DIR;

const bcpEmail = (address: string) => ({
  MessageID: `bcp-${Date.now()}`,
  From: "BCP <notificaciones@notificacionesbcp.com.pe>",
  OriginalRecipient: address,
  Subject: "Constancia de consumo",
  TextBody: [
    "Hola Cesar Efrain,",
    "Realizaste un consumo de S/ 14.50 con tu Tarjeta de Débito BCP en IKF A53 PIURA 21.",
    "Total del consumo\tS/ 14.50",
    "Fecha y hora\t24 de setiembre de 2026 - 06:54 PM",
    "Número de Tarjeta de Débito\t************6973",
    "Empresa\tIKF A53 PIURA 21",
    "Número de operación\t576278",
  ].join("\n"),
  Headers: [],
});

test.describe("movimientos por correo", () => {
  test("un aviso del BCP llega por confirmar y al aceptarlo se registra", async ({ browser }) => {
    const { page, user } = await freshAccount(browser);
    await makePro(user.email);
    await page.reload();

    await page.getByRole("button", { name: "Ajustes" }).click();
    await page.getByRole("button", { name: "Configurar" }).click();
    await page.getByRole("button", { name: "Crear mi dirección" }).click();
    const address = (await page.locator("code").filter({ hasText: "@in.zentlet.test" }).textContent())!.trim();
    if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/inbox-settings.png` });
    await page.keyboard.press("Escape");

    const response = await page.request.post("/api/inbox/email/postmark", {
      headers: { authorization: `Bearer ${INBOUND_EMAIL_SECRET}` },
      data: bcpEmail(address),
    });
    expect(await response.json()).toEqual({ outcome: "created" });

    await page.reload();
    await page.getByRole("button", { name: "1 movimiento por confirmar" }).click();
    await expect(page.getByText("BCP · tarjeta •6973")).toBeVisible();
    await expect(page.getByLabel("Monto")).toHaveValue("14.50");
    await expect(page.getByText("En PEN")).toHaveCount(0);
    if (SCREENSHOTS) {
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SCREENSHOTS}/inbox-review.png`, fullPage: true });
    }

    await page.getByLabel("Descripción").fill("KFC");
    await page.getByRole("group", { name: "Categoría" }).getByRole("button", { name: SHARED_CATEGORY.name }).click();
    await page.getByRole("button", { name: "Aceptar" }).click();

    await expect(page.getByText("No tienes movimientos por confirmar.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("KFC")).toBeVisible();
    await expect(page.getByRole("button", { name: /por confirmar/ })).toHaveCount(0);
  });
});
