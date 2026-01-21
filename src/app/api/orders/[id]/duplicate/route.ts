import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit-service";

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

// Helper function to generate new order number
async function generateDuplicateOrderNumber(
  tenantId: string,
  originalOrderNumber: string
): Promise<string> {
  // Check if original already has -COPY suffix
  const baseName = originalOrderNumber.replace(/-COPY(-\d+)?$/, "");

  // Find existing copies
  const existingCopies = await prisma.order.findMany({
    where: {
      tenantId,
      orderNumber: {
        startsWith: `${baseName}-COPY`,
      },
    },
    select: {
      orderNumber: true,
    },
  });

  if (existingCopies.length === 0) {
    // No copies exist, check if base-COPY is available
    const baseNameCopyExists = await prisma.order.findUnique({
      where: {
        tenantId_orderNumber: {
          tenantId,
          orderNumber: `${baseName}-COPY`,
        },
      },
    });

    if (!baseNameCopyExists) {
      return `${baseName}-COPY`;
    }
  }

  // Find the highest copy number
  let maxNumber = 0;
  for (const copy of existingCopies) {
    const match = copy.orderNumber.match(/-COPY(?:-(\d+))?$/);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `${baseName}-COPY-${maxNumber + 1}`;
}

// POST /api/orders/[id]/duplicate - Duplicate an order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;

    // Parse request body for daysOffset
    let daysOffset = 0;
    try {
      const body = await request.json();
      if (body.daysOffset !== undefined) {
        daysOffset = parseInt(body.daysOffset, 10) || 0;
      }
    } catch {
      // No body or invalid JSON, use default daysOffset = 0
    }

    // Fetch the original order
    const originalOrder = await prisma.order.findUnique({
      where: { id, tenantId: authResult.tenantId },
      include: {
        waypoints: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!originalOrder) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Generate new order number
    const newOrderNumber = await generateDuplicateOrderNumber(
      authResult.tenantId,
      originalOrder.orderNumber
    );

    // Calculate new dates with offset
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    baseDate.setDate(baseDate.getDate() + daysOffset);

    const newLoadingDate = new Date(baseDate);
    const newUnloadingDate = new Date(baseDate);

    // Create the duplicated order
    const duplicatedOrder = await prisma.$transaction(async (tx) => {
      // Create the new order - copy all relevant fields except excluded ones
      const newOrder = await tx.order.create({
        data: {
          tenantId: authResult.tenantId,
          orderNumber: newOrderNumber,
          externalNumber: originalOrder.externalNumber,
          type: originalOrder.type,
          status: OrderStatus.PLANNED, // Always set to PLANNED
          contractorId: originalOrder.contractorId,
          subcontractorId: originalOrder.subcontractorId,
          vehicleId: originalOrder.vehicleId,
          trailerId: originalOrder.trailerId,
          driverId: originalOrder.driverId,
          // Route
          origin: originalOrder.origin,
          originCity: originalOrder.originCity,
          originCountry: originalOrder.originCountry,
          destination: originalOrder.destination,
          destinationCity: originalOrder.destinationCity,
          destinationCountry: originalOrder.destinationCountry,
          distanceKm: originalOrder.distanceKm,
          // New dates
          loadingDate: newLoadingDate,
          loadingTimeFrom: originalOrder.loadingTimeFrom,
          loadingTimeTo: originalOrder.loadingTimeTo,
          unloadingDate: newUnloadingDate,
          unloadingTimeFrom: originalOrder.unloadingTimeFrom,
          unloadingTimeTo: originalOrder.unloadingTimeTo,
          // Cargo
          cargoDescription: originalOrder.cargoDescription,
          cargoWeight: originalOrder.cargoWeight,
          cargoVolume: originalOrder.cargoVolume,
          cargoPallets: originalOrder.cargoPallets,
          cargoValue: originalOrder.cargoValue,
          requiresAdr: originalOrder.requiresAdr,
          // Pricing
          priceNet: originalOrder.priceNet,
          currency: originalOrder.currency,
          costNet: originalOrder.costNet,
          // Flat rate
          flatRateKm: originalOrder.flatRateKm,
          flatRateOverage: originalOrder.flatRateOverage,
          kmLimit: originalOrder.kmLimit,
          kmOverageRate: originalOrder.kmOverageRate,
          // Notes
          notes: originalOrder.notes,
          internalNotes: originalOrder.internalNotes,
          // Mobile app / Driver specific addresses
          loadingAddress: originalOrder.loadingAddress,
          loadingContact: originalOrder.loadingContact,
          loadingPhone: originalOrder.loadingPhone,
          unloadingAddress: originalOrder.unloadingAddress,
          unloadingContact: originalOrder.unloadingContact,
          unloadingPhone: originalOrder.unloadingPhone,
        },
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              registrationNumber: true,
            },
          },
          trailer: {
            select: {
              id: true,
              registrationNumber: true,
            },
          },
        },
      });

      // Copy waypoints if any exist
      if (originalOrder.waypoints.length > 0) {
        await tx.waypoint.createMany({
          data: originalOrder.waypoints.map((wp) => ({
            orderId: newOrder.id,
            sequence: wp.sequence,
            type: wp.type,
            address: wp.address,
            city: wp.city,
            country: wp.country,
            scheduledDate: wp.scheduledDate ? new Date(baseDate) : null,
            scheduledTime: wp.scheduledTime,
            notes: wp.notes,
          })),
        });
      }

      return newOrder;
    });

    // Log audit
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "CREATE",
      entityType: "Order",
      entityId: duplicatedOrder.id,
      metadata: {
        orderNumber: duplicatedOrder.orderNumber,
        duplicatedFrom: originalOrder.id,
        originalOrderNumber: originalOrder.orderNumber,
        daysOffset,
      },
      request,
    });

    return NextResponse.json(duplicatedOrder, { status: 201 });
  } catch (error) {
    console.error("Error duplicating order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas duplikowania zlecenia" },
      { status: 500 }
    );
  }
}
