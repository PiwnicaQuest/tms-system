import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { AssignmentReason } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit-service";
import { triggerWebhook } from "@/lib/webhooks";
import { orderAssignmentSchema } from "@/lib/validations/order";

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

// Helper to calculate allocated amount based on revenue share
function calculateAllocatedAmount(orderPrice: number | null, revenueShare: number): number | null {
  if (!orderPrice) return null;
  return Math.round(orderPrice * revenueShare * 100) / 100;
}

// Helper to validate revenue shares sum to 1.0 for active assignments
async function validateRevenueShares(
  tenantId: string,
  orderId: string,
  newShare: number,
  excludeAssignmentId?: string
): Promise<{ valid: boolean; currentSum: number }> {
  const activeAssignments = await prisma.orderAssignment.findMany({
    where: {
      tenantId,
      orderId,
      isActive: true,
      endDate: null,
      ...(excludeAssignmentId && { id: { not: excludeAssignmentId } }),
    },
    select: { revenueShare: true },
  });

  const currentSum = activeAssignments.reduce((sum, a) => sum + a.revenueShare, 0);
  const totalWithNew = currentSum + newShare;

  // Allow small floating point tolerance (0.001)
  return {
    valid: totalWithNew <= 1.001,
    currentSum,
  };
}

// GET /api/orders/[id]/assignments - List all assignments for an order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Verify order exists and belongs to tenant
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId: authResult.tenantId },
      select: { id: true, orderNumber: true, priceNet: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Get assignments
    const assignments = await prisma.orderAssignment.findMany({
      where: {
        tenantId: authResult.tenantId,
        orderId,
        ...(includeInactive ? {} : { isActive: true }),
      },
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
            type: true,
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { startDate: "desc" },
      ],
    });

    // Calculate statistics
    const activeAssignments = assignments.filter(a => a.isActive && !a.endDate);
    const totalRevenueShare = activeAssignments.reduce((sum, a) => sum + a.revenueShare, 0);
    const totalAllocated = assignments.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0);

    return NextResponse.json({
      data: assignments,
      summary: {
        total: assignments.length,
        active: activeAssignments.length,
        completed: assignments.filter(a => a.endDate).length,
        totalRevenueShare: Math.round(totalRevenueShare * 100) / 100,
        totalAllocated: Math.round(totalAllocated * 100) / 100,
        orderPrice: order.priceNet,
        remainingShare: Math.round((1 - totalRevenueShare) * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania przypisan" },
      { status: 500 }
    );
  }
}

// POST /api/orders/[id]/assignments - Create new assignment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id: orderId } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = orderAssignmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe dane", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify order exists and belongs to tenant
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId: authResult.tenantId },
      select: {
        id: true,
        orderNumber: true,
        priceNet: true,
        loadingDate: true,
        unloadingDate: true,
        driverId: true,
        vehicleId: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Verify driver exists and belongs to tenant
    const driver = await prisma.driver.findFirst({
      where: { id: data.driverId, tenantId: authResult.tenantId, isActive: true },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Kierowca nie zostal znaleziony lub jest nieaktywny" },
        { status: 400 }
      );
    }

    // Verify vehicle if provided
    if (data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, tenantId: authResult.tenantId, isActive: true },
      });

      if (!vehicle) {
        return NextResponse.json(
          { error: "Pojazd nie zostal znaleziony lub jest nieaktywny" },
          { status: 400 }
        );
      }
    }

    // Verify trailer if provided
    if (data.trailerId) {
      const trailer = await prisma.trailer.findFirst({
        where: { id: data.trailerId, tenantId: authResult.tenantId, isActive: true },
      });

      if (!trailer) {
        return NextResponse.json(
          { error: "Naczepa nie zostala znaleziona lub jest nieaktywna" },
          { status: 400 }
        );
      }
    }

    // Validate date range
    const startDate = new Date(data.startDate);
    if (startDate < order.loadingDate) {
      return NextResponse.json(
        { error: "Data rozpoczecia nie moze byc wczesniejsza niz data zaladunku" },
        { status: 400 }
      );
    }

    if (data.endDate) {
      const endDate = new Date(data.endDate);
      if (endDate > order.unloadingDate) {
        return NextResponse.json(
          { error: "Data zakonczenia nie moze byc pozniejsza niz data rozladunku" },
          { status: 400 }
        );
      }
      if (endDate < startDate) {
        return NextResponse.json(
          { error: "Data zakonczenia nie moze byc wczesniejsza niz data rozpoczecia" },
          { status: 400 }
        );
      }
    }

    // Validate revenue shares
    const shareValidation = await validateRevenueShares(
      authResult.tenantId,
      orderId,
      data.revenueShare
    );

    if (!shareValidation.valid) {
      return NextResponse.json(
        {
          error: `Suma udzialow przekracza 100%. Aktualnie przypisane: ${Math.round(shareValidation.currentSum * 100)}%, probowano dodac: ${Math.round(data.revenueShare * 100)}%`,
        },
        { status: 400 }
      );
    }

    // Check for overlapping assignments for the same driver
    const overlappingAssignment = await prisma.orderAssignment.findFirst({
      where: {
        tenantId: authResult.tenantId,
        orderId,
        driverId: data.driverId,
        isActive: true,
        endDate: null,
      },
    });

    if (overlappingAssignment) {
      return NextResponse.json(
        { error: "Kierowca ma juz aktywne przypisanie do tego zlecenia. Zakoncz poprzednie przypisanie przed dodaniem nowego." },
        { status: 400 }
      );
    }

    // Calculate allocated amount
    const allocatedAmount = data.allocatedAmount ?? calculateAllocatedAmount(order.priceNet, data.revenueShare);

    // Determine if this should be primary
    const existingAssignments = await prisma.orderAssignment.count({
      where: { tenantId: authResult.tenantId, orderId },
    });
    const isPrimary = data.isPrimary || existingAssignments === 0;

    // Create assignment
    const assignment = await prisma.orderAssignment.create({
      data: {
        tenantId: authResult.tenantId,
        orderId,
        driverId: data.driverId,
        vehicleId: data.vehicleId || null,
        trailerId: data.trailerId || null,
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : null,
        revenueShare: data.revenueShare,
        allocatedAmount,
        distanceKm: data.distanceKm || null,
        reason: data.reason as AssignmentReason,
        reasonNote: data.reasonNote || null,
        isPrimary,
        isActive: true,
        createdBy: authResult.userId,
      },
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

    // If this is primary, update the order's direct assignment fields
    if (isPrimary) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          driverId: data.driverId,
          vehicleId: data.vehicleId || null,
          trailerId: data.trailerId || null,
        },
      });
    }

    // Log audit
    await logAudit({
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      action: "CREATE",
      entityType: "OrderAssignment",
      entityId: assignment.id,
      metadata: {
        orderId,
        orderNumber: order.orderNumber,
        driverId: data.driverId,
        driverName: `${driver.firstName} ${driver.lastName}`,
        revenueShare: data.revenueShare,
        reason: data.reason,
      },
      request,
    });

    // Trigger webhook
    triggerWebhook(authResult.tenantId, "order.assignment_created", {
      assignment: {
        id: assignment.id,
        orderId,
        orderNumber: order.orderNumber,
        driver: assignment.driver,
        vehicle: assignment.vehicle,
        startDate: assignment.startDate,
        revenueShare: assignment.revenueShare,
        reason: assignment.reason,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia przypisania" },
      { status: 500 }
    );
  }
}
