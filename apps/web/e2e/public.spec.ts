import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("sin sesión", () => {
  test("la landing muestra los planes con el precio del catálogo", async ({ page }) => {
    await page.goto("/");

    const pricing = page.locator("#precios");
    await expect(
      pricing.getByRole("heading", { name: "Empieza gratis. Pasa a Pro cuando lo necesites" }),
    ).toBeVisible();
    await expect(pricing.getByText(/S\/\s*14\.90/).first()).toBeVisible();
    await expect(pricing.getByText("15 días gratis", { exact: true })).toBeVisible();
    await expect(pricing.getByRole("link", { name: "Probar 15 días gratis" })).toHaveAttribute(
      "href",
      /\/auth\/sign-up$/,
    );
  });

  test("el menú lleva a la sección de precios", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Precios" }).click();
    await expect(page).toHaveURL(/#precios$/);
  });

  test("la app privada redirige al inicio de sesión", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("las rutas de billing exigen sesión", async ({ request }) => {
    expect((await request.get("/api/billing/me")).status()).toBe(401);
    expect((await request.post("/api/billing/checkout", { data: { planKey: "pro" } })).status()).toBe(401);
    expect((await request.post("/api/billing/cancel")).status()).toBe(401);
  });

  test("un webhook sin firma válida se rechaza", async ({ request }) => {
    const response = await request.post("/api/billing/webhooks/mercadopago?data.id=123&type=subscription_preapproval", {
      data: { id: 1, type: "subscription_preapproval", data: { id: "123" } },
      headers: { "x-signature": "ts=1,v1=forged", "x-request-id": "forged" },
    });
    expect(response.status()).toBe(401);
  });
});
