import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const costSchema = z.object({
  category: z.enum([
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
  ]),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default("PLN"),
  date: z.coerce.date(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  orderId: z.string().optional(),
  attachmentUrl: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/costs - List costs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const vehicleId = searchParams.get("vehicleId");
    const driverId = searchParams.get("driverId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
    };

    if (category) where.category = category;
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const [costs, total] = await Promise.all([
      prisma.cost.findMany({
        where,
        include: {
          vehicle: { select: { id: true, registrationNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cost.count({ where }),
    ]);

    // Calculate totals by category
    const categoryTotals = await prisma.cost.groupBy({
      by: ["category"],
      where: {
        tenantId: session.user.tenantId,
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      data: costs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        categoryTotals: Object.fromEntries(
          categoryTotals.map((c) => [c.category, c._sum.amount || 0])
        ),
        total: categoryTotals.reduce((sum, c) => sum + (c._sum.amount || 0), 0),
      },
    });
  } catch (error) {
    console.error("Error fetching costs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/costs - Create cost
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = costSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
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

    const cost = await prisma.cost.create({
      data: {
        ...parsed.data,
        tenantId: session.user.tenantId,
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(cost, { status: 201 });
  } catch (error) {
    console.error("Error creating cost:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
