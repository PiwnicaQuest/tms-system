import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { dailyWorkRecordSchema } from "@/lib/validations/daily-work-record";

// GET /api/costs/daily-records - List daily work records
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");
    const vehicleId = searchParams.get("vehicleId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
    };

    if (driverId) where.driverId = driverId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.dailyWorkRecord.findMany({
        where,
        include: {
          driver: { select: { id: true, firstName: true, lastName: true } },
          vehicle: { select: { id: true, registrationNumber: true } },
          order: { select: { id: true, orderNumber: true, priceNet: true } },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dailyWorkRecord.count({ where }),
    ]);

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching daily records:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/costs/daily-records - Create daily work record
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = dailyWorkRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // If orderId is provided, fetch order price to calculate allocated amount
    let allocatedAmount = parsed.data.allocatedAmount;
    if (parsed.data.orderId && !allocatedAmount) {
      const order = await prisma.order.findUnique({
        where: { id: parsed.data.orderId },
        select: { priceNet: true },
      });
      if (order?.priceNet) {
        allocatedAmount = order.priceNet * parsed.data.revenueShare;
      }
    }

    const record = await prisma.dailyWorkRecord.create({
      data: {
        ...parsed.data,
        allocatedAmount,
        tenantId: session.user.tenantId,
        createdById: session.user.id,
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating daily record:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
