import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { invoiceUpdateSchema } from "@/lib/validations/invoice";
import { logAudit, getEntityChanges } from "@/lib/audit/audit-service";
import { triggerWebhook } from "@/lib/webhooks";

// GET /api/invoices/[id] - Get single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        contractor: true,
        items: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            origin: true,
            destination: true,
            loadingDate: true,
            priceNet: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = invoiceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if invoice exists and belongs to tenant
    const existing = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Cannot edit issued invoices (except status)
    if (existing.status !== "DRAFT" && Object.keys(parsed.data).some(k => k !== "status")) {
      return NextResponse.json(
        { error: "Cannot edit issued invoice" },
        { status: 400 }
      );
    }

    const { items, orderIds, ...invoiceData } = parsed.data;

    // Recalculate if items changed
    let updateData: Record<string, unknown> = { ...invoiceData };

    if (items) {
      const calculatedItems = items.map((item) => {
        const netAmount = item.quantity * item.unitPriceNet;
        const vatAmount = netAmount * (item.vatRate / 100);
        const grossAmount = netAmount + vatAmount;
        return { ...item, netAmount, vatAmount, grossAmount };
      });

      const netAmount = calculatedItems.reduce((sum, item) => sum + item.netAmount, 0);
      const vatAmount = calculatedItems.reduce((sum, item) => sum + item.vatAmount, 0);
      const grossAmount = calculatedItems.reduce((sum, item) => sum + item.grossAmount, 0);

      // Delete old items and create new ones
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

      updateData = {
        ...updateData,
        netAmount,
        vatAmount,
        grossAmount,
        items: {
          create: calculatedItems,
        },
      };
    }

    if (orderIds !== undefined) {
      // Disconnect all orders first
      await prisma.order.updateMany({
        where: { invoiceId: id },
        data: { invoiceId: null },
      });

      // Connect new orders
      if (orderIds.length > 0) {
        updateData.orders = {
          connect: orderIds.map((orderId: string) => ({ id: orderId })),
        };
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        contractor: { select: { id: true, name: true, shortName: true } },
        items: true,
        orders: { select: { id: true, orderNumber: true } },
      },
    });

    // Log audit
    const changes = getEntityChanges(
      existing as unknown as Record<string, unknown>,
      invoice as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Invoice",
      entityId: invoice.id,
      changes,
      metadata: { invoiceNumber: invoice.invoiceNumber },
      request,
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/invoices/[id] - Update invoice status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, isPaid, paidDate, paidAmount } = body;

    // Check if invoice exists and belongs to tenant
    const existing = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (isPaid !== undefined) {
      updateData.isPaid = isPaid;
      if (isPaid) {
        updateData.paidDate = paidDate || new Date();
        updateData.paidAmount = paidAmount || existing.grossAmount;
        updateData.status = "PAID";
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    // Log audit
    const changes = getEntityChanges(
      existing as unknown as Record<string, unknown>,
      invoice as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: status ? "STATUS_CHANGE" : "UPDATE",
      entityType: "Invoice",
      entityId: invoice.id,
      changes,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        ...(status && { newStatus: status, oldStatus: existing.status }),
      },
      request,
    });

    // Trigger webhook if invoice is marked as paid
    if (isPaid && !existing.isPaid) {
      triggerWebhook(session.user.tenantId, "invoice.paid", {
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
          paidDate: invoice.paidDate,
          paidAmount: invoice.paidAmount,
        },
      });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice (only drafts)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if invoice exists and belongs to tenant
    const existing = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only drafts can be deleted
    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft invoices can be deleted" },
        { status: 400 }
      );
    }

    // Delete items first, then invoice
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await prisma.invoice.delete({ where: { id } });

    // Log audit
    await logAudit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "Invoice",
      entityId: id,
      metadata: { invoiceNumber: existing.invoiceNumber },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
