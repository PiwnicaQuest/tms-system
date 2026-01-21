import { prisma } from "@/lib/db/prisma";
import { format } from "date-fns";
import { InvoiceStatus } from "@prisma/client";

export type ExportFormat = "csv" | "xml" | "json";
export type ExportType = "invoices" | "costs" | "settlements";

export interface ExportFilters {
  dateFrom: Date;
  dateTo: Date;
  status?: InvoiceStatus;
  contractorId?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  content: string;
  mimeType: string;
  recordCount: number;
  error?: string;
}

// CSV Export helpers
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

function formatAmount(amount: number | null): string {
  if (amount === null) return "0.00";
  return amount.toFixed(2);
}

// Export invoices
export async function exportInvoices(
  tenantId: string,
  filters: ExportFilters,
  exportFormat: ExportFormat
): Promise<ExportResult> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
        ...(filters.status && { status: filters.status }),
        ...(filters.contractorId && { contractorId: filters.contractorId }),
      },
      include: {
        contractor: true,
        orders: {
          select: {
            orderNumber: true,
            originCity: true,
            destinationCity: true,
          },
          take: 1,
        },
      },
      orderBy: { issueDate: "asc" },
    });

    if (invoices.length === 0) {
      return {
        success: false,
        filename: "",
        content: "",
        mimeType: "",
        recordCount: 0,
        error: "Brak faktur do eksportu w podanym zakresie",
      };
    }

    const dateRange = `${format(filters.dateFrom, "yyyyMMdd")}-${format(filters.dateTo, "yyyyMMdd")}`;

    switch (exportFormat) {
      case "csv":
        return exportInvoicesCSV(invoices, dateRange);
      case "xml":
        return exportInvoicesXML(invoices, dateRange);
      case "json":
        return exportInvoicesJSON(invoices, dateRange);
      default:
        return {
          success: false,
          filename: "",
          content: "",
          mimeType: "",
          recordCount: 0,
          error: "Nieobsługiwany format eksportu",
        };
    }
  } catch (error) {
    console.error("Export invoices error:", error);
    return {
      success: false,
      filename: "",
      content: "",
      mimeType: "",
      recordCount: 0,
      error: "Błąd eksportu faktur",
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportInvoicesCSV(invoices: any[], dateRange: string): ExportResult {
  const headers = [
    "Numer faktury",
    "Data wystawienia",
    "Data sprzedaży",
    "Termin płatności",
    "Kontrahent - Nazwa",
    "Kontrahent - NIP",
    "Kontrahent - Adres",
    "Kontrahent - Miasto",
    "Kontrahent - Kod pocztowy",
    "Numer zlecenia",
    "Trasa",
    "Netto",
    "VAT",
    "Brutto",
    "Waluta",
    "Status",
    "Uwagi",
  ];

  const rows = invoices.map((inv) => {
    const order = inv.orders?.[0];
    return [
      escapeCSV(inv.invoiceNumber),
      formatDate(inv.issueDate),
      formatDate(inv.saleDate),
      formatDate(inv.dueDate),
      escapeCSV(inv.contractor?.name),
      escapeCSV(inv.contractor?.nip),
      escapeCSV(inv.contractor?.address),
      escapeCSV(inv.contractor?.city),
      escapeCSV(inv.contractor?.postalCode),
      escapeCSV(order?.orderNumber),
      escapeCSV(order ? `${order.originCity} - ${order.destinationCity}` : ""),
      formatAmount(inv.netAmount),
      formatAmount(inv.vatAmount),
      formatAmount(inv.grossAmount),
      escapeCSV(inv.currency),
      escapeCSV(inv.status),
      escapeCSV(inv.notes),
    ];
  });

  const content = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");

  return {
    success: true,
    filename: `faktury-${dateRange}.csv`,
    content: "\uFEFF" + content, // BOM for Excel UTF-8
    mimeType: "text/csv; charset=utf-8",
    recordCount: invoices.length,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportInvoicesXML(invoices: any[], dateRange: string): ExportResult {
  const xmlItems = invoices
    .map((inv) => {
      const order = inv.orders?.[0];
      return `
    <Faktura>
      <NumerFaktury>${escapeXML(inv.invoiceNumber)}</NumerFaktury>
      <DataWystawienia>${formatDate(inv.issueDate)}</DataWystawienia>
      <DataSprzedazy>${formatDate(inv.saleDate)}</DataSprzedazy>
      <TerminPlatnosci>${formatDate(inv.dueDate)}</TerminPlatnosci>
      <Kontrahent>
        <Nazwa>${escapeXML(inv.contractor?.name)}</Nazwa>
        <NIP>${escapeXML(inv.contractor?.nip)}</NIP>
        <Adres>${escapeXML(inv.contractor?.address)}</Adres>
        <Miasto>${escapeXML(inv.contractor?.city)}</Miasto>
        <KodPocztowy>${escapeXML(inv.contractor?.postalCode)}</KodPocztowy>
      </Kontrahent>
      <NumerZlecenia>${escapeXML(order?.orderNumber)}</NumerZlecenia>
      <KwotaNetto>${formatAmount(inv.netAmount)}</KwotaNetto>
      <KwotaVAT>${formatAmount(inv.vatAmount)}</KwotaVAT>
      <KwotaBrutto>${formatAmount(inv.grossAmount)}</KwotaBrutto>
      <Waluta>${inv.currency}</Waluta>
      <Status>${inv.status}</Status>
    </Faktura>`;
    })
    .join("");

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<EksportFaktur>
  <DataEksportu>${format(new Date(), "yyyy-MM-dd HH:mm:ss")}</DataEksportu>
  <OkresOd>${formatDate(new Date())}</OkresOd>
  <OkresDo>${formatDate(new Date())}</OkresDo>
  <LiczbaFaktur>${invoices.length}</LiczbaFaktur>
  <Faktury>${xmlItems}
  </Faktury>
</EksportFaktur>`;

  return {
    success: true,
    filename: `faktury-${dateRange}.xml`,
    content,
    mimeType: "application/xml; charset=utf-8",
    recordCount: invoices.length,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportInvoicesJSON(invoices: any[], dateRange: string): ExportResult {
  const data = {
    exportDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    recordCount: invoices.length,
    invoices: invoices.map((inv) => {
      const order = inv.orders?.[0];
      return {
        invoiceNumber: inv.invoiceNumber,
        issueDate: formatDate(inv.issueDate),
        saleDate: formatDate(inv.saleDate),
        dueDate: formatDate(inv.dueDate),
        contractor: {
          name: inv.contractor?.name,
          nip: inv.contractor?.nip,
          address: inv.contractor?.address,
          city: inv.contractor?.city,
          postalCode: inv.contractor?.postalCode,
        },
        orderNumber: order?.orderNumber,
        route: order ? `${order.originCity} - ${order.destinationCity}` : null,
        amounts: {
          net: inv.netAmount,
          vat: inv.vatAmount,
          gross: inv.grossAmount,
        },
        currency: inv.currency,
        status: inv.status,
      };
    }),
  };

  return {
    success: true,
    filename: `faktury-${dateRange}.json`,
    content: JSON.stringify(data, null, 2),
    mimeType: "application/json; charset=utf-8",
    recordCount: invoices.length,
  };
}

// Export costs
export async function exportCosts(
  tenantId: string,
  filters: ExportFilters,
  exportFormat: ExportFormat
): Promise<ExportResult> {
  try {
    const costs = await prisma.cost.findMany({
      where: {
        tenantId,
        date: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
      },
      include: {
        vehicle: {
          select: {
            registrationNumber: true,
            brand: true,
            model: true,
          },
        },
        driver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    if (costs.length === 0) {
      return {
        success: false,
        filename: "",
        content: "",
        mimeType: "",
        recordCount: 0,
        error: "Brak kosztów do eksportu w podanym zakresie",
      };
    }

    const dateRange = `${format(filters.dateFrom, "yyyyMMdd")}-${format(filters.dateTo, "yyyyMMdd")}`;

    switch (exportFormat) {
      case "csv":
        return exportCostsCSV(costs, dateRange);
      case "xml":
        return exportCostsXML(costs, dateRange);
      case "json":
        return exportCostsJSON(costs, dateRange);
      default:
        return {
          success: false,
          filename: "",
          content: "",
          mimeType: "",
          recordCount: 0,
          error: "Nieobsługiwany format eksportu",
        };
    }
  } catch (error) {
    console.error("Export costs error:", error);
    return {
      success: false,
      filename: "",
      content: "",
      mimeType: "",
      recordCount: 0,
      error: "Błąd eksportu kosztów",
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportCostsCSV(costs: any[], dateRange: string): ExportResult {
  const headers = [
    "Data",
    "Kategoria",
    "Opis",
    "Kwota",
    "Waluta",
    "Pojazd",
    "Kierowca",
    "ID zlecenia",
    "Uwagi",
  ];

  const categoryLabels: Record<string, string> = {
    FUEL: "Paliwo",
    TOLL: "Opłaty drogowe",
    PARKING: "Parking",
    SERVICE: "Serwis",
    INSURANCE: "Ubezpieczenie",
    TAX: "Podatki",
    SALARY: "Wynagrodzenie",
    FINE: "Mandaty",
    OFFICE: "Biuro",
    OTHER: "Inne",
  };

  const rows = costs.map((cost) => [
    formatDate(cost.date),
    escapeCSV(categoryLabels[cost.category] || cost.category),
    escapeCSV(cost.description),
    formatAmount(cost.amount),
    escapeCSV(cost.currency),
    escapeCSV(cost.vehicle?.registrationNumber),
    escapeCSV(cost.driver ? `${cost.driver.firstName} ${cost.driver.lastName}` : ""),
    escapeCSV(cost.orderId),
    escapeCSV(cost.notes),
  ]);

  const content = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");

  return {
    success: true,
    filename: `koszty-${dateRange}.csv`,
    content: "\uFEFF" + content,
    mimeType: "text/csv; charset=utf-8",
    recordCount: costs.length,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportCostsXML(costs: any[], dateRange: string): ExportResult {
  const xmlItems = costs
    .map(
      (cost) => `
    <Koszt>
      <Data>${formatDate(cost.date)}</Data>
      <Kategoria>${cost.category}</Kategoria>
      <Opis>${escapeXML(cost.description)}</Opis>
      <Kwota>${formatAmount(cost.amount)}</Kwota>
      <Waluta>${cost.currency}</Waluta>
      <Pojazd>${escapeXML(cost.vehicle?.registrationNumber)}</Pojazd>
      <Kierowca>${escapeXML(cost.driver ? `${cost.driver.firstName} ${cost.driver.lastName}` : "")}</Kierowca>
      <IDZlecenia>${escapeXML(cost.orderId)}</IDZlecenia>
    </Koszt>`
    )
    .join("");

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<EksportKosztow>
  <DataEksportu>${format(new Date(), "yyyy-MM-dd HH:mm:ss")}</DataEksportu>
  <LiczbaKosztow>${costs.length}</LiczbaKosztow>
  <Koszty>${xmlItems}
  </Koszty>
</EksportKosztow>`;

  return {
    success: true,
    filename: `koszty-${dateRange}.xml`,
    content,
    mimeType: "application/xml; charset=utf-8",
    recordCount: costs.length,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportCostsJSON(costs: any[], dateRange: string): ExportResult {
  const data = {
    exportDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    recordCount: costs.length,
    costs: costs.map((cost) => ({
      date: formatDate(cost.date),
      category: cost.category,
      description: cost.description,
      amount: cost.amount,
      currency: cost.currency,
      vehicle: cost.vehicle?.registrationNumber,
      driver: cost.driver ? `${cost.driver.firstName} ${cost.driver.lastName}` : null,
      orderId: cost.orderId,
      notes: cost.notes,
    })),
  };

  return {
    success: true,
    filename: `koszty-${dateRange}.json`,
    content: JSON.stringify(data, null, 2),
    mimeType: "application/json; charset=utf-8",
    recordCount: costs.length,
  };
}

// Export settlements (combined invoices and costs summary)
export async function exportSettlements(
  tenantId: string,
  filters: ExportFilters,
  exportFormat: ExportFormat
): Promise<ExportResult> {
  try {
    // Get invoices summary
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
      },
      select: {
        netAmount: true,
        vatAmount: true,
        grossAmount: true,
        status: true,
      },
    });

    // Get costs summary
    const costs = await prisma.cost.findMany({
      where: {
        tenantId,
        date: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
      },
      select: {
        amount: true,
        category: true,
      },
    });

    const dateRange = `${format(filters.dateFrom, "yyyyMMdd")}-${format(filters.dateTo, "yyyyMMdd")}`;

    // Calculate totals
    const invoiceTotals = {
      count: invoices.length,
      net: invoices.reduce((sum, i) => sum + (i.netAmount || 0), 0),
      vat: invoices.reduce((sum, i) => sum + (i.vatAmount || 0), 0),
      gross: invoices.reduce((sum, i) => sum + (i.grossAmount || 0), 0),
      paid: invoices.filter((i) => i.status === "PAID").length,
      unpaid: invoices.filter((i) => i.status !== "PAID").length,
    };

    const costsByCategory: Record<string, { count: number; amount: number }> = {};
    costs.forEach((cost) => {
      if (!costsByCategory[cost.category]) {
        costsByCategory[cost.category] = { count: 0, amount: 0 };
      }
      costsByCategory[cost.category].count++;
      costsByCategory[cost.category].amount += cost.amount || 0;
    });

    const costTotals = {
      count: costs.length,
      amount: costs.reduce((sum, c) => sum + (c.amount || 0), 0),
      byCategory: costsByCategory,
    };

    const settlement = {
      period: {
        from: formatDate(filters.dateFrom),
        to: formatDate(filters.dateTo),
      },
      invoices: invoiceTotals,
      costs: costTotals,
      profit: {
        net: invoiceTotals.net - costTotals.amount,
        gross: invoiceTotals.gross - costTotals.amount,
      },
    };

    switch (exportFormat) {
      case "csv":
        return exportSettlementsCSV(settlement, dateRange);
      case "xml":
        return exportSettlementsXML(settlement, dateRange);
      case "json":
        return {
          success: true,
          filename: `rozliczenie-${dateRange}.json`,
          content: JSON.stringify(
            { exportDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"), ...settlement },
            null,
            2
          ),
          mimeType: "application/json; charset=utf-8",
          recordCount: invoices.length + costs.length,
        };
      default:
        return {
          success: false,
          filename: "",
          content: "",
          mimeType: "",
          recordCount: 0,
          error: "Nieobsługiwany format eksportu",
        };
    }
  } catch (error) {
    console.error("Export settlements error:", error);
    return {
      success: false,
      filename: "",
      content: "",
      mimeType: "",
      recordCount: 0,
      error: "Błąd eksportu rozliczenia",
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportSettlementsCSV(settlement: any, dateRange: string): ExportResult {
  const categoryLabels: Record<string, string> = {
    FUEL: "Paliwo",
    TOLL: "Opłaty drogowe",
    PARKING: "Parking",
    SERVICE: "Serwis",
    INSURANCE: "Ubezpieczenie",
    TAX: "Podatki",
    SALARY: "Wynagrodzenie",
    FINE: "Mandaty",
    OFFICE: "Biuro",
    OTHER: "Inne",
  };

  const lines = [
    "ROZLICZENIE OKRESOWE",
    `Okres;${settlement.period.from};${settlement.period.to}`,
    "",
    "PRZYCHODY (FAKTURY)",
    `Liczba faktur;${settlement.invoices.count}`,
    `Oplacone;${settlement.invoices.paid}`,
    `Nieoplacone;${settlement.invoices.unpaid}`,
    `Suma netto;${formatAmount(settlement.invoices.net)}`,
    `Suma VAT;${formatAmount(settlement.invoices.vat)}`,
    `Suma brutto;${formatAmount(settlement.invoices.gross)}`,
    "",
    "KOSZTY",
    `Liczba kosztow;${settlement.costs.count}`,
    `Suma;${formatAmount(settlement.costs.amount)}`,
    "",
    "KOSZTY WG KATEGORII",
    "Kategoria;Liczba;Kwota",
  ];

  Object.entries(settlement.costs.byCategory).forEach(([category, data]) => {
    const catData = data as { count: number; amount: number };
    lines.push(
      `${categoryLabels[category] || category};${catData.count};${formatAmount(catData.amount)}`
    );
  });

  lines.push(
    "",
    "WYNIK",
    `Zysk netto (przychody netto - koszty);${formatAmount(settlement.profit.net)}`,
    `Zysk brutto (przychody brutto - koszty);${formatAmount(settlement.profit.gross)}`
  );

  return {
    success: true,
    filename: `rozliczenie-${dateRange}.csv`,
    content: "\uFEFF" + lines.join("\n"),
    mimeType: "text/csv; charset=utf-8",
    recordCount: settlement.invoices.count + settlement.costs.count,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportSettlementsXML(settlement: any, dateRange: string): ExportResult {
  const categoryItems = Object.entries(settlement.costs.byCategory)
    .map(([category, data]) => {
      const catData = data as { count: number; amount: number };
      return `
      <Kategoria nazwa="${category}">
        <Liczba>${catData.count}</Liczba>
        <Kwota>${formatAmount(catData.amount)}</Kwota>
      </Kategoria>`;
    })
    .join("");

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<RozliczenieOkresowe>
  <DataEksportu>${format(new Date(), "yyyy-MM-dd HH:mm:ss")}</DataEksportu>
  <Okres>
    <Od>${settlement.period.from}</Od>
    <Do>${settlement.period.to}</Do>
  </Okres>
  <Faktury>
    <Liczba>${settlement.invoices.count}</Liczba>
    <Oplacone>${settlement.invoices.paid}</Oplacone>
    <Nieoplacone>${settlement.invoices.unpaid}</Nieoplacone>
    <SumaNetto>${formatAmount(settlement.invoices.net)}</SumaNetto>
    <SumaVAT>${formatAmount(settlement.invoices.vat)}</SumaVAT>
    <SumaBrutto>${formatAmount(settlement.invoices.gross)}</SumaBrutto>
  </Faktury>
  <Koszty>
    <Liczba>${settlement.costs.count}</Liczba>
    <Suma>${formatAmount(settlement.costs.amount)}</Suma>
    <WgKategorii>${categoryItems}
    </WgKategorii>
  </Koszty>
  <Wynik>
    <ZyskNetto>${formatAmount(settlement.profit.net)}</ZyskNetto>
    <ZyskBrutto>${formatAmount(settlement.profit.gross)}</ZyskBrutto>
  </Wynik>
</RozliczenieOkresowe>`;

  return {
    success: true,
    filename: `rozliczenie-${dateRange}.xml`,
    content,
    mimeType: "application/xml; charset=utf-8",
    recordCount: settlement.invoices.count + settlement.costs.count,
  };
}

function escapeXML(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
