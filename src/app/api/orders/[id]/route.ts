import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { OrderStatus, OrderType } from "@prisma/client";
import { logAudit, getEntityChanges } from "@/lib/audit/audit-service";
import { triggerWebhook } from "@/lib/webhooks";

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

// GET /api/orders/[id] - Get single order
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

    const order = await prisma.order.findUnique({
      where: { id, tenantId: authResult.tenantId },
      include: {
        contractor: true,
        subcontractor: true,
        driver: true,
        vehicle: true,
        trailer: true,
        waypoints: {
          orderBy: { sequence: "asc" },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
        dailyWorkRecords: {
          include: {
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
          },
        },
        assignments: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                registrationNumber: true,
                brand: true,
                model: true,
              },
            },
            trailer: {
              select: {
                id: true,
                registrationNumber: true,
              },
            },
          },
          orderBy: [
            { isActive: "desc" },
            { startDate: "desc" },
          ],
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania zlecenia" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Update order (full update)
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

    // Check if order exists and belongs to tenant
    const existingOrder = await prisma.order.findUnique({
      where: { id, tenantId: authResult.tenantId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Check for duplicate order number if changed
    if (
      body.orderNumber &&
      body.orderNumber !== existingOrder.orderNumber
    ) {
      const duplicateOrder = await prisma.order.findUnique({
        where: {
          tenantId_orderNumber: {
            tenantId: existingOrder.tenantId,
            orderNumber: body.orderNumber,
          },
        },
      });

      if (duplicateOrder) {
        return NextResponse.json(
          { error: "Zlecenie o podanym numerze juz istnieje" },
          { status: 409 }
        );
      }
    }

    // Update order
    const order = await prisma.order.update({
      where: { id },
      data: {
        orderNumber: body.orderNumber ?? existingOrder.orderNumber,
        externalNumber: body.externalNumber,
        type: body.type as OrderType,
        status: body.status as OrderStatus,
        contractorId: body.contractorId,
        subcontractorId: body.subcontractorId,
        vehicleId: body.vehicleId,
        trailerId: body.trailerId,
        driverId: body.driverId,
        origin: body.origin ?? existingOrder.origin,
        originCity: body.originCity,
        originCountry: body.originCountry ?? "PL",
        originPostalCode: body.originPostalCode,
        destination: body.destination ?? existingOrder.destination,
        destinationCity: body.destinationCity,
        destinationCountry: body.destinationCountry ?? "PL",
        destinationPostalCode: body.destinationPostalCode,
        distanceKm: body.distanceKm ? parseFloat(body.distanceKm) : null,
        loadingDate: body.loadingDate
          ? new Date(body.loadingDate)
          : existingOrder.loadingDate,
        loadingTimeFrom: body.loadingTimeFrom,
        loadingTimeTo: body.loadingTimeTo,
        unloadingDate: body.unloadingDate
          ? new Date(body.unloadingDate)
          : existingOrder.unloadingDate,
        unloadingTimeFrom: body.unloadingTimeFrom,
        unloadingTimeTo: body.unloadingTimeTo,
        cargoDescription: body.cargoDescription,
        cargoWeight: body.cargoWeight ? parseFloat(body.cargoWeight) : null,
        cargoVolume: body.cargoVolume ? parseFloat(body.cargoVolume) : null,
        cargoPallets: body.cargoPallets ? parseInt(body.cargoPallets, 10) : null,
        cargoValue: body.cargoValue ? parseFloat(body.cargoValue) : null,
        requiresAdr: body.requiresAdr ?? false,
        priceNet: body.priceNet ? parseFloat(body.priceNet) : null,
        currency: body.currency ?? "PLN",
        costNet: body.costNet ? parseFloat(body.costNet) : null,
        flatRateKm: body.flatRateKm ? parseFloat(body.flatRateKm) : null,
        flatRateOverage: body.flatRateOverage
          ? parseFloat(body.flatRateOverage)
          : null,
        kmLimit: body.kmLimit ? parseFloat(body.kmLimit) : null,
        kmOverageRate: body.kmOverageRate
          ? parseFloat(body.kmOverageRate)
          : null,
        notes: body.notes,
        internalNotes: body.internalNotes,
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

    // Log audit
    const changes = getEntityChanges(
      existingOrder as unknown as Record<string, unknown>,
      order as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "UPDATE",
      entityType: "Order",
      entityId: order.id,
      changes,
      metadata: { orderNumber: order.orderNumber },
      request,
    });

    // Trigger webhook for order update
    triggerWebhook(authResult.tenantId, "order.updated", {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        origin: order.origin,
        destination: order.destination,
        loadingDate: order.loadingDate,
        unloadingDate: order.unloadingDate,
        priceNet: order.priceNet,
        currency: order.currency,
        contractor: order.contractor,
        driver: order.driver,
        vehicle: order.vehicle,
      },
      changes,
    });

    // Check if status changed
    if (existingOrder.status !== order.status) {
      triggerWebhook(authResult.tenantId, "order.status_changed", {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          origin: order.origin,
          destination: order.destination,
        },
        previousStatus: existingOrder.status,
        newStatus: order.status,
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji zlecenia" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Partial update (status updates, assignments)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Check if order exists and belongs to tenant
    const existingOrder = await prisma.order.findUnique({
      where: { id, tenantId: authResult.tenantId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      // Validate status transition
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        NEW: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.PLANNED],
        PLANNED: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
        ASSIGNED: [
          OrderStatus.CONFIRMED,
          OrderStatus.PLANNED,
          OrderStatus.CANCELLED,
        ],
        CONFIRMED: [
          OrderStatus.LOADING,
          OrderStatus.ASSIGNED,
          OrderStatus.CANCELLED,
          OrderStatus.PROBLEM,
        ],
        ACCEPTED: [
          OrderStatus.LOADING,
          OrderStatus.CANCELLED,
          OrderStatus.PROBLEM,
        ],
        LOADING: [
          OrderStatus.IN_TRANSIT,
          OrderStatus.CONFIRMED,
          OrderStatus.PROBLEM,
        ],
        IN_TRANSIT: [
          OrderStatus.UNLOADING,
          OrderStatus.LOADING,
          OrderStatus.PROBLEM,
        ],
        UNLOADING: [
          OrderStatus.DELIVERED,
          OrderStatus.IN_TRANSIT,
          OrderStatus.PROBLEM,
        ],
        DELIVERED: [
          OrderStatus.COMPLETED,
          OrderStatus.PROBLEM,
        ],
        COMPLETED: [OrderStatus.PROBLEM],
        CANCELLED: [OrderStatus.PLANNED],
        PROBLEM: [
          OrderStatus.PLANNED,
          OrderStatus.ASSIGNED,
          OrderStatus.CONFIRMED,
          OrderStatus.LOADING,
          OrderStatus.IN_TRANSIT,
          OrderStatus.UNLOADING,
          OrderStatus.COMPLETED,
          OrderStatus.CANCELLED,
        ],
      };

      const currentStatus = existingOrder.status;
      const newStatus = body.status as OrderStatus;

      if (
        currentStatus !== newStatus &&
        !validTransitions[currentStatus]?.includes(newStatus)
      ) {
        return NextResponse.json(
          {
            error: `Niedozwolona zmiana statusu z ${currentStatus} na ${newStatus}`,
          },
          { status: 400 }
        );
      }

      updateData.status = newStatus;
    }

    if (body.driverId !== undefined) {
      updateData.driverId = body.driverId || null;
    }

    if (body.vehicleId !== undefined) {
      updateData.vehicleId = body.vehicleId || null;
    }

    if (body.trailerId !== undefined) {
      updateData.trailerId = body.trailerId || null;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.internalNotes !== undefined) {
      updateData.internalNotes = body.internalNotes;
    }

    if (body.priceNet !== undefined) {
      updateData.priceNet = body.priceNet ? parseFloat(body.priceNet) : null;
    }

    if (body.costNet !== undefined) {
      updateData.costNet = body.costNet ? parseFloat(body.costNet) : null;
    }

    // Update order
    const order = await prisma.order.update({
      where: { id },
      data: updateData,
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

    // Log audit - determine action type based on what changed
    const changes = getEntityChanges(
      existingOrder as unknown as Record<string, unknown>,
      order as unknown as Record<string, unknown>
    );
    const action = body.status !== undefined && body.status !== existingOrder.status
      ? "STATUS_CHANGE" as const
      : "UPDATE" as const;
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action,
      entityType: "Order",
      entityId: order.id,
      changes,
      metadata: {
        orderNumber: order.orderNumber,
        ...(body.status && { newStatus: body.status, oldStatus: existingOrder.status })
      },
      request,
    });

    // Trigger webhook for order update
    triggerWebhook(authResult.tenantId, "order.updated", {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        origin: order.origin,
        destination: order.destination,
        loadingDate: order.loadingDate,
        unloadingDate: order.unloadingDate,
        priceNet: order.priceNet,
        currency: order.currency,
        contractor: order.contractor,
        driver: order.driver,
        vehicle: order.vehicle,
      },
      changes,
    });

    // Check if status changed - trigger dedicated status change webhook
    if (body.status !== undefined && body.status !== existingOrder.status) {
      triggerWebhook(authResult.tenantId, "order.status_changed", {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          origin: order.origin,
          destination: order.destination,
        },
        previousStatus: existingOrder.status,
        newStatus: order.status,
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error patching order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji zlecenia" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Delete order
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

    // Check if order exists and belongs to tenant
    const existingOrder = await prisma.order.findUnique({
      where: { id, tenantId: authResult.tenantId },
      include: {
        dailyWorkRecords: true,
        invoice: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Prevent deletion if order has invoice
    if (existingOrder.invoiceId) {
      return NextResponse.json(
        { error: "Nie mozna usunac zlecenia powiazanego z faktura" },
        { status: 400 }
      );
    }

    // Prevent deletion if order has daily work records
    if (existingOrder.dailyWorkRecords.length > 0) {
      return NextResponse.json(
        { error: "Nie mozna usunac zlecenia z przypisanymi rekordami pracy" },
        { status: 400 }
      );
    }

    // Delete waypoints first (cascade should handle this, but being explicit)
    await prisma.waypoint.deleteMany({
      where: { orderId: id },
    });

    // Delete order
    await prisma.order.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "DELETE",
      entityType: "Order",
      entityId: id,
      metadata: { orderNumber: existingOrder.orderNumber },
      request,
    });

    return NextResponse.json({ message: "Zlecenie zostalo usuniete" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania zlecenia" },
      { status: 500 }
    );
  }
}
