import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { VehicleType, VehicleStatus, FuelType } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit-service";

// Validation schemas
const vehicleCreateSchema = z.object({
  registrationNumber: z.string().min(1, "Numer rejestracyjny jest wymagany"),
  type: z.nativeEnum(VehicleType),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  vin: z.string().optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.ACTIVE),
  loadCapacity: z.number().positive().optional().nullable(),
  volume: z.number().positive().optional().nullable(),
  euroClass: z.string().optional().nullable(),
  fuelType: z.nativeEnum(FuelType).optional().nullable(),
  currentDriverId: z.string().optional().nullable(),
  currentTrailerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const vehicleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().optional(),
  type: z.nativeEnum(VehicleType).optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  sortBy: z
    .enum([
      "registrationNumber",
      "brand",
      "model",
      "type",
      "status",
      "createdAt",
      "updatedAt",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/vehicles - List vehicles with pagination and filters
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

    const validatedQuery = vehicleQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe parametry zapytania",
          details: validatedQuery.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { page, limit, search, type, status, isActive, sortBy, sortOrder } =
      validatedQuery.data;

    // Build where clause with tenant isolation
    const where: {
      tenantId: string;
      type?: VehicleType;
      status?: VehicleStatus;
      isActive?: boolean;
      OR?: Array<{
        registrationNumber?: { contains: string; mode: "insensitive" };
        brand?: { contains: string; mode: "insensitive" };
        model?: { contains: string; mode: "insensitive" };
        vin?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      tenantId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { vin: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute queries in parallel
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          registrationNumber: true,
          type: true,
          brand: true,
          model: true,
          vin: true,
          year: true,
          status: true,
          loadCapacity: true,
          volume: true,
          euroClass: true,
          fuelType: true,
          currentDriverId: true,
          currentTrailerId: true,
          lastLatitude: true,
          lastLongitude: true,
          lastGpsUpdate: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          photos: {
            select: {
              id: true,
              url: true,
              description: true,
              isPrimary: true,
            },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
            take: 5,
          },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: vehicles,
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
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania pojazdow" },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create a new vehicle
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

    // Check user role - only ADMIN, MANAGER, or higher can create vehicles
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do tworzenia pojazdow" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = vehicleCreateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Check if registration number already exists for this tenant
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        tenantId_registrationNumber: {
          tenantId,
          registrationNumber: validatedData.data.registrationNumber,
        },
      },
    });

    if (existingVehicle) {
      return NextResponse.json(
        { error: "Pojazd o tym numerze rejestracyjnym juz istnieje" },
        { status: 409 }
      );
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
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
      entityType: "Vehicle",
      entityId: vehicle.id,
      metadata: { registrationNumber: vehicle.registrationNumber },
      request,
    });

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia pojazdu" },
      { status: 500 }
    );
  }
}
