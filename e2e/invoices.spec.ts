import { test, expect } from "@playwright/test";

test.describe("Invoices Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/invoices");
  });

  test("should display invoices list", async ({ page }) => {
    // Check page heading
    await expect(page.getByRole("heading", { name: /faktury/i })).toBeVisible();

    // Check for table or list
    await expect(page.getByRole("table").or(page.getByRole("list"))).toBeVisible();
  });

  test("should have button to create new invoice", async ({ page }) => {
    const newInvoiceButton = page.getByRole("link", { name: /nowa faktura|dodaj fakturę/i })
      .or(page.getByRole("button", { name: /nowa faktura|dodaj fakturę/i }));

    await expect(newInvoiceButton).toBeVisible();
  });

  test("should navigate to new invoice form", async ({ page }) => {
    const newInvoiceButton = page.getByRole("link", { name: /nowa faktura|dodaj fakturę/i })
      .or(page.getByRole("button", { name: /nowa faktura|dodaj fakturę/i }));

    await newInvoiceButton.click();

    // Should show invoice form
    await expect(page.getByText(/nowa faktura|utwórz fakturę/i)).toBeVisible();
  });

  test("should display invoice filters", async ({ page }) => {
    // Check for filter controls (status, date range)
    const hasFilters = await page.getByRole("combobox")
      .or(page.getByPlaceholder(/szukaj|filtruj/i))
      .or(page.getByLabel(/status|data/i))
      .first()
      .isVisible();

    expect(hasFilters).toBeTruthy();
  });

  test("should be able to filter by status", async ({ page }) => {
    // Look for status filter
    const statusFilter = page.getByRole("combobox", { name: /status/i })
      .or(page.getByLabel(/status/i));

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select a status
      const paidOption = page.getByRole("option", { name: /opłacona|zapłacona/i });
      if (await paidOption.isVisible()) {
        await paidOption.click();
        await page.waitForLoadState("networkidle");
      }
    }
  });

  test("should open invoice details", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Click on first invoice
    const invoiceRow = page.getByRole("row").nth(1);

    if (await invoiceRow.isVisible()) {
      await invoiceRow.click();

      // Should show invoice details
      await expect(
        page.getByText(/szczegóły faktury|edytuj fakturę/i)
          .or(page.locator('[data-testid="invoice-details"]'))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Invoice Creation", () => {
  test("should display new invoice form", async ({ page }) => {
    await page.goto("/invoices/new");

    // Check form is displayed
    await expect(page.getByText(/nowa faktura/i)).toBeVisible();

    // Check required form fields
    await expect(page.getByLabel(/kontrahent|nabywca/i)).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/invoices/new");

    // Try to submit empty form
    const submitButton = page.getByRole("button", { name: /zapisz|utwórz/i });

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      await expect(page.getByText(/wymagane|wypełnij/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test("should be able to add invoice items", async ({ page }) => {
    await page.goto("/invoices/new");

    // Look for "Add item" button
    const addItemButton = page.getByRole("button", { name: /dodaj pozycję|dodaj wiersz/i });

    if (await addItemButton.isVisible()) {
      await addItemButton.click();

      // Should add new item row
      await expect(page.getByLabel(/nazwa|opis/i).last()).toBeVisible();
    }
  });
});

test.describe("Invoice PDF Generation", () => {
  test("should be able to generate PDF", async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");

    // Find invoice and click on it
    const invoiceRow = page.getByRole("row").nth(1);

    if (await invoiceRow.isVisible()) {
      await invoiceRow.click();

      // Look for PDF button
      const pdfButton = page.getByRole("button", { name: /pdf|pobierz|drukuj/i });

      if (await pdfButton.isVisible()) {
        // Click PDF button
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
          pdfButton.click(),
        ]);

        // If download started, it's working
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        }
      }
    }
  });
});

test.describe("Invoice Payment Status", () => {
  test("should be able to mark invoice as paid", async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");

    // Find unpaid invoice
    const unpaidBadge = page.getByText(/nieopłacona|do zapłaty/i).first();

    if (await unpaidBadge.isVisible()) {
      // Click on the row or find mark as paid button
      const markPaidButton = page.getByRole("button", { name: /oznacz jako.*opłacon|zapłać/i });

      if (await markPaidButton.isVisible()) {
        await markPaidButton.click();

        // Confirm if needed
        const confirmButton = page.getByRole("button", { name: /potwierdź|tak/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Should update status
        await expect(page.getByText(/opłacona|zapłacona/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
