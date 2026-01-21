import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { DriverStatus, EmploymentType } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit-service";

// Validation schemas
const driverCreateSchema = z.object({
  firstName: z.string().min(1, "Imie jest wymagane"),
  lastName: z.string().min(1, "Nazwisko jest wymagane"),
  pesel: z
    .string()
    .length(11, "PESEL musi miec 11 znakow")
    .optional()
    .nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Nieprawidlowy email").optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  employmentType: z
    .nativeEnum(EmploymentType)
    .default(EmploymentType.EMPLOYMENT),
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
  status: z.nativeEnum(DriverStatus).default(DriverStatus.ACTIVE),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const driverQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  hasExpiringDocuments: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  sortBy: z
    .enum(["firstName", "lastName", "status", "employmentDate", "createdAt"])
    .default("lastName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// GET /api/drivers - List drivers with pagination and filters
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedQuery = driverQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe parametry zapytania",
          details: validatedQuery.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      status,
      employmentType,
      isActive,
      hasExpiringDocuments,
      sortBy,
      sortOrder,
    } = validatedQuery.data;

    // Build where clause with tenant isolation
    const where: {
      tenantId: string;
      status?: DriverStatus;
      employmentType?: EmploymentType;
      isActive?: boolean;
      OR?: Array<{
        firstName?: { contains: string; mode: "insensitive" };
        lastName?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
        phone?: { contains: string; mode: "insensitive" };
        licenseNumber?: { contains: string; mode: "insensitive" };
      }>;
      AND?: Array<{
        OR: Array<{
          licenseExpiry?: { lte: Date };
          adrExpiry?: { lte: Date };
          medicalExpiry?: { lte: Date };
        }>;
      }>;
    } = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { licenseNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter for drivers with documents expiring within 30 days
    if (hasExpiringDocuments) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      where.AND = [
        {
          OR: [
            { licenseExpiry: { lte: thirtyDaysFromNow } },
            { adrExpiry: { lte: thirtyDaysFromNow } },
            { medicalExpiry: { lte: thirtyDaysFromNow } },
          ],
        },
      ];
    }

    // Execute queries in parallel
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          pesel: true,
          dateOfBirth: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          postalCode: true,
          employmentType: true,
          employmentDate: true,
          terminationDate: true,
          currentVehicleId: true,
          licenseNumber: true,
          licenseExpiry: true,
          licenseCategories: true,
          adrNumber: true,
          adrExpiry: true,
          adrClasses: true,
          medicalExpiry: true,
          status: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.driver.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania kierowcow" },
      { status: 500 }
    );
  }
}

// POST /api/drivers - Create a new driver
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

    // Check user role
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do tworzenia kierowcow" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = driverCreateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Check for duplicate PESEL within tenant
    if (validatedData.data.pesel) {
      const existingDriver = await prisma.driver.findFirst({
        where: {
          tenantId,
          pesel: validatedData.data.pesel,
        },
      });

      if (existingDriver) {
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

    // Create driver
    const driver = await prisma.driver.create({
      data: {
        tenantId,
        ...validatedData.data,
      },
    });

    // Log audit
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "Driver",
      entityId: driver.id,
      metadata: { name: `${driver.firstName} ${driver.lastName}` },
      request,
    });

    return NextResponse.json({ data: driver }, { status: 201 });
  } catch (error) {
    console.error("Error creating driver:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia kierowcy" },
      { status: 500 }
    );
  }
}
