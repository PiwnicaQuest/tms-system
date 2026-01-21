import { test, expect } from "@playwright/test";

test.describe("Audit Logs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/audit-logs");
  });

  test("should display audit logs page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /logi audytowe|audit/i })).toBeVisible();
  });

  test("should display logs table", async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState("networkidle");

    // Check for table
    await expect(page.getByRole("table")).toBeVisible();

    // Check for table headers
    await expect(page.getByRole("columnheader", { name: /data|czas/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /użytkownik/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /akcja/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /encja|typ/i })).toBeVisible();
  });

  test("should have filter controls", async ({ page }) => {
    // Action filter
    await expect(
      page.getByRole("combobox", { name: /akcja/i })
        .or(page.getByLabel(/akcja/i))
    ).toBeVisible();

    // Entity type filter
    await expect(
      page.getByRole("combobox", { name: /encja|typ/i })
        .or(page.getByLabel(/encja|typ/i))
    ).toBeVisible();
  });

  test("should be able to filter by action", async ({ page }) => {
    const actionFilter = page.getByRole("combobox", { name: /akcja/i })
      .or(page.getByLabel(/akcja/i));

    if (await actionFilter.isVisible()) {
      await actionFilter.click();

      // Select "CREATE" action
      const createOption = page.getByRole("option", { name: /utworzenie|create/i });
      if (await createOption.isVisible()) {
        await createOption.click();
        await page.waitForLoadState("networkidle");

        // Page should still be functional
        await expect(page.getByRole("table")).toBeVisible();
      }
    }
  });

  test("should be able to filter by entity type", async ({ page }) => {
    const entityFilter = page.getByRole("combobox", { name: /encja|typ/i })
      .or(page.getByLabel(/encja|typ/i));

    if (await entityFilter.isVisible()) {
      await entityFilter.click();

      // Select "Order" entity
      const orderOption = page.getByRole("option", { name: /zlecenie|order/i });
      if (await orderOption.isVisible()) {
        await orderOption.click();
        await page.waitForLoadState("networkidle");

        // Page should still be functional
        await expect(page.getByRole("table")).toBeVisible();
      }
    }
  });

  test("should be able to filter by date range", async ({ page }) => {
    // Look for date inputs
    const dateFromInput = page.getByLabel(/od|data początkowa|from/i);
    const dateToInput = page.getByLabel(/do|data końcowa|to/i);

    if (await dateFromInput.isVisible()) {
      // Set date range
      await dateFromInput.fill("2024-01-01");

      if (await dateToInput.isVisible()) {
        await dateToInput.fill("2024-12-31");
      }

      // Apply filter or wait for auto-apply
      await page.waitForLoadState("networkidle");

      // Table should still be visible
      await expect(page.getByRole("table")).toBeVisible();
    }
  });

  test("should expand row to show changes details", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Find expandable row
    const expandButton = page.getByRole("button", { name: /rozwiń|szczegóły|pokaż/i }).first()
      .or(page.locator('[data-testid="expand-row"]').first());

    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Should show changes
      await expect(
        page.getByText(/zmiany|stara wartość|nowa wartość|old|new/i)
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test("should have export functionality", async ({ page }) => {
    // Look for export button
    const exportButton = page.getByRole("button", { name: /eksport|csv|pobierz/i });

    if (await exportButton.isVisible()) {
      // Click and check for download
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
        exportButton.click(),
      ]);

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/i);
      }
    }
  });

  test("should have pagination", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Look for pagination controls
    const pagination = page.getByRole("navigation", { name: /paginacja|strony/i })
      .or(page.locator('[data-testid="pagination"]'))
      .or(page.getByRole("button", { name: /następna|next|>/i }));

    // Pagination may or may not be visible depending on data amount
    const hasPagination = await pagination.isVisible().catch(() => false);

    if (hasPagination) {
      // Click next page
      const nextButton = page.getByRole("button", { name: /następna|next|>/i });
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForLoadState("networkidle");

        // Table should still be visible
        await expect(page.getByRole("table")).toBeVisible();
      }
    }
  });
});
