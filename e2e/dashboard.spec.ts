import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("should display dashboard with statistics", async ({ page }) => {
    // Check main heading
    await expect(
      page.getByRole("heading", { name: /panel główny|dashboard/i })
    ).toBeVisible();

    // Check statistics cards are present
    await expect(page.getByText(/zlecenia|zamówienia/i).first()).toBeVisible();
    await expect(page.getByText(/pojazdy|flota/i).first()).toBeVisible();
  });

  test("should have working navigation sidebar", async ({ page }) => {
    // Check sidebar links
    await expect(page.getByRole("link", { name: /zlecenia/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /faktury/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /pojazdy/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /kierowcy/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /kontrahenci/i })).toBeVisible();
  });

  test("should navigate to orders page", async ({ page }) => {
    await page.getByRole("link", { name: /zlecenia/i }).click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole("heading", { name: /zlecenia/i })).toBeVisible();
  });

  test("should navigate to invoices page", async ({ page }) => {
    await page.getByRole("link", { name: /faktury/i }).click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.getByRole("heading", { name: /faktury/i })).toBeVisible();
  });

  test("should navigate to vehicles page", async ({ page }) => {
    await page.getByRole("link", { name: /pojazdy/i }).click();
    await expect(page).toHaveURL(/\/vehicles/);
    await expect(page.getByRole("heading", { name: /pojazdy|flota/i })).toBeVisible();
  });

  test("should navigate to drivers page", async ({ page }) => {
    await page.getByRole("link", { name: /kierowcy/i }).click();
    await expect(page).toHaveURL(/\/drivers/);
    await expect(page.getByRole("heading", { name: /kierowcy/i })).toBeVisible();
  });

  test("should navigate to contractors page", async ({ page }) => {
    await page.getByRole("link", { name: /kontrahenci/i }).click();
    await expect(page).toHaveURL(/\/contractors/);
    await expect(page.getByRole("heading", { name: /kontrahenci/i })).toBeVisible();
  });

  test("should have user menu in header", async ({ page }) => {
    // Look for user avatar or menu trigger
    const userMenu = page.getByRole("button", { name: /profil|użytkownik|menu/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
      // Check menu items
      await expect(page.getByText(/ustawienia|wyloguj/i)).toBeVisible();
    }
  });
});
