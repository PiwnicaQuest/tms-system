import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  sendInvoiceToKsef,
  checkInvoiceKsefStatus,
  KsefStatus,
  KsefStatusLabels,
} from "@/lib/ksef/ksef-service";

/**
 * POST /api/invoices/[id]/ksef
 * Send invoice to KSeF
 */
export async function POST(
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

    // Check if KSeF is enabled for this tenant
    const invoiceSettings = await prisma.invoiceSettings.findUnique({
      where: { tenantId },
      select: {
        ksefEnabled: true,
        ksefNip: true,
      },
    });

    if (!invoiceSettings?.ksefEnabled) {
      return NextResponse.json(
        { error: "KSeF nie jest wlaczony dla tego konta" },
        { status: 400 }
      );
    }

    // Check if invoice exists and belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
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

    // Check if invoice is in correct status
    if (invoice.status === "DRAFT") {
      return NextResponse.json(
        { error: "Nie mozna wyslac szkicu faktury do KSeF - najpierw wystaw fakture" },
        { status: 400 }
      );
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Nie mozna wyslac anulowanej faktury do KSeF" },
        { status: 400 }
      );
    }

    // Check if already sent
    if (invoice.ksefNumber) {
      return NextResponse.json(
        {
          error: "Faktura zostala juz wyslana do KSeF",
          ksefNumber: invoice.ksefNumber,
        },
        { status: 400 }
      );
    }

    // Send to KSeF
    const result = await sendInvoiceToKsef(id, tenantId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Faktura zostala wyslana do KSeF",
        ksefNumber: result.ksefNumber,
        referenceNumber: result.referenceNumber,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Wystapil blad podczas wysylania do KSeF",
          errorCode: result.errorCode,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error sending invoice to KSeF:", error);
    return NextResponse.json(
      { error: "Wystapil blad serwera" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invoices/[id]/ksef
 * Check KSeF status for invoice
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
        ksefSentAt: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Faktura nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Get status
    const result = await checkInvoiceKsefStatus(id, tenantId);

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      ksefNumber: invoice.ksefNumber,
      status: result.status,
      statusLabel: KsefStatusLabels[result.status as KsefStatus] || result.status,
      sentAt: invoice.ksefSentAt,
      processingDate: result.processingDate,
    });
  } catch (error) {
    console.error("Error checking KSeF status:", error);
    return NextResponse.json(
      { error: "Wystapil blad serwera" },
      { status: 500 }
    );
  }
}
