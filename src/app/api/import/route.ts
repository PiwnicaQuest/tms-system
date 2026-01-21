import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importCSV, ImportType, csvTemplates, expectedColumns } from "@/lib/import/csv-service";

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

    // Only admins and managers can import data
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role || "")) {
      return NextResponse.json(
        { error: "Brak uprawnień do importu danych" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as ImportType | null;

    if (!file) {
      return NextResponse.json(
        { error: "Brak pliku CSV" },
        { status: 400 }
      );
    }

    if (!type || !["drivers", "vehicles", "contractors"].includes(type)) {
      return NextResponse.json(
        { error: "Nieprawidłowy typ importu" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return NextResponse.json(
        { error: "Plik musi być w formacie CSV" },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Plik CSV jest pusty" },
        { status: 400 }
      );
    }

    // Perform import
    const result = await importCSV(content, type, tenantId);

    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      message: result.success
        ? `Zaimportowano ${result.imported} rekordów`
        : `Zaimportowano ${result.imported} rekordów, pominięto ${result.skipped}`,
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    return NextResponse.json(
      { error: "Błąd importu CSV" },
      { status: 500 }
    );
  }
}

// GET endpoint for templates and column info
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as ImportType | null;
    const action = searchParams.get("action");

    if (!type || !["drivers", "vehicles", "contractors"].includes(type)) {
      return NextResponse.json(
        { error: "Nieprawidłowy typ importu" },
        { status: 400 }
      );
    }

    // Return template CSV
    if (action === "template") {
      const template = csvTemplates[type];
      return new NextResponse(template, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="szablon-${type}.csv"`,
        },
      });
    }

    // Return column info
    return NextResponse.json({
      type,
      columns: expectedColumns[type],
    });
  } catch (error) {
    console.error("Error getting import info:", error);
    return NextResponse.json(
      { error: "Błąd pobierania informacji" },
      { status: 500 }
    );
  }
}
