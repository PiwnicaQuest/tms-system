import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { downloadInvoiceUpo, KsefStatus } from "@/lib/ksef/ksef-service";

/**
 * GET /api/invoices/[id]/ksef/upo
 * Download UPO (Urzedowe Poswiadczenie Odbioru) for invoice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;

    // Check if invoice exists and belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        ksefNumber: true,
        ksefStatus: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Faktura nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Check if invoice was sent to KSeF
    if (!invoice.ksefNumber) {
      return NextResponse.json(
        { error: "Faktura nie zostala wyslana do KSeF" },
        { status: 400 }
      );
    }

    // Check if invoice was accepted
    if (invoice.ksefStatus !== KsefStatus.ACCEPTED) {
      return NextResponse.json(
        { error: "UPO jest dostepne tylko dla faktur przyjetych przez KSeF" },
        { status: 400 }
      );
    }

    // Download UPO
    const result = await downloadInvoiceUpo(id, tenantId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Wystapil blad podczas pobierania UPO" },
        { status: 400 }
      );
    }

    // Check URL query parameter for format
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "pdf";

    if (format === "xml") {
      // Return XML content
      return new NextResponse(result.upoXml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="UPO-${invoice.ksefNumber}.xml"`,
        },
      });
    }

    // Return PDF content (base64 decoded)
    if (result.upoContent) {
      const pdfBuffer = Buffer.from(result.upoContent, "base64");
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="UPO-${invoice.ksefNumber}.pdf"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Brak zawartosci UPO" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error downloading UPO:", error);
    return NextResponse.json(
      { error: "Wystapil blad serwera" },
      { status: 500 }
    );
  }
}
