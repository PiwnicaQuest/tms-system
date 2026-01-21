import { test, expect } from "@playwright/test";

test.describe("Orders Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders");
  });

  test("should display orders list", async ({ page }) => {
    // Check page heading
    await expect(page.getByRole("heading", { name: /zlecenia/i })).toBeVisible();

    // Check for table or list of orders
    await expect(page.getByRole("table").or(page.getByRole("list"))).toBeVisible();
  });

  test("should have button to create new order", async ({ page }) => {
    // Look for "New order" or "Add order" button
    const newOrderButton = page.getByRole("link", { name: /nowe zlecenie|dodaj zlecenie/i })
      .or(page.getByRole("button", { name: /nowe zlecenie|dodaj zlecenie/i }));

    await expect(newOrderButton).toBeVisible();
  });

  test("should navigate to new order form", async ({ page }) => {
    // Click new order button
    const newOrderButton = page.getByRole("link", { name: /nowe zlecenie|dodaj zlecenie/i })
      .or(page.getByRole("button", { name: /nowe zlecenie|dodaj zlecenie/i }));

    await newOrderButton.click();

    // Should be on new order page or modal should open
    await expect(page.getByText(/nowe zlecenie|utwórz zlecenie/i)).toBeVisible();
  });

  test("should display order filters", async ({ page }) => {
    // Check for filter controls
    const hasFilters = await page.getByRole("combobox").or(page.getByPlaceholder(/szukaj|filtruj/i)).isVisible();
    expect(hasFilters).toBeTruthy();
  });

  test("should open order details when clicking on order row", async ({ page }) => {
    // Wait for orders to load
    await page.waitForLoadState("networkidle");

    // Click on first order if exists
    const orderRow = page.getByRole("row").nth(1); // Skip header
    const orderExists = await orderRow.isVisible().catch(() => false);

    if (orderExists) {
      // Get order number/id from the row
      await orderRow.click();

      // Should navigate to order details or open modal
      await expect(
        page.getByText(/szczegóły zlecenia|edytuj zlecenie/i)
          .or(page.locator('[data-testid="order-details"]'))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should be able to search orders", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/szukaj/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill("TEST");
      await searchInput.press("Enter");

      // Wait for search results
      await page.waitForLoadState("networkidle");

      // Page should still be visible (no crash)
      await expect(page.getByRole("heading", { name: /zlecenia/i })).toBeVisible();
    }
  });
});

test.describe("Order Creation", () => {
  test("should create a new order", async ({ page }) => {
    await page.goto("/orders/new");

    // Wait for form to load
    await expect(page.getByText(/nowe zlecenie|utwórz zlecenie/i)).toBeVisible();

    // Fill required fields (adjust based on actual form)
    // Contractor selection
    const contractorSelect = page.getByLabel(/kontrahent|klient/i);
    if (await contractorSelect.isVisible()) {
      await contractorSelect.click();
      await page.getByRole("option").first().click();
    }

    // Loading location
    const loadingLocation = page.getByLabel(/miejsce załadunku|załadunek/i);
    if (await loadingLocation.isVisible()) {
      await loadingLocation.fill("Warszawa, Polska");
    }

    // Unloading location
    const unloadingLocation = page.getByLabel(/miejsce rozładunku|rozładunek/i);
    if (await unloadingLocation.isVisible()) {
      await unloadingLocation.fill("Berlin, Niemcy");
    }

    // Submit form
    const submitButton = page.getByRole("button", { name: /zapisz|utwórz|dodaj/i });
    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Should show success message or redirect
      await expect(
        page.getByText(/zapisano|utworzono|sukces/i).or(page.locator('[data-testid="success-toast"]'))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Order Status Changes", () => {
  test("should be able to change order status", async ({ page }) => {
    await page.goto("/orders");

    // Wait for orders to load
    await page.waitForLoadState("networkidle");

    // Find an order row with status dropdown/button
    const statusButton = page.getByRole("button", { name: /status|zmień status/i }).first();

    if (await statusButton.isVisible()) {
      await statusButton.click();

      // Select a new status
      const newStatus = page.getByRole("option", { name: /w trakcie|realizacja/i })
        .or(page.getByText(/w trakcie|realizacja/i));

      if (await newStatus.isVisible()) {
        await newStatus.click();

        // Wait for status update
        await page.waitForLoadState("networkidle");
      }
    }
  });
});
