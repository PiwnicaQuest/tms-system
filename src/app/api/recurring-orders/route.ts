import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { RecurringFrequency, OrderType, Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit-service";

// GET /api/recurring-orders - List recurring orders with filters
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const isActive = searchParams.get("isActive");
    const frequency = searchParams.get("frequency") as RecurringFrequency | null;
    const contractorId = searchParams.get("contractorId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const sortBy = searchParams.get("sortBy") || "nextGenerationDate";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Build where clause - always filter by tenantId
    const where: Prisma.RecurringOrderWhereInput = {
      tenantId,
    };

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (frequency) {
      where.frequency = frequency;
    }

    if (contractorId) {
      where.contractorId = contractorId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { origin: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { originCity: { contains: search, mode: "insensitive" } },
        { destinationCity: { contains: search, mode: "insensitive" } },
        { cargoDescription: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build order by clause
    const orderBy: Prisma.RecurringOrderOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute query with pagination
    const [recurringOrders, total] = await Promise.all([
      prisma.recurringOrder.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.recurringOrder.count({ where }),
    ]);

    return NextResponse.json({
      data: recurringOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching recurring orders:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania zlecen cyklicznych" },
      { status: 500 }
    );
  }
}

// POST /api/recurring-orders - Create new recurring order template
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

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "name",
      "frequency",
      "startDate",
      "origin",
      "destination",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Pole ${field} jest wymagane` },
          { status: 400 }
        );
      }
    }

    // Validate frequency-specific fields
    const frequency = body.frequency as RecurringFrequency;
    
    if ((frequency === "WEEKLY" || frequency === "BIWEEKLY") && body.dayOfWeek === undefined) {
      return NextResponse.json(
        { error: "Pole dayOfWeek jest wymagane dla czestotliwosci WEEKLY/BIWEEKLY" },
        { status: 400 }
      );
    }

    if (frequency === "MONTHLY" && !body.dayOfMonth) {
      return NextResponse.json(
        { error: "Pole dayOfMonth jest wymagane dla czestotliwosci MONTHLY" },
        { status: 400 }
      );
    }

    // Calculate next generation date
    const startDate = new Date(body.startDate);
    const nextGenerationDate = calculateNextGenerationDate(
      startDate,
      frequency,
      body.dayOfWeek,
      body.dayOfMonth
    );

    // Create recurring order
    const recurringOrder = await prisma.recurringOrder.create({
      data: {
        tenantId,
        name: body.name,
        frequency,
        dayOfWeek: body.dayOfWeek !== undefined ? parseInt(body.dayOfWeek, 10) : null,
        dayOfMonth: body.dayOfMonth ? parseInt(body.dayOfMonth, 10) : null,
        startDate,
        endDate: body.endDate ? new Date(body.endDate) : null,
        nextGenerationDate,
        type: (body.type as OrderType) || OrderType.OWN,
        contractorId: body.contractorId || null,
        origin: body.origin,
        originCity: body.originCity || null,
        originPostalCode: body.originPostalCode || null,
        originCountry: body.originCountry || "PL",
        destination: body.destination,
        destinationCity: body.destinationCity || null,
        destinationPostalCode: body.destinationPostalCode || null,
        destinationCountry: body.destinationCountry || "PL",
        distanceKm: body.distanceKm ? parseFloat(body.distanceKm) : null,
        loadingTimeFrom: body.loadingTimeFrom || null,
        loadingTimeTo: body.loadingTimeTo || null,
        unloadingTimeFrom: body.unloadingTimeFrom || null,
        unloadingTimeTo: body.unloadingTimeTo || null,
        cargoDescription: body.cargoDescription || null,
        cargoWeight: body.cargoWeight ? parseFloat(body.cargoWeight) : null,
        cargoVolume: body.cargoVolume ? parseFloat(body.cargoVolume) : null,
        cargoPallets: body.cargoPallets ? parseInt(body.cargoPallets, 10) : null,
        requiresAdr: body.requiresAdr || false,
        priceNet: body.priceNet ? parseFloat(body.priceNet) : null,
        currency: body.currency || "PLN",
        notes: body.notes || null,
        internalNotes: body.internalNotes || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        createdById: session.user.id,
      },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log audit
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "RecurringOrder",
      entityId: recurringOrder.id,
      metadata: { name: recurringOrder.name, frequency: recurringOrder.frequency },
      request,
    });

    return NextResponse.json(recurringOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating recurring order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia zlecenia cyklicznego" },
      { status: 500 }
    );
  }
}

// Helper function to calculate next generation date
function calculateNextGenerationDate(
  fromDate: Date,
  frequency: RecurringFrequency,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const now = new Date();
  let nextDate = new Date(fromDate);

  // Ensure nextDate is in the future
  while (nextDate <= now) {
    switch (frequency) {
      case "DAILY":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "WEEKLY":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "BIWEEKLY":
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case "MONTHLY":
        nextDate.setMonth(nextDate.getMonth() + 1);
        // Handle day of month edge cases (e.g., 31st in a 30-day month)
        if (dayOfMonth) {
          const targetDay = Math.min(dayOfMonth, getDaysInMonth(nextDate));
          nextDate.setDate(targetDay);
        }
        break;
    }
  }

  // Adjust to specific day of week for WEEKLY/BIWEEKLY
  if ((frequency === "WEEKLY" || frequency === "BIWEEKLY") && dayOfWeek !== undefined && dayOfWeek !== null) {
    const currentDay = nextDate.getDay();
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
    if (daysUntilTarget > 0) {
      nextDate.setDate(nextDate.getDate() + daysUntilTarget);
    }
  }

  // Adjust to specific day of month for MONTHLY
  if (frequency === "MONTHLY" && dayOfMonth) {
    const targetDay = Math.min(dayOfMonth, getDaysInMonth(nextDate));
    nextDate.setDate(targetDay);
    // If the adjusted date is in the past, move to next month
    if (nextDate <= now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
      const newTargetDay = Math.min(dayOfMonth, getDaysInMonth(nextDate));
      nextDate.setDate(newTargetDay);
    }
  }

  return nextDate;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export { calculateNextGenerationDate, getDaysInMonth };
