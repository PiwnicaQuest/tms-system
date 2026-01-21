import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  exportInvoices,
  exportCosts,
  exportSettlements,
  ExportType,
  ExportFormat,
} from "@/lib/export/fk-service";
import { InvoiceStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    // Only admins and managers can export data
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role || "")) {
      return NextResponse.json(
        { error: "Brak uprawnień do eksportu danych" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as ExportType | null;
    const format = (searchParams.get("format") || "csv") as ExportFormat;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status") || undefined;
    const contractorId = searchParams.get("contractorId") || undefined;

    // Validate required parameters
    if (!type || !["invoices", "costs", "settlements"].includes(type)) {
      return NextResponse.json(
        { error: "Nieprawidłowy typ eksportu (invoices/costs/settlements)" },
        { status: 400 }
      );
    }

    if (!["csv", "xml", "json"].includes(format)) {
      return NextResponse.json(
        { error: "Nieprawidłowy format eksportu (csv/xml/json)" },
        { status: 400 }
      );
    }

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Wymagane parametry: dateFrom, dateTo" },
        { status: 400 }
      );
    }

    const filters = {
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      status: status as InvoiceStatus | undefined,
      contractorId,
    };

    // Validate dates
    if (isNaN(filters.dateFrom.getTime()) || isNaN(filters.dateTo.getTime())) {
      return NextResponse.json(
        { error: "Nieprawidłowy format daty (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (filters.dateFrom > filters.dateTo) {
      return NextResponse.json(
        { error: "Data początkowa nie może być późniejsza niż końcowa" },
        { status: 400 }
      );
    }

    // Perform export
    let result;
    switch (type) {
      case "invoices":
        result = await exportInvoices(tenantId, filters, format);
        break;
      case "costs":
        result = await exportCosts(tenantId, filters, format);
        break;
      case "settlements":
        result = await exportSettlements(tenantId, filters, format);
        break;
      default:
        return NextResponse.json(
          { error: "Nieobsługiwany typ eksportu" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Błąd eksportu" },
        { status: 400 }
      );
    }

    // Return file for download
    return new NextResponse(result.content, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Record-Count": String(result.recordCount),
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Błąd eksportu danych" },
      { status: 500 }
    );
  }
}

// POST endpoint for export preview (returns metadata without downloading)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role || "")) {
      return NextResponse.json(
        { error: "Brak uprawnień do eksportu danych" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, format = "csv", dateFrom, dateTo, status, contractorId } = body;

    if (!type || !["invoices", "costs", "settlements"].includes(type)) {
      return NextResponse.json(
        { error: "Nieprawidłowy typ eksportu" },
        { status: 400 }
      );
    }

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Wymagane parametry: dateFrom, dateTo" },
        { status: 400 }
      );
    }

    const filters = {
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      status: status as InvoiceStatus | undefined,
      contractorId,
    };

    // Perform export to get metadata
    let result;
    switch (type) {
      case "invoices":
        result = await exportInvoices(tenantId, filters, format);
        break;
      case "costs":
        result = await exportCosts(tenantId, filters, format);
        break;
      case "settlements":
        result = await exportSettlements(tenantId, filters, format);
        break;
      default:
        return NextResponse.json(
          { error: "Nieobsługiwany typ eksportu" },
          { status: 400 }
        );
    }

    // Return metadata only
    return NextResponse.json({
      success: result.success,
      filename: result.filename,
      recordCount: result.recordCount,
      error: result.error,
    });
  } catch (error) {
    console.error("Error previewing export:", error);
    return NextResponse.json(
      { error: "Błąd podglądu eksportu" },
      { status: 500 }
    );
  }
}
