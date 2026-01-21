import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { RecurringFrequency, OrderStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit-service";
import { triggerWebhook } from "@/lib/webhooks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/recurring-orders/[id]/generate - Generate order from recurring template
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json().catch(() => ({}));

    // Get the recurring order template
    const template = await prisma.recurringOrder.findUnique({
      where: { id, tenantId },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Szablon zlecenia cyklicznego nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Check if template is active
    if (!template.isActive) {
      return NextResponse.json(
        { error: "Szablon zlecenia cyklicznego jest nieaktywny" },
        { status: 400 }
      );
    }

    // Check if end date has passed
    if (template.endDate && new Date(template.endDate) < new Date()) {
      return NextResponse.json(
        { error: "Data zakonczenia szablonu minela" },
        { status: 400 }
      );
    }

    // Generate order number: REC-{templateId}-{count}
    const newCount = template.generatedOrdersCount + 1;
    const orderNumber = `REC-${template.id.slice(-6).toUpperCase()}-${String(newCount).padStart(4, "0")}`;

    // Calculate dates based on nextGenerationDate or provided overrides
    const baseDate = body.loadingDate ? new Date(body.loadingDate) : new Date(template.nextGenerationDate);
    const loadingDate = new Date(baseDate);
    
    // Calculate unloading date (same day by default, or can be overridden)
    let unloadingDate: Date;
    if (body.unloadingDate) {
      unloadingDate = new Date(body.unloadingDate);
    } else {
      // Default: same day as loading
      unloadingDate = new Date(loadingDate);
    }

    // Create the order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the new order
      const order = await tx.order.create({
        data: {
          tenantId,
          orderNumber,
          type: template.type,
          status: OrderStatus.PLANNED,
          contractorId: template.contractorId,
          origin: template.origin,
          originCity: template.originCity,
          originPostalCode: template.originPostalCode,
          originCountry: template.originCountry,
          destination: template.destination,
          destinationCity: template.destinationCity,
          destinationPostalCode: template.destinationPostalCode,
          destinationCountry: template.destinationCountry,
          distanceKm: template.distanceKm,
          loadingDate,
          loadingTimeFrom: template.loadingTimeFrom,
          loadingTimeTo: template.loadingTimeTo,
          unloadingDate,
          unloadingTimeFrom: template.unloadingTimeFrom,
          unloadingTimeTo: template.unloadingTimeTo,
          cargoDescription: template.cargoDescription,
          cargoWeight: template.cargoWeight,
          cargoVolume: template.cargoVolume,
          cargoPallets: template.cargoPallets,
          requiresAdr: template.requiresAdr,
          priceNet: template.priceNet,
          currency: template.currency,
          notes: template.notes,
          internalNotes: `Wygenerowano automatycznie z szablonu: ${template.name}${template.internalNotes ? "\n\n" + template.internalNotes : ""}`,
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
        },
      });

      // Calculate next generation date
      const nextGenerationDate = calculateNextGenerationDate(
        template.nextGenerationDate,
        template.frequency,
        template.dayOfWeek,
        template.dayOfMonth
      );

      // Update the recurring order template
      const updatedTemplate = await tx.recurringOrder.update({
        where: { id },
        data: {
          generatedOrdersCount: newCount,
          lastGeneratedAt: new Date(),
          nextGenerationDate,
        },
      });

      return { order, updatedTemplate };
    });

    // Log audit for order creation
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "Order",
      entityId: result.order.id,
      metadata: {
        orderNumber: result.order.orderNumber,
        generatedFromTemplate: template.id,
        templateName: template.name,
      },
      request,
    });

    // Log audit for template update
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "RecurringOrder",
      entityId: template.id,
      metadata: {
        action: "GENERATE_ORDER",
        generatedOrderId: result.order.id,
        generatedOrderNumber: result.order.orderNumber,
        newCount,
      },
      request,
    });

    // Trigger webhook for order creation
    triggerWebhook(tenantId, "order.created", {
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
        origin: result.order.origin,
        destination: result.order.destination,
        loadingDate: result.order.loadingDate,
        unloadingDate: result.order.unloadingDate,
        priceNet: result.order.priceNet,
        currency: result.order.currency,
        contractor: result.order.contractor,
      },
      generatedFromTemplate: {
        id: template.id,
        name: template.name,
      },
    });

    return NextResponse.json({
      order: result.order,
      template: {
        id: result.updatedTemplate.id,
        name: result.updatedTemplate.name,
        generatedOrdersCount: result.updatedTemplate.generatedOrdersCount,
        lastGeneratedAt: result.updatedTemplate.lastGeneratedAt,
        nextGenerationDate: result.updatedTemplate.nextGenerationDate,
      },
      message: `Zlecenie ${result.order.orderNumber} zostalo wygenerowane pomyslnie`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error generating order from template:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas generowania zlecenia z szablonu" },
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
  const nextDate = new Date(fromDate);

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
      // Handle day of month edge cases
      if (dayOfMonth) {
        const targetDay = Math.min(dayOfMonth, getDaysInMonth(nextDate));
        nextDate.setDate(targetDay);
      }
      break;
  }

  // Adjust to specific day of week for WEEKLY/BIWEEKLY if needed
  if ((frequency === "WEEKLY" || frequency === "BIWEEKLY") && dayOfWeek !== undefined && dayOfWeek !== null) {
    const currentDay = nextDate.getDay();
    if (currentDay !== dayOfWeek) {
      const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
      nextDate.setDate(nextDate.getDate() + daysUntilTarget);
    }
  }

  return nextDate;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
