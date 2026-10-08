import { expect, newPage, newUser, test } from "./fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("registro e inicio de sesión", () => {
  test("registrarse por formulario abre la app con la bienvenida, que no vuelve tras saltarla", async ({ browser }) => {
    const user = newUser("registro");
    const page = await newPage(browser);
    await page.goto("/auth/sign-up");

    await page.getByLabel("Nombre").fill(user.name);
    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(user.password);
    await page.getByLabel("Confirmar contraseña").fill(user.password);
    await page.getByRole("checkbox").check({ force: true });
    await page.getByRole("button", { name: "Registrarse" }).click();

    await page.waitForURL(/\/admin/);
    const onboarding = page.getByRole("dialog", { name: "Escribe como hablas" });
    await expect(onboarding).toBeVisible();
    await onboarding.getByRole("button", { name: "Saltar" }).click();
    await expect(onboarding).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("button", { name: "Ajustes" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("el registro valida los campos antes de enviar", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByLabel("Contraseña", { exact: true }).fill("Zentlet-e2e-2026!");
    await page.getByLabel("Confirmar contraseña").fill("otra-contraseña");
    await page.getByRole("checkbox").check({ force: true });
    await page.getByRole("button", { name: "Registrarse" }).click();

    await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test("iniciar sesión rechaza una contraseña incorrecta y acepta la buena", async ({ browser }) => {
    const user = newUser("login");
    const signup = await newPage(browser);
    await signup.goto("/auth/sign-up");
    await signup.getByLabel("Nombre").fill(user.name);
    await signup.getByLabel("Correo").fill(user.email);
    await signup.getByLabel("Contraseña", { exact: true }).fill(user.password);
    await signup.getByLabel("Confirmar contraseña").fill(user.password);
    await signup.getByRole("checkbox").check({ force: true });
    await signup.getByRole("button", { name: "Registrarse" }).click();
    await signup.waitForURL(/\/admin/);

    const page = await newPage(browser);
    await page.goto("/auth/sign-in");
    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta-123");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();

    await page.getByLabel("Contraseña", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL(/\/admin/);
  });
});
