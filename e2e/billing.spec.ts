import {
  apiStatus,
  cancelFromSettings,
  expect,
  gateway,
  openBudgetSheet,
  openSettings,
  planRow,
  SHARED_CATEGORY,
  subscribeFromSettings,
  test,
} from "./fixtures";

const NEW_BUDGET = {
  id: "5d0b7a3c-9e1f-4c2d-8a6b-3f4e5d6c7b8a",
  categoryId: "5d0b7a3c-9e1f-4c2d-8a6b-3f4e5d6c7b8b",
  kind: "recurring",
  periodUnit: "month",
  periodCount: 1,
  startDate: "2026-09-01",
  amount: 600,
};

test.describe("plan free", () => {
  test("Ajustes muestra el plan Free con la oferta de prueba y exportar bloqueado", async ({ page }) => {
    await openSettings(page);

    await expect(page.getByText(/Free · Pro desde S\/\s*14\.90 al mes/)).toBeVisible();
    await expect(planRow(page).getByRole("button", { name: "Probar 15 días" })).toBeVisible();
    await expect(page.getByText("Exportar es parte de Pro")).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar", exact: true })).toHaveCount(0);
  });

  test("el servidor rechaza las features Pro aunque se llame a la API directamente", async ({ page }) => {
    await page.goto("/admin");

    expect(await apiStatus(page, "/api/account/export")).toBe(403);
    expect(await apiStatus(page, "/api/budget", { method: "POST", body: NEW_BUDGET })).toBe(403);
  });
});

test.describe("suscripción con prueba de 15 días", () => {
  test("pagar en la pasarela activa la prueba y desbloquea Pro", async ({ page }) => {
    await subscribeFromSettings(page);

    await page.getByRole("button", { name: "Ajustes" }).click();
    await expect(page.getByText(/Prueba de Pro hasta el \d+ de \w+/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar", exact: true })).toBeVisible();
    expect(await apiStatus(page, "/api/account/export")).toBe(200);
  });

  test("la pasarela recibe el precio del servidor, el correo del usuario y el primer cobro a 15 días", async ({
    page,
  }) => {
    await subscribeFromSettings(page);

    const [preapproval] = (await gateway.state()).preapprovals;
    const daysUntilCharge = (Date.parse(preapproval.auto_recurring.start_date as string) - Date.now()) / 86_400_000;

    expect(preapproval).toMatchObject({
      status: "authorized",
      payer_email: "ana.e2e@example.com",
      auto_recurring: { transaction_amount: 14.9, currency_id: "PEN", frequency: 1, frequency_type: "months" },
    });
    expect(daysUntilCharge).toBeGreaterThan(14);
    expect(daysUntilCharge).toBeLessThan(16);
  });

  test("si el webhook no llega, la app se sincroniza sola al volver del pago", async ({ page }) => {
    await gateway.setWebhooks(false);

    await subscribeFromSettings(page);

    await page.getByRole("button", { name: "Ajustes" }).click();
    await expect(page.getByText(/Prueba de Pro hasta el/)).toBeVisible();
  });

  test("abandonar el pago deja el plan en Free y permite retomarlo", async ({ page }) => {
    await openSettings(page);
    await planRow(page).getByRole("button", { name: "Probar 15 días" }).click();
    await expect(page.getByRole("heading", { name: "Mercado Pago (simulado)" })).toBeVisible();
    const checkoutUrl = page.url();

    await openSettings(page);
    await expect(page.getByText("Esperando la confirmación del pago")).toBeVisible();
    await planRow(page).getByRole("button", { name: "Probar 15 días" }).click();

    await expect(page).toHaveURL(checkoutUrl);
    expect((await gateway.state()).preapprovals).toHaveLength(1);
  });
});

test.describe("cancelación", () => {
  test("cancelar pide confirmación, mantiene el acceso hasta el fin de la prueba y no ofrece otra", async ({
    page,
  }) => {
    await subscribeFromSettings(page);
    await cancelFromSettings(page);

    await expect(page.getByText(/Pro hasta el \d+ de \w+\. No se renovará/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Mejorar a Pro" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar", exact: true })).toBeVisible();
    expect((await gateway.state()).preapprovals[0].status).toBe("cancelled");
  });
});

test.describe("cobros", () => {
  test("un cobro rechazado avisa al usuario y uno aprobado lo resuelve", async ({ page }) => {
    await subscribeFromSettings(page);

    await gateway.charge("rejected");
    await openSettings(page);
    await expect(page.getByText("No pudimos cobrar tu plan. Revisa tu medio de pago")).toBeVisible();

    await gateway.charge("approved");
    await openSettings(page);
    await expect(page.getByText(/Pro · se renueva el \d+ de \w+/)).toBeVisible();
  });
});

test.describe("volver a suscribirse", () => {
  test("tras cancelar en la prueba no hay segunda prueba ni cobro doble", async ({ page }) => {
    await subscribeFromSettings(page);
    await cancelFromSettings(page);

    await subscribeFromSettings(page, "Mejorar a Pro");

    const [first, second] = (await gateway.state()).preapprovals;
    expect(first.status).toBe("cancelled");
    expect(second.status).toBe("authorized");
    expect(second.auto_recurring.start_date).toBe(first.auto_recurring.start_date);

    await page.getByRole("button", { name: "Ajustes" }).click();
    await expect(page.getByText(/Pro · se renueva el \d+ de \w+/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toBeVisible();
  });
});

test.describe("presupuestos (feature Pro)", () => {
  test("en Free la hoja de presupuesto ofrece Pro en lugar de guardar", async ({ page }) => {
    await openBudgetSheet(page, SHARED_CATEGORY.name);

    await expect(page.getByRole("button", { name: "Probar 15 días" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0);
  });

  test("con Pro se guarda un presupuesto y queda en la cuenta", async ({ page }) => {
    await subscribeFromSettings(page);

    await openBudgetSheet(page, SHARED_CATEGORY.name);
    await page.getByRole("textbox", { name: /^Presupuesto/ }).fill("300");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await expect(page.getByText("Presupuesto guardado")).toBeVisible();
    await expect
      .poll(() => page.evaluate(async () => ((await (await fetch("/api/budget")).json()) as unknown[]).length))
      .toBe(1);
  });
});
