import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

/**
 * This setup authenticates a test user and saves the session state
 * for reuse in other tests. This avoids logging in for every test.
 */
setup("authenticate", async ({ page }) => {
  // Go to login page
  await page.goto("/login");

  // Wait for the login form to be visible
  await expect(page.getByRole("heading", { name: /logowanie/i })).toBeVisible();

  // Fill in credentials (use test credentials from environment or defaults)
  const email = process.env.TEST_USER_EMAIL || "admin@bakus.pl";
  const password = process.env.TEST_USER_PASSWORD || "admin123";

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/hasło/i).fill(password);

  // Click login button
  await page.getByRole("button", { name: /zaloguj/i }).click();

  // Wait for redirect to dashboard (successful login)
  await page.waitForURL("/dashboard", { timeout: 10000 });

  // Verify we're on the dashboard
  await expect(page.getByRole("heading", { name: /panel główny|dashboard/i })).toBeVisible();

  // Save the authentication state
  await page.context().storageState({ path: authFile });
});
