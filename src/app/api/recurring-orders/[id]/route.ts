import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { RecurringFrequency, OrderType } from "@prisma/client";
import { logAudit, getEntityChanges } from "@/lib/audit/audit-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper function to check authorization
async function checkAuth() {
  const session = await auth();

  if (!session?.user) {
    return { error: "Nieautoryzowany", status: 401 };
  }

  const tenantId = session.user.tenantId;

  if (!tenantId) {
    return { error: "Brak przypisanego tenanta", status: 403 };
  }

  return { tenantId, userId: session.user.id };
}

// GET /api/recurring-orders/[id] - Get single recurring order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;

    const recurringOrder = await prisma.recurringOrder.findUnique({
      where: { id, tenantId: authResult.tenantId },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            shortName: true,
            nip: true,
            email: true,
            phone: true,
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

    if (!recurringOrder) {
      return NextResponse.json(
        { error: "Zlecenie cykliczne nie zostalo znalezione" },
        { status: 404 }
      );
    }

    return NextResponse.json(recurringOrder);
  } catch (error) {
    console.error("Error fetching recurring order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania zlecenia cyklicznego" },
      { status: 500 }
    );
  }
}

// PUT /api/recurring-orders/[id] - Update recurring order
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if recurring order exists and belongs to tenant
    const existingOrder = await prisma.recurringOrder.findUnique({
      where: { id, tenantId: authResult.tenantId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Zlecenie cykliczne nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Validate frequency-specific fields if frequency is being updated
    const frequency = (body.frequency as RecurringFrequency) || existingOrder.frequency;
    
    if ((frequency === "WEEKLY" || frequency === "BIWEEKLY") && 
        body.dayOfWeek === undefined && existingOrder.dayOfWeek === null) {
      return NextResponse.json(
        { error: "Pole dayOfWeek jest wymagane dla czestotliwosci WEEKLY/BIWEEKLY" },
        { status: 400 }
      );
    }

    if (frequency === "MONTHLY" && !body.dayOfMonth && !existingOrder.dayOfMonth) {
      return NextResponse.json(
        { error: "Pole dayOfMonth jest wymagane dla czestotliwosci MONTHLY" },
        { status: 400 }
      );
    }

    // Recalculate nextGenerationDate if frequency or schedule changed
    let nextGenerationDate = existingOrder.nextGenerationDate;
    if (body.frequency || body.dayOfWeek !== undefined || body.dayOfMonth !== undefined || body.startDate) {
      const startDate = body.startDate ? new Date(body.startDate) : existingOrder.startDate;
      const dayOfWeek = body.dayOfWeek !== undefined ? body.dayOfWeek : existingOrder.dayOfWeek;
      const dayOfMonth = body.dayOfMonth !== undefined ? body.dayOfMonth : existingOrder.dayOfMonth;
      nextGenerationDate = calculateNextGenerationDate(startDate, frequency, dayOfWeek, dayOfMonth);
    }

    // Update recurring order
    const recurringOrder = await prisma.recurringOrder.update({
      where: { id },
      data: {
        name: body.name ?? existingOrder.name,
        frequency,
        dayOfWeek: body.dayOfWeek !== undefined ? parseInt(body.dayOfWeek, 10) : existingOrder.dayOfWeek,
        dayOfMonth: body.dayOfMonth !== undefined ? parseInt(body.dayOfMonth, 10) : existingOrder.dayOfMonth,
        startDate: body.startDate ? new Date(body.startDate) : existingOrder.startDate,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existingOrder.endDate,
        nextGenerationDate,
        type: body.type ? (body.type as OrderType) : existingOrder.type,
        contractorId: body.contractorId !== undefined ? body.contractorId : existingOrder.contractorId,
        origin: body.origin ?? existingOrder.origin,
        originCity: body.originCity !== undefined ? body.originCity : existingOrder.originCity,
        originPostalCode: body.originPostalCode !== undefined ? body.originPostalCode : existingOrder.originPostalCode,
        originCountry: body.originCountry ?? existingOrder.originCountry,
        destination: body.destination ?? existingOrder.destination,
        destinationCity: body.destinationCity !== undefined ? body.destinationCity : existingOrder.destinationCity,
        destinationPostalCode: body.destinationPostalCode !== undefined ? body.destinationPostalCode : existingOrder.destinationPostalCode,
        destinationCountry: body.destinationCountry ?? existingOrder.destinationCountry,
        distanceKm: body.distanceKm !== undefined ? (body.distanceKm ? parseFloat(body.distanceKm) : null) : existingOrder.distanceKm,
        loadingTimeFrom: body.loadingTimeFrom !== undefined ? body.loadingTimeFrom : existingOrder.loadingTimeFrom,
        loadingTimeTo: body.loadingTimeTo !== undefined ? body.loadingTimeTo : existingOrder.loadingTimeTo,
        unloadingTimeFrom: body.unloadingTimeFrom !== undefined ? body.unloadingTimeFrom : existingOrder.unloadingTimeFrom,
        unloadingTimeTo: body.unloadingTimeTo !== undefined ? body.unloadingTimeTo : existingOrder.unloadingTimeTo,
        cargoDescription: body.cargoDescription !== undefined ? body.cargoDescription : existingOrder.cargoDescription,
        cargoWeight: body.cargoWeight !== undefined ? (body.cargoWeight ? parseFloat(body.cargoWeight) : null) : existingOrder.cargoWeight,
        cargoVolume: body.cargoVolume !== undefined ? (body.cargoVolume ? parseFloat(body.cargoVolume) : null) : existingOrder.cargoVolume,
        cargoPallets: body.cargoPallets !== undefined ? (body.cargoPallets ? parseInt(body.cargoPallets, 10) : null) : existingOrder.cargoPallets,
        requiresAdr: body.requiresAdr !== undefined ? body.requiresAdr : existingOrder.requiresAdr,
        priceNet: body.priceNet !== undefined ? (body.priceNet ? parseFloat(body.priceNet) : null) : existingOrder.priceNet,
        currency: body.currency ?? existingOrder.currency,
        notes: body.notes !== undefined ? body.notes : existingOrder.notes,
        internalNotes: body.internalNotes !== undefined ? body.internalNotes : existingOrder.internalNotes,
        isActive: body.isActive !== undefined ? body.isActive : existingOrder.isActive,
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
    const changes = getEntityChanges(
      existingOrder as unknown as Record<string, unknown>,
      recurringOrder as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "UPDATE",
      entityType: "RecurringOrder",
      entityId: recurringOrder.id,
      changes,
      metadata: { name: recurringOrder.name },
      request,
    });

    return NextResponse.json(recurringOrder);
  } catch (error) {
    console.error("Error updating recurring order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji zlecenia cyklicznego" },
      { status: 500 }
    );
  }
}

// DELETE /api/recurring-orders/[id] - Delete recurring order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;

    // Check if recurring order exists and belongs to tenant
    const existingOrder = await prisma.recurringOrder.findUnique({
      where: { id, tenantId: authResult.tenantId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Zlecenie cykliczne nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Delete recurring order
    await prisma.recurringOrder.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "DELETE",
      entityType: "RecurringOrder",
      entityId: id,
      metadata: { name: existingOrder.name },
      request,
    });

    return NextResponse.json({ message: "Zlecenie cykliczne zostalo usuniete" });
  } catch (error) {
    console.error("Error deleting recurring order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania zlecenia cyklicznego" },
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
