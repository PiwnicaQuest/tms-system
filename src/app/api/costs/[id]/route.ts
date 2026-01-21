import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const costUpdateSchema = z.object({
  category: z
    .enum([
      "FUEL",
      "SERVICE",
      "TOLL",
      "INSURANCE",
      "PARKING",
      "FINE",
      "SALARY",
      "TAX",
      "OFFICE",
      "OTHER",
    ])
    .optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  date: z.coerce.date().optional(),
  vehicleId: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  orderId: z.string().nullable().optional(),
  attachmentUrl: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/costs/[id] - Get single cost
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

    const cost = await prisma.cost.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, brand: true, model: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!cost) {
      return NextResponse.json({ error: "Cost not found" }, { status: 404 });
    }

    return NextResponse.json(cost);
  } catch (error) {
    console.error("Error fetching cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/costs/[id] - Update cost
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
    const parsed = costUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if cost exists and belongs to tenant
    const existing = await prisma.cost.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cost not found" }, { status: 404 });
    }

    // Validate vehicle belongs to tenant
    if (parsed.data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: parsed.data.vehicleId, tenantId: session.user.tenantId },
      });
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 400 });
      }
    }

    // Validate driver belongs to tenant
    if (parsed.data.driverId) {
      const driver = await prisma.driver.findFirst({
        where: { id: parsed.data.driverId, tenantId: session.user.tenantId },
      });
      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 400 });
      }
    }

    const cost = await prisma.cost.update({
      where: { id },
      data: parsed.data,
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(cost);
  } catch (error) {
    console.error("Error updating cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/costs/[id] - Delete cost
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

    // Check if cost exists and belongs to tenant
    const existing = await prisma.cost.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cost not found" }, { status: 404 });
    }

    await prisma.cost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
