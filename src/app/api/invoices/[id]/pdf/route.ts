import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { InvoicePDF, type InvoiceData } from "@/lib/pdf/invoice-template";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id]/pdf - Generate PDF for invoice
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id, tenantId },
      include: {
        contractor: {
          select: {
            name: true,
            nip: true,
            address: true,
            city: true,
            postalCode: true,
            country: true,
            email: true,
            phone: true,
          },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
        tenant: {
          select: {
            name: true,
            nip: true,
            address: true,
            city: true,
            postalCode: true,
            country: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Faktura nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Prepare invoice data for PDF template
    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      status: invoice.status,
      issueDate: invoice.issueDate,
      saleDate: invoice.saleDate,
      dueDate: invoice.dueDate,
      netAmount: invoice.netAmount,
      vatAmount: invoice.vatAmount,
      grossAmount: invoice.grossAmount,
      currency: invoice.currency,
      paymentMethod: invoice.paymentMethod,
      bankAccount: invoice.bankAccount,
      isPaid: invoice.isPaid,
      paidDate: invoice.paidDate,
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceNet: item.unitPriceNet,
        vatRate: item.vatRate,
        netAmount: item.netAmount,
        vatAmount: item.vatAmount,
        grossAmount: item.grossAmount,
      })),
      contractor: invoice.contractor,
      tenant: invoice.tenant,
    };

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({ invoice: invoiceData })
    );

    // Convert Buffer to Uint8Array for NextResponse
    const pdfUint8Array = new Uint8Array(pdfBuffer);

    // Generate filename
    const sanitizedNumber = invoice.invoiceNumber.replace(/[/\\]/g, "-");
    const filename = `faktura-${sanitizedNumber}.pdf`;

    // Return PDF response
    return new NextResponse(pdfUint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas generowania PDF" },
      { status: 500 }
    );
  }
}
