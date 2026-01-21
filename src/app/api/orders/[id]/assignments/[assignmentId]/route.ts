import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { AssignmentReason } from "@prisma/client";
import { logAudit, getEntityChanges } from "@/lib/audit/audit-service";
import { triggerWebhook } from "@/lib/webhooks";
import { orderAssignmentUpdateSchema, endAssignmentSchema } from "@/lib/validations/order";

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string }>;
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

// Helper to calculate allocated amount
function calculateAllocatedAmount(orderPrice: number | null, revenueShare: number): number | null {
  if (!orderPrice) return null;
  return Math.round(orderPrice * revenueShare * 100) / 100;
}

// GET /api/orders/[id]/assignments/[assignmentId] - Get single assignment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id: orderId, assignmentId } = await params;

    const assignment = await prisma.orderAssignment.findFirst({
      where: {
        id: assignmentId,
        orderId,
        tenantId: authResult.tenantId,
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
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
            type: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            priceNet: true,
            loadingDate: true,
            unloadingDate: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Przypisanie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania przypisania" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id]/assignments/[assignmentId] - Update assignment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id: orderId, assignmentId } = await params;
    const body = await request.json();

    // Check if this is an "end assignment" request
    const isEndRequest = body.action === "end";

    // Validate input based on request type
    const validationResult = isEndRequest
      ? endAssignmentSchema.safeParse(body)
      : orderAssignmentUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe dane", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get existing assignment
    const existingAssignment = await prisma.orderAssignment.findFirst({
      where: {
        id: assignmentId,
        orderId,
        tenantId: authResult.tenantId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            priceNet: true,
            loadingDate: true,
            unloadingDate: true,
          },
        },
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Przypisanie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    const data = validationResult.data;
    const updateData: Record<string, unknown> = {};

    if (isEndRequest) {
      // End assignment - set endDate and optionally update reason
      const endData = data as { endDate: Date; reason?: string; reasonNote?: string };
      updateData.endDate = new Date(endData.endDate);
      updateData.isActive = true; // Keep as active but with end date
      if (endData.reason) {
        updateData.reason = endData.reason as AssignmentReason;
      }
      if (endData.reasonNote !== undefined) {
        updateData.reasonNote = endData.reasonNote;
      }
    } else {
      // Regular update
      const updateInput = data as Record<string, unknown>;

      if (updateInput.driverId !== undefined) {
        // Verify driver
        const driver = await prisma.driver.findFirst({
          where: { id: updateInput.driverId as string, tenantId: authResult.tenantId, isActive: true },
        });
        if (!driver) {
          return NextResponse.json(
            { error: "Kierowca nie zostal znaleziony" },
            { status: 400 }
          );
        }
        updateData.driverId = updateInput.driverId;
      }

      if (updateInput.vehicleId !== undefined) {
        if (updateInput.vehicleId) {
          const vehicle = await prisma.vehicle.findFirst({
            where: { id: updateInput.vehicleId as string, tenantId: authResult.tenantId, isActive: true },
          });
          if (!vehicle) {
            return NextResponse.json(
              { error: "Pojazd nie zostal znaleziony" },
              { status: 400 }
            );
          }
        }
        updateData.vehicleId = updateInput.vehicleId || null;
      }

      if (updateInput.trailerId !== undefined) {
        if (updateInput.trailerId) {
          const trailer = await prisma.trailer.findFirst({
            where: { id: updateInput.trailerId as string, tenantId: authResult.tenantId, isActive: true },
          });
          if (!trailer) {
            return NextResponse.json(
              { error: "Naczepa nie zostala znaleziona" },
              { status: 400 }
            );
          }
        }
        updateData.trailerId = updateInput.trailerId || null;
      }

      if (updateInput.startDate !== undefined) {
        updateData.startDate = new Date(updateInput.startDate as string);
      }

      if (updateInput.endDate !== undefined) {
        updateData.endDate = updateInput.endDate ? new Date(updateInput.endDate as string) : null;
      }

      if (updateInput.revenueShare !== undefined) {
        // Validate that new share doesn't exceed 100% total
        const activeAssignments = await prisma.orderAssignment.findMany({
          where: {
            tenantId: authResult.tenantId,
            orderId,
            isActive: true,
            endDate: null,
            id: { not: assignmentId },
          },
          select: { revenueShare: true },
        });

        const otherSharesSum = activeAssignments.reduce((sum, a) => sum + a.revenueShare, 0);
        const newShare = updateInput.revenueShare as number;

        if (otherSharesSum + newShare > 1.001) {
          return NextResponse.json(
            {
              error: `Suma udzialow przekracza 100%. Inne aktywne przypisania: ${Math.round(otherSharesSum * 100)}%, probowano ustawic: ${Math.round(newShare * 100)}%`,
            },
            { status: 400 }
          );
        }

        updateData.revenueShare = newShare;

        // Recalculate allocated amount if revenue share changed
        if (!updateInput.allocatedAmount) {
          updateData.allocatedAmount = calculateAllocatedAmount(
            existingAssignment.order.priceNet,
            newShare
          );
        }
      }

      if (updateInput.allocatedAmount !== undefined) {
        updateData.allocatedAmount = updateInput.allocatedAmount;
      }

      if (updateInput.distanceKm !== undefined) {
        updateData.distanceKm = updateInput.distanceKm;
      }

      if (updateInput.reason !== undefined) {
        updateData.reason = updateInput.reason as AssignmentReason;
      }

      if (updateInput.reasonNote !== undefined) {
        updateData.reasonNote = updateInput.reasonNote;
      }

      if (updateInput.isPrimary !== undefined) {
        updateData.isPrimary = updateInput.isPrimary;
      }

      if (updateInput.isActive !== undefined) {
        updateData.isActive = updateInput.isActive;
      }
    }

    // Update assignment
    const assignment = await prisma.orderAssignment.update({
      where: { id: assignmentId },
      data: updateData,
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
        trailer: {
          select: {
            id: true,
            registrationNumber: true,
          },
        },
      },
    });

    // If this assignment was marked as primary, update order
    if (updateData.isPrimary === true) {
      // Remove primary from other assignments
      await prisma.orderAssignment.updateMany({
        where: {
          tenantId: authResult.tenantId,
          orderId,
          id: { not: assignmentId },
          isPrimary: true,
        },
        data: { isPrimary: false },
      });

      // Update order's direct assignment
      await prisma.order.update({
        where: { id: orderId },
        data: {
          driverId: assignment.driverId,
          vehicleId: assignment.vehicleId,
          trailerId: assignment.trailerId,
        },
      });
    }

    // Log audit
    const changes = getEntityChanges(
      existingAssignment as unknown as Record<string, unknown>,
      assignment as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "UPDATE",
      entityType: "OrderAssignment",
      entityId: assignment.id,
      changes,
      metadata: {
        orderId,
        orderNumber: existingAssignment.order.orderNumber,
        ...(isEndRequest && { endDate: updateData.endDate }),
      },
      request,
    });

    // Trigger webhook
    triggerWebhook(authResult.tenantId, "order.assignment_updated", {
      assignment: {
        id: assignment.id,
        orderId,
        orderNumber: existingAssignment.order.orderNumber,
        driver: assignment.driver,
        vehicle: assignment.vehicle,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        revenueShare: assignment.revenueShare,
        reason: assignment.reason,
      },
      changes,
      action: isEndRequest ? "ended" : "updated",
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji przypisania" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id]/assignments/[assignmentId] - Delete assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id: orderId, assignmentId } = await params;

    // Get existing assignment
    const existingAssignment = await prisma.orderAssignment.findFirst({
      where: {
        id: assignmentId,
        orderId,
        tenantId: authResult.tenantId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            driverId: true,
          },
        },
        driver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Przypisanie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Check if there are DailyWorkRecords linked to this assignment's order and driver
    const relatedWorkRecords = await prisma.dailyWorkRecord.count({
      where: {
        tenantId: authResult.tenantId,
        orderId,
        driverId: existingAssignment.driverId,
      },
    });

    if (relatedWorkRecords > 0) {
      return NextResponse.json(
        { error: "Nie mozna usunac przypisania powiazanego z rekordami pracy. Zamiast tego zakoncz przypisanie." },
        { status: 400 }
      );
    }

    // Delete assignment
    await prisma.orderAssignment.delete({
      where: { id: assignmentId },
    });

    // If this was the primary assignment, try to set another one as primary
    if (existingAssignment.isPrimary) {
      const nextAssignment = await prisma.orderAssignment.findFirst({
        where: {
          tenantId: authResult.tenantId,
          orderId,
          isActive: true,
          endDate: null,
        },
        orderBy: { createdAt: "asc" },
      });

      if (nextAssignment) {
        await prisma.orderAssignment.update({
          where: { id: nextAssignment.id },
          data: { isPrimary: true },
        });

        await prisma.order.update({
          where: { id: orderId },
          data: {
            driverId: nextAssignment.driverId,
            vehicleId: nextAssignment.vehicleId,
            trailerId: nextAssignment.trailerId,
          },
        });
      } else {
        // No more assignments, clear order's direct assignment
        await prisma.order.update({
          where: { id: orderId },
          data: {
            driverId: null,
            vehicleId: null,
            trailerId: null,
          },
        });
      }
    }

    // Log audit
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "DELETE",
      entityType: "OrderAssignment",
      entityId: assignmentId,
      metadata: {
        orderId,
        orderNumber: existingAssignment.order.orderNumber,
        driverName: `${existingAssignment.driver.firstName} ${existingAssignment.driver.lastName}`,
      },
      request,
    });

    // Trigger webhook
    triggerWebhook(authResult.tenantId, "order.assignment_deleted", {
      assignmentId,
      orderId,
      orderNumber: existingAssignment.order.orderNumber,
      driverId: existingAssignment.driverId,
    });

    return NextResponse.json({ message: "Przypisanie zostalo usuniete" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania przypisania" },
      { status: 500 }
    );
  }
}
