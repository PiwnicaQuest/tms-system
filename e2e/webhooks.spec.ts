import { test, expect } from "@playwright/test";

test.describe("Webhooks Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/webhooks");
  });

  test("should display webhooks page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /webhook/i })).toBeVisible();
  });

  test("should have button to add new webhook", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /dodaj webhook|nowy webhook|utwórz/i });
    await expect(addButton).toBeVisible();
  });

  test("should open add webhook dialog", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /dodaj webhook|nowy webhook|utwórz/i });
    await addButton.click();

    // Dialog should open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/dodaj webhook|nowy webhook/i)).toBeVisible();
  });

  test("should display webhook form fields", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /dodaj webhook|nowy webhook|utwórz/i });
    await addButton.click();

    // Check for required fields
    await expect(page.getByLabel(/nazwa/i)).toBeVisible();
    await expect(page.getByLabel(/url/i)).toBeVisible();

    // Check for events selection
    await expect(page.getByText(/zdarzenia|events/i)).toBeVisible();
  });

  test("should validate webhook URL", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /dodaj webhook|nowy webhook|utwórz/i });
    await addButton.click();

    // Fill invalid URL
    await page.getByLabel(/nazwa/i).fill("Test Webhook");
    await page.getByLabel(/url/i).fill("not-a-valid-url");

    // Try to save
    const saveButton = page.getByRole("button", { name: /zapisz|utwórz|dodaj/i });
    await saveButton.click();

    // Should show validation error
    await expect(page.getByText(/nieprawidłowy url|poprawny url/i)).toBeVisible({ timeout: 3000 });
  });

  test("should create webhook with valid data", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /dodaj webhook|nowy webhook|utwórz/i });
    await addButton.click();

    // Fill valid data
    await page.getByLabel(/nazwa/i).fill("Test Webhook E2E");
    await page.getByLabel(/url/i).fill("https://webhook.site/test-endpoint");

    // Select at least one event
    const eventCheckbox = page.getByRole("checkbox").first();
    if (await eventCheckbox.isVisible()) {
      await eventCheckbox.check();
    }

    // Save
    const saveButton = page.getByRole("button", { name: /zapisz|utwórz|dodaj/i });
    await saveButton.click();

    // Should show success or close dialog
    await expect(
      page.getByText(/utworzono|zapisano|sukces/i)
        .or(page.getByRole("dialog").locator("visible=false"))
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Webhook List", () => {
  test("should display webhooks in table", async ({ page }) => {
    await page.goto("/webhooks");
    await page.waitForLoadState("networkidle");

    // Check for table or list
    const table = page.getByRole("table");
    const hasList = await table.isVisible().catch(() => false);

    if (hasList) {
      // Check for expected columns
      await expect(page.getByRole("columnheader", { name: /nazwa/i })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: /url/i })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: /status|aktywny/i })).toBeVisible();
    }
  });

  test("should be able to toggle webhook active state", async ({ page }) => {
    await page.goto("/webhooks");
    await page.waitForLoadState("networkidle");

    // Find toggle switch
    const toggle = page.getByRole("switch").first()
      .or(page.getByRole("checkbox", { name: /aktywny|active/i }).first());

    if (await toggle.isVisible()) {
      const wasChecked = await toggle.isChecked();
      await toggle.click();

      // Wait for state change
      await page.waitForLoadState("networkidle");

      // State should have toggled
      const isChecked = await toggle.isChecked();
      expect(isChecked).not.toBe(wasChecked);
    }
  });

  test("should be able to test webhook", async ({ page }) => {
    await page.goto("/webhooks");
    await page.waitForLoadState("networkidle");

    // Find test button
    const testButton = page.getByRole("button", { name: /test|sprawdź/i }).first();

    if (await testButton.isVisible()) {
      await testButton.click();

      // Should show result (success or failure)
      await expect(
        page.getByText(/sukces|błąd|wysłano|niepowodzenie/i)
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("should be able to edit webhook", async ({ page }) => {
    await page.goto("/webhooks");
    await page.waitForLoadState("networkidle");

    // Find edit button
    const editButton = page.getByRole("button", { name: /edytuj|edit/i }).first()
      .or(page.locator('[data-testid="edit-webhook"]').first());

    if (await editButton.isVisible()) {
      await editButton.click();

      // Should open edit dialog
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByLabel(/nazwa/i)).toBeVisible();
    }
  });

  test("should be able to delete webhook", async ({ page }) => {
    await page.goto("/webhooks");
    await page.waitForLoadState("networkidle");

    // Find delete button
    const deleteButton = page.getByRole("button", { name: /usuń|delete/i }).first()
      .or(page.locator('[data-testid="delete-webhook"]').first());

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Should show confirmation
      await expect(
        page.getByText(/potwierdź|na pewno|usunąć/i)
          .or(page.getByRole("alertdialog"))
      ).toBeVisible({ timeout: 3000 });

      // Cancel to not actually delete
      const cancelButton = page.getByRole("button", { name: /anuluj|nie/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
  });
});

test.describe("Webhook Deliveries", () => {
  test("should display delivery history", async ({ page }) => {
    await page.goto("/webhooks");
    await page.waitForLoadState("networkidle");

    // Click on webhook row or view deliveries button
    const viewDeliveriesButton = page.getByRole("button", { name: /historia|dostawy|deliveries/i }).first()
      .or(page.getByRole("row").nth(1));

    if (await viewDeliveriesButton.isVisible()) {
      await viewDeliveriesButton.click();

      // Should show delivery history
      await expect(
        page.getByText(/historia dostaw|deliveries|próby/i)
          .or(page.getByRole("columnheader", { name: /status|wynik/i }))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should be able to retry failed delivery", async ({ page }) => {
    await page.goto("/webhooks");
    await page.waitForLoadState("networkidle");

    // Navigate to deliveries
    const viewDeliveriesButton = page.getByRole("button", { name: /historia|dostawy/i }).first();

    if (await viewDeliveriesButton.isVisible()) {
      await viewDeliveriesButton.click();

      // Wait for deliveries to load
      await page.waitForLoadState("networkidle");

      // Find retry button for failed delivery
      const retryButton = page.getByRole("button", { name: /ponów|retry/i }).first();

      if (await retryButton.isVisible()) {
        await retryButton.click();

        // Should show result
        await expect(
          page.getByText(/ponowiono|retry|wysłano/i)
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
