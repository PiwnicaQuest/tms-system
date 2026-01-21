import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { VehicleType, VehicleStatus, FuelType } from "@prisma/client";
import { logAudit, getEntityChanges } from "@/lib/audit/audit-service";

// Validation schemas
const vehicleUpdateSchema = z.object({
  registrationNumber: z.string().min(1).optional(),
  type: z.nativeEnum(VehicleType).optional(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  vin: z.string().optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  status: z.nativeEnum(VehicleStatus).optional(),
  loadCapacity: z.number().positive().optional().nullable(),
  volume: z.number().positive().optional().nullable(),
  euroClass: z.string().optional().nullable(),
  fuelType: z.nativeEnum(FuelType).optional().nullable(),
  currentDriverId: z.string().optional().nullable(),
  currentTrailerId: z.string().optional().nullable(),
  lastLatitude: z.number().optional().nullable(),
  lastLongitude: z.number().optional().nullable(),
  lastGpsUpdate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const idSchema = z.string().min(1, "ID jest wymagane");

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/vehicles/[id] - Get single vehicle
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID pojazdu" },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: validatedId.data,
        tenantId, // Tenant isolation
      },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            origin: true,
            destination: true,
            loadingDate: true,
            unloadingDate: true,
          },
        },
        costs: {
          take: 10,
          orderBy: { date: "desc" },
          select: {
            id: true,
            category: true,
            amount: true,
            currency: true,
            date: true,
            description: true,
          },
        },
        documents: {
          orderBy: { expiryDate: "asc" },
          select: {
            id: true,
            type: true,
            name: true,
            expiryDate: true,
            fileUrl: true,
          },
        },
        _count: {
          select: {
            orders: true,
            costs: true,
            documents: true,
            dailyWorkRecords: true,
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Pojazd nie zostal znaleziony" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: vehicle });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania pojazdu" },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id] - Update vehicle
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Check user role
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do edycji pojazdow" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID pojazdu" },
        { status: 400 }
      );
    }

    // Check if vehicle exists and belongs to tenant
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: "Pojazd nie zostal znaleziony" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = vehicleUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    // If registration number is being changed, check for duplicates
    if (
      validatedData.data.registrationNumber &&
      validatedData.data.registrationNumber !==
        existingVehicle.registrationNumber
    ) {
      const duplicateVehicle = await prisma.vehicle.findUnique({
        where: {
          tenantId_registrationNumber: {
            tenantId,
            registrationNumber: validatedData.data.registrationNumber,
          },
        },
      });

      if (duplicateVehicle) {
        return NextResponse.json(
          { error: "Pojazd o tym numerze rejestracyjnym juz istnieje" },
          { status: 409 }
        );
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: validatedId.data },
      data: validatedData.data,
    });

    // Log audit
    const changes = getEntityChanges(
      existingVehicle as unknown as Record<string, unknown>,
      vehicle as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      changes,
      metadata: { registrationNumber: vehicle.registrationNumber },
      request,
    });

    return NextResponse.json({ data: vehicle });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji pojazdu" },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[id] - Delete vehicle (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check user role - only ADMIN or higher can delete
    const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do usuwania pojazdow" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID pojazdu" },
        { status: 400 }
      );
    }

    // Check if vehicle exists and belongs to tenant
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: "Pojazd nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Check for related active orders
    const activeOrders = await prisma.order.count({
      where: {
        vehicleId: validatedId.data,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        {
          error:
            "Nie mozna usunac pojazdu z aktywnymi zleceniami. Najpierw zakoncz lub anuluj powiazane zlecenia.",
        },
        { status: 409 }
      );
    }

    // Soft delete - set isActive to false and status to INACTIVE
    const vehicle = await prisma.vehicle.update({
      where: { id: validatedId.data },
      data: {
        isActive: false,
        status: VehicleStatus.INACTIVE,
      },
    });

    // Log audit
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      metadata: { registrationNumber: existingVehicle.registrationNumber },
      request,
    });

    return NextResponse.json({
      data: vehicle,
      message: "Pojazd zostal dezaktywowany",
    });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania pojazdu" },
      { status: 500 }
    );
  }
}
