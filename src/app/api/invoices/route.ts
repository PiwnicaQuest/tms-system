import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { invoiceSchema } from "@/lib/validations/invoice";
import { logAudit } from "@/lib/audit/audit-service";
import { triggerWebhook } from "@/lib/webhooks";

// Generate invoice number
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      tenantId,
      invoiceNumber: { startsWith: `FV/${year}/${month}/` },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  let sequence = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split("/");
    sequence = parseInt(parts[3]) + 1;
  }

  return `FV/${year}/${month}/${String(sequence).padStart(4, "0")}`;
}

// GET /api/invoices - List invoices
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const contractorId = searchParams.get("contractorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
    };

    if (status) where.status = status;
    if (contractorId) where.contractorId = contractorId;
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) (where.issueDate as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.issueDate as Record<string, unknown>).lte = new Date(endDate);
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          contractor: { select: { id: true, name: true, shortName: true } },
          items: true,
          _count: { select: { orders: true } },
        },
        orderBy: { issueDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/invoices - Create invoice
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items, orderIds, exchangeRate, exchangeRateDate, exchangeRateTable, amountInPLN, ...invoiceData } = parsed.data;

    // Calculate amounts
    const calculatedItems = items.map((item) => {
      const netAmount = item.quantity * item.unitPriceNet;
      const vatAmount = netAmount * (item.vatRate / 100);
      const grossAmount = netAmount + vatAmount;
      return { ...item, netAmount, vatAmount, grossAmount };
    });

    const netAmount = calculatedItems.reduce((sum, item) => sum + item.netAmount, 0);
    const vatAmount = calculatedItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const grossAmount = calculatedItems.reduce((sum, item) => sum + item.grossAmount, 0);

    const invoiceNumber = await generateInvoiceNumber(session.user.tenantId);

    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        invoiceNumber,
        tenantId: session.user.tenantId,
        status: "DRAFT",
        netAmount,
        vatAmount,
        grossAmount,
        // Exchange rate data (for non-PLN invoices)
        exchangeRate: exchangeRate || null,
        exchangeRateDate: exchangeRateDate || null,
        exchangeRateTable: exchangeRateTable || null,
        amountInPLN: amountInPLN || null,
        items: {
          create: calculatedItems,
        },
        orders: orderIds ? {
          connect: orderIds.map((id) => ({ id })),
        } : undefined,
      },
      include: {
        contractor: { select: { id: true, name: true, shortName: true } },
        items: true,
        orders: { select: { id: true, orderNumber: true } },
      },
    });

    // Log audit
    await logAudit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber },
      request,
    });

    // Trigger webhook for invoice creation
    triggerWebhook(session.user.tenantId, "invoice.created", {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        netAmount: invoice.netAmount,
        vatAmount: invoice.vatAmount,
        grossAmount: invoice.grossAmount,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate,
        exchangeRateDate: invoice.exchangeRateDate,
        exchangeRateTable: invoice.exchangeRateTable,
        amountInPLN: invoice.amountInPLN,
        contractor: invoice.contractor,
        orders: invoice.orders,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
