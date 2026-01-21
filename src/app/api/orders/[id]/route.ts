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

    // Extract waypoints from body
    const { waypoints, ...orderData } = body;

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
      orderData.orderNumber &&
      orderData.orderNumber !== existingOrder.orderNumber
    ) {
      const duplicateOrder = await prisma.order.findUnique({
        where: {
          tenantId_orderNumber: {
            tenantId: existingOrder.tenantId,
            orderNumber: orderData.orderNumber,
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

    // Update order and waypoints in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Delete existing STOP waypoints
      await tx.waypoint.deleteMany({
        where: {
          orderId: id,
          type: "STOP",
        },
      });

      // Update order
      const order = await tx.order.update({
        where: { id },
        data: {
          orderNumber: orderData.orderNumber ?? existingOrder.orderNumber,
          externalNumber: orderData.externalNumber,
          type: orderData.type as OrderType,
          status: orderData.status as OrderStatus,
          contractorId: orderData.contractorId,
          subcontractorId: orderData.subcontractorId,
          vehicleId: orderData.vehicleId,
          trailerId: orderData.trailerId,
          driverId: orderData.driverId,
          origin: orderData.origin ?? existingOrder.origin,
          originCity: orderData.originCity,
          originCountry: orderData.originCountry ?? "PL",
          destination: orderData.destination ?? existingOrder.destination,
          destinationCity: orderData.destinationCity,
          destinationCountry: orderData.destinationCountry ?? "PL",
          distanceKm: orderData.distanceKm ? parseFloat(orderData.distanceKm) : null,
          loadingDate: orderData.loadingDate
            ? new Date(orderData.loadingDate)
            : existingOrder.loadingDate,
          loadingTimeFrom: orderData.loadingTimeFrom,
          loadingTimeTo: orderData.loadingTimeTo,
          unloadingDate: orderData.unloadingDate
            ? new Date(orderData.unloadingDate)
            : existingOrder.unloadingDate,
          unloadingTimeFrom: orderData.unloadingTimeFrom,
          unloadingTimeTo: orderData.unloadingTimeTo,
          cargoDescription: orderData.cargoDescription,
          cargoWeight: orderData.cargoWeight ? parseFloat(orderData.cargoWeight) : null,
          cargoVolume: orderData.cargoVolume ? parseFloat(orderData.cargoVolume) : null,
          cargoPallets: orderData.cargoPallets ? parseInt(orderData.cargoPallets, 10) : null,
          cargoValue: orderData.cargoValue ? parseFloat(orderData.cargoValue) : null,
          requiresAdr: orderData.requiresAdr ?? false,
          priceNet: orderData.priceNet ? parseFloat(orderData.priceNet) : null,
          currency: orderData.currency ?? "PLN",
          costNet: orderData.costNet ? parseFloat(orderData.costNet) : null,
          flatRateKm: orderData.flatRateKm ? parseFloat(orderData.flatRateKm) : null,
          flatRateOverage: orderData.flatRateOverage
            ? parseFloat(orderData.flatRateOverage)
            : null,
          kmLimit: orderData.kmLimit ? parseFloat(orderData.kmLimit) : null,
          kmOverageRate: orderData.kmOverageRate
            ? parseFloat(orderData.kmOverageRate)
            : null,
          notes: orderData.notes,
          internalNotes: orderData.internalNotes,
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

      // Create new waypoints if provided
      if (waypoints && Array.isArray(waypoints) && waypoints.length > 0) {
        await tx.waypoint.createMany({
          data: waypoints.map((wp: any, index: number) => ({
            orderId: id,
            sequence: wp.sequence || index + 1,
            type: "STOP",
            address: wp.address,
            city: wp.city || null,
            country: wp.country || "PL",
            scheduledDate: wp.scheduledDate ? new Date(wp.scheduledDate) : null,
            scheduledTime: wp.scheduledTime || null,
            notes: wp.notes || null,
          })),
        });
      }

      return order;
    });

    // Log audit
    const changes = getEntityChanges(
      existingOrder as unknown as Record<string, unknown>,
      updatedOrder as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "UPDATE",
      entityType: "Order",
      entityId: updatedOrder.id,
      changes,
      metadata: { orderNumber: updatedOrder.orderNumber },
      request,
    });

    // Trigger webhook for order update
    triggerWebhook(authResult.tenantId, "order.updated", {
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        origin: updatedOrder.origin,
        destination: updatedOrder.destination,
        loadingDate: updatedOrder.loadingDate,
        unloadingDate: updatedOrder.unloadingDate,
        priceNet: updatedOrder.priceNet,
        currency: updatedOrder.currency,
        contractor: updatedOrder.contractor,
        driver: updatedOrder.driver,
        vehicle: updatedOrder.vehicle,
      },
      changes,
    });

    // Check if status changed
    if (existingOrder.status !== updatedOrder.status) {
      triggerWebhook(authResult.tenantId, "order.status_changed", {
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          origin: updatedOrder.origin,
          destination: updatedOrder.destination,
        },
        previousStatus: existingOrder.status,
        newStatus: updatedOrder.status,
      });
    }

    return NextResponse.json(updatedOrder);
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
