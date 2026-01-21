import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const contractorUpdateSchema = z.object({
  type: z.enum(["CLIENT", "CARRIER", "BOTH"]).optional(),
  name: z.string().min(1).optional(),
  shortName: z.string().optional(),
  nip: z.string().optional(),
  regon: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  paymentDays: z.number().int().positive().optional(),
  creditLimit: z.number().positive().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/contractors/[id] - Get single contractor
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

    const contractor = await prisma.contractor.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            loadingDate: true,
            priceNet: true,
          },
        },
        invoices: {
          take: 10,
          orderBy: { issueDate: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            issueDate: true,
            grossAmount: true,
          },
        },
        _count: {
          select: {
            orders: true,
            invoices: true,
          },
        },
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contractor);
  } catch (error) {
    console.error("Error fetching contractor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/contractors/[id] - Update contractor
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
    const parsed = contractorUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if contractor exists and belongs to tenant
    const existing = await prisma.contractor.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    const contractor = await prisma.contractor.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(contractor);
  } catch (error) {
    console.error("Error updating contractor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/contractors/[id] - Soft delete contractor
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

    // Check if contractor exists and belongs to tenant
    const existing = await prisma.contractor.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        _count: {
          select: { orders: true, invoices: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    // Soft delete - mark as inactive
    await prisma.contractor.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contractor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
