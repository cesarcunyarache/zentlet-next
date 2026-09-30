import type { Page } from "@playwright/test";
import { expect, freshAccount, SHARED_CATEGORY, test } from "./fixtures";

async function registerTransaction(
  page: Page,
  { description, amount, type = "Gasto" }: { description: string; amount: string; type?: "Gasto" | "Ingreso" },
) {
  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  await page.getByLabel("Descripción").fill(description);
  await page.getByRole("group", { name: "Gasto o ingreso" }).getByRole("button", { name: type }).click();
  await page.getByLabel("Monto").fill(amount);
  const category = page
    .getByRole("group", { name: "Categoría", exact: true })
    .getByRole("button", { name: SHARED_CATEGORY.name });
  if ((await category.getAttribute("aria-pressed")) !== "true") await category.click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
}

test.describe("movimientos", () => {
  test("registrar un gasto y un ingreso actualiza el total y queda guardado en la cuenta", async ({ browser }) => {
    const { page } = await freshAccount(browser);

    await registerTransaction(page, { description: "Menú del día", amount: "18.50" });
    await expect(page.getByText("Gasto registrado")).toBeVisible();
    await registerTransaction(page, { description: "Sueldo", amount: "100", type: "Ingreso" });
    await expect(page.getByText("Ingreso registrado")).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/81\.50/);
    await page.reload();
    await expect(page.getByText("Menú del día")).toBeVisible();
    await expect(page.getByText("Sueldo")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/81\.50/);
  });

  test("editar y eliminar un movimiento", async ({ browser }) => {
    const { page } = await freshAccount(browser);
    await registerTransaction(page, { description: "Taxi", amount: "12" });
    await expect(page.getByText("Gasto registrado")).toBeVisible();

    await page.getByText("Taxi").click();
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("Monto").fill("15");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Movimiento actualizado")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/15\.00/);

    await page.getByText("Taxi").click();
    await page.getByRole("button", { name: "Eliminar movimiento" }).click();
    await page
      .getByRole("button", { name: /Eliminar/ })
      .last()
      .click();
    await expect(page.getByText("Movimiento eliminado")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Ajustes" })).toBeVisible();
    await expect(page.getByText("Taxi")).toHaveCount(0);
  });

  test("la búsqueda filtra por nombre", async ({ browser }) => {
    const { page } = await freshAccount(browser);
    await registerTransaction(page, { description: "Cine", amount: "20" });
    await registerTransaction(page, { description: "Gasolina", amount: "50" });
    await expect(page.getByText("Gasolina")).toBeVisible();

    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("searchbox").or(page.getByLabel("Buscar movimientos")).first().fill("gaso");

    await expect(page.getByText("Gasolina")).toBeVisible();
    await expect(page.getByText("Cine")).toHaveCount(0);
  });
});

test.describe("categorías", () => {
  test("crear y renombrar una categoría", async ({ browser }) => {
    const { page } = await freshAccount(browser);

    await page.getByRole("button", { name: "Categorías" }).click();
    await page.getByRole("button", { name: "Añadir categoría" }).click();
    await page.getByLabel("Nombre de la categoría").fill("Mascotas");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await page.getByRole("button", { name: "Mascotas" }).click();
    await page.getByLabel("Nombre de la categoría").fill("Mi perro");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await expect
      .poll(() =>
        page.evaluate(async () =>
          ((await (await fetch("/api/category")).json()) as { name: string }[]).map((c) => c.name),
        ),
      )
      .toEqual(expect.arrayContaining(["Mi perro"]));
    await page.reload();
    await page.getByRole("button", { name: "Categorías" }).click();
    await expect(page.getByRole("button", { name: "Mi perro" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mascotas" })).toHaveCount(0);
  });
});
