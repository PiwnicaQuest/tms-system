import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { DriverStatus, EmploymentType } from "@prisma/client";
import { logAudit, getEntityChanges } from "@/lib/audit/audit-service";

// Validation schemas
const driverUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  pesel: z.string().length(11).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  employmentDate: z.coerce.date().optional().nullable(),
  terminationDate: z.coerce.date().optional().nullable(),
  currentVehicleId: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  licenseExpiry: z.coerce.date().optional().nullable(),
  licenseCategories: z.string().optional().nullable(),
  adrNumber: z.string().optional().nullable(),
  adrExpiry: z.coerce.date().optional().nullable(),
  adrClasses: z.string().optional().nullable(),
  medicalExpiry: z.coerce.date().optional().nullable(),
  status: z.nativeEnum(DriverStatus).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const idSchema = z.string().min(1, "ID jest wymagane");

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/drivers/[id] - Get single driver
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
        { error: "Nieprawidlowe ID kierowcy" },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findFirst({
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
            priceNet: true,
            currency: true,
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
        driverMonthlyReports: {
          take: 6,
          orderBy: [{ year: "desc" }, { month: "desc" }],
          select: {
            id: true,
            year: true,
            month: true,
            workDays: true,
            totalRevenue: true,
            totalOrders: true,
            avgDailyRevenue: true,
            isFinalized: true,
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

    if (!driver) {
      return NextResponse.json(
        { error: "Kierowca nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Calculate document expiry warnings
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiryWarnings: Array<{
      type: string;
      expiryDate: Date;
      daysUntilExpiry: number;
      isExpired: boolean;
    }> = [];

    if (driver.licenseExpiry) {
      const daysUntil = Math.ceil(
        (driver.licenseExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 30) {
        expiryWarnings.push({
          type: "Prawo jazdy",
          expiryDate: driver.licenseExpiry,
          daysUntilExpiry: daysUntil,
          isExpired: daysUntil < 0,
        });
      }
    }

    if (driver.adrExpiry) {
      const daysUntil = Math.ceil(
        (driver.adrExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 30) {
        expiryWarnings.push({
          type: "Certyfikat ADR",
          expiryDate: driver.adrExpiry,
          daysUntilExpiry: daysUntil,
          isExpired: daysUntil < 0,
        });
      }
    }

    if (driver.medicalExpiry) {
      const daysUntil = Math.ceil(
        (driver.medicalExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 30) {
        expiryWarnings.push({
          type: "Badania lekarskie",
          expiryDate: driver.medicalExpiry,
          daysUntilExpiry: daysUntil,
          isExpired: daysUntil < 0,
        });
      }
    }

    return NextResponse.json({
      data: {
        ...driver,
        expiryWarnings,
      },
    });
  } catch (error) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania kierowcy" },
      { status: 500 }
    );
  }
}

// PUT /api/drivers/[id] - Update driver
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
        { error: "Brak uprawnien do edycji kierowcow" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID kierowcy" },
        { status: 400 }
      );
    }

    // Check if driver exists and belongs to tenant
    const existingDriver = await prisma.driver.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: "Kierowca nie zostal znaleziony" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = driverUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    // If PESEL is being changed, check for duplicates
    if (
      validatedData.data.pesel &&
      validatedData.data.pesel !== existingDriver.pesel
    ) {
      const duplicateDriver = await prisma.driver.findFirst({
        where: {
          tenantId,
          pesel: validatedData.data.pesel,
          id: { not: validatedId.data },
        },
      });

      if (duplicateDriver) {
        return NextResponse.json(
          { error: "Kierowca o tym numerze PESEL juz istnieje" },
          { status: 409 }
        );
      }
    }

    // Validate currentVehicleId if provided
    if (validatedData.data.currentVehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: validatedData.data.currentVehicleId,
          tenantId,
        },
      });

      if (!vehicle) {
        return NextResponse.json(
          { error: "Wybrany pojazd nie istnieje" },
          { status: 400 }
        );
      }
    }

    const driver = await prisma.driver.update({
      where: { id: validatedId.data },
      data: validatedData.data,
    });

    // Log audit
    const changes = getEntityChanges(
      existingDriver as unknown as Record<string, unknown>,
      driver as unknown as Record<string, unknown>
    );
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Driver",
      entityId: driver.id,
      changes,
      metadata: { name: `${driver.firstName} ${driver.lastName}` },
      request,
    });

    return NextResponse.json({ data: driver });
  } catch (error) {
    console.error("Error updating driver:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji kierowcy" },
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/[id] - Delete driver (soft delete)
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
        { error: "Brak uprawnien do usuwania kierowcow" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID kierowcy" },
        { status: 400 }
      );
    }

    // Check if driver exists and belongs to tenant
    const existingDriver = await prisma.driver.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: "Kierowca nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Check for related active orders
    const activeOrders = await prisma.order.count({
      where: {
        driverId: validatedId.data,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        {
          error:
            "Nie mozna usunac kierowcy z aktywnymi zleceniami. Najpierw zakoncz lub anuluj powiazane zlecenia.",
        },
        { status: 409 }
      );
    }

    // Soft delete - set isActive to false and status to TERMINATED
    const driver = await prisma.driver.update({
      where: { id: validatedId.data },
      data: {
        isActive: false,
        status: DriverStatus.TERMINATED,
        terminationDate: new Date(),
      },
    });

    // Log audit
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "Driver",
      entityId: driver.id,
      metadata: { name: `${existingDriver.firstName} ${existingDriver.lastName}` },
      request,
    });

    return NextResponse.json({
      data: driver,
      message: "Kierowca zostal dezaktywowany",
    });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania kierowcy" },
      { status: 500 }
    );
  }
}
