import { expect, test as setup } from "@playwright/test";
import { AUTH_STATE } from "./env";
import { apiStatus, createAccount, SHARED_CATEGORY, SHARED_USER } from "./fixtures";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

const sampleExpense = () => ({
  id: "2f1e4c5a-8b7d-4e6f-9a0b-1c2d3e4f5a6b",
  type: "expense",
  amount: 25,
  description: "Almuerzo",
  categoryId: SHARED_CATEGORY.id,
  transactionDate: today(),
});

setup("crea la cuenta de prueba con una categoría, un gasto y guarda la sesión", async ({ page }) => {
  await createAccount(page, SHARED_USER);
  expect(await apiStatus(page, "/api/category", { method: "POST", body: SHARED_CATEGORY })).toBe(201);
  expect(await apiStatus(page, "/api/transaction", { method: "POST", body: sampleExpense() })).toBe(201);
  await page.context().storageState({ path: AUTH_STATE });
});
