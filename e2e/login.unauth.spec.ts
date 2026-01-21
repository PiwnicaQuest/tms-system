import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display login form", async ({ page }) => {
    // Check page title/heading
    await expect(page.getByRole("heading", { name: /logowanie/i })).toBeVisible();

    // Check form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /zaloguj/i })).toBeVisible();
  });

  test("should show error for empty credentials", async ({ page }) => {
    // Click login without filling form
    await page.getByRole("button", { name: /zaloguj/i }).click();

    // Should show validation error
    await expect(page.getByText(/email jest wymagany|wypełnij pole/i)).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill("invalid@test.com");
    await page.getByLabel(/hasło/i).fill("wrongpassword");

    // Click login
    await page.getByRole("button", { name: /zaloguj/i }).click();

    // Should show error message
    await expect(
      page.getByText(/nieprawidłowy email lub hasło|błędne dane/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("should redirect to dashboard after successful login", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || "admin@bakus.pl";
    const password = process.env.TEST_USER_PASSWORD || "admin123";

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/hasło/i).fill(password);
    await page.getByRole("button", { name: /zaloguj/i }).click();

    // Should redirect to dashboard
    await page.waitForURL(/\/(dashboard|verify-2fa)/, { timeout: 10000 });
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Try to access protected route
    await page.goto("/orders");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
