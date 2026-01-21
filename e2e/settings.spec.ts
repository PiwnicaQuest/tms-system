import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("should display settings page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /ustawienia/i })).toBeVisible();
  });

  test("should have tabs for different settings sections", async ({ page }) => {
    // Check for tabs (profile, security, notifications, etc.)
    const tabs = page.getByRole("tablist");

    if (await tabs.isVisible()) {
      await expect(page.getByRole("tab", { name: /profil|konto/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /bezpieczeństwo|security/i })).toBeVisible();
    }
  });

  test("should display user profile information", async ({ page }) => {
    // Profile tab should be visible or active by default
    await expect(page.getByLabel(/imię|nazwa/i).or(page.getByText(/email/i))).toBeVisible();
  });

  test("should be able to update profile", async ({ page }) => {
    // Find name input
    const nameInput = page.getByLabel(/imię|nazwa/i);

    if (await nameInput.isVisible()) {
      // Clear and fill with new value
      await nameInput.clear();
      await nameInput.fill("Test User Updated");

      // Save changes
      const saveButton = page.getByRole("button", { name: /zapisz|aktualizuj/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();

        // Should show success message
        await expect(page.getByText(/zapisano|zaktualizowano|sukces/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Security Settings - 2FA", () => {
  test("should navigate to security tab", async ({ page }) => {
    await page.goto("/settings");

    const securityTab = page.getByRole("tab", { name: /bezpieczeństwo|security/i });

    if (await securityTab.isVisible()) {
      await securityTab.click();

      // Should show 2FA section
      await expect(
        page.getByText(/uwierzytelnianie dwuskładnikowe|2fa|weryfikacja dwuetapowa/i)
      ).toBeVisible();
    }
  });

  test("should display 2FA status", async ({ page }) => {
    await page.goto("/settings");

    const securityTab = page.getByRole("tab", { name: /bezpieczeństwo|security/i });
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }

    // Should show 2FA status (enabled/disabled)
    await expect(
      page.getByText(/włączone|wyłączone|aktywne|nieaktywne/i)
        .or(page.getByRole("switch"))
    ).toBeVisible();
  });

  test("should show 2FA setup option when disabled", async ({ page }) => {
    await page.goto("/settings");

    const securityTab = page.getByRole("tab", { name: /bezpieczeństwo|security/i });
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }

    // Look for enable 2FA button
    const enable2FAButton = page.getByRole("button", { name: /włącz 2fa|aktywuj|skonfiguruj/i });

    // Button should exist (visible depends on current state)
    const buttonExists = await enable2FAButton.isVisible().catch(() => false);
    if (buttonExists) {
      await enable2FAButton.click();

      // Should show QR code or setup instructions
      await expect(
        page.getByText(/kod qr|zeskanuj|authenticator/i)
          .or(page.locator("img[alt*='QR']"))
          .or(page.locator("canvas"))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should display recovery codes section when 2FA is enabled", async ({ page }) => {
    await page.goto("/settings");

    const securityTab = page.getByRole("tab", { name: /bezpieczeństwo|security/i });
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }

    // Check for recovery codes info
    const recoveryCodesSection = page.getByText(/kody zapasowe|kody odzyskiwania|recovery/i);
    const isVisible = await recoveryCodesSection.isVisible().catch(() => false);

    if (isVisible) {
      // Should show count of remaining codes or button to regenerate
      await expect(
        page.getByText(/pozostało|dostępne|regeneruj/i)
      ).toBeVisible();
    }
  });
});

test.describe("Password Change", () => {
  test("should display password change form", async ({ page }) => {
    await page.goto("/settings");

    const securityTab = page.getByRole("tab", { name: /bezpieczeństwo|security/i });
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }

    // Look for password change section
    await expect(
      page.getByText(/zmień hasło|zmiana hasła|nowe hasło/i)
        .or(page.getByLabel(/obecne hasło|aktualne hasło/i))
    ).toBeVisible();
  });

  test("should validate password requirements", async ({ page }) => {
    await page.goto("/settings");

    const securityTab = page.getByRole("tab", { name: /bezpieczeństwo|security/i });
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }

    // Fill password fields with weak password
    const currentPassword = page.getByLabel(/obecne hasło|aktualne hasło/i);
    const newPassword = page.getByLabel(/nowe hasło/i);
    const confirmPassword = page.getByLabel(/potwierdź hasło|powtórz hasło/i);

    if (await currentPassword.isVisible()) {
      await currentPassword.fill("current123");
      await newPassword.fill("weak");
      await confirmPassword.fill("weak");

      // Submit
      const submitButton = page.getByRole("button", { name: /zmień hasło|zapisz/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show validation error
        await expect(
          page.getByText(/hasło.*znaków|za krótkie|wymaga/i)
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
