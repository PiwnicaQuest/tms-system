import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { TrailerType, VehicleStatus } from "@prisma/client";

// Validation schemas
const trailerCreateSchema = z.object({
  registrationNumber: z.string().min(1, "Numer rejestracyjny jest wymagany"),
  type: z.nativeEnum(TrailerType),
  brand: z.string().optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  loadCapacity: z.number().positive().optional().nullable(),
  volume: z.number().positive().optional().nullable(),
  axles: z.number().int().positive().optional().nullable(),
  adrClasses: z.string().optional().nullable(),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.ACTIVE),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const trailerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().optional(),
  type: z.nativeEnum(TrailerType).optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  hasAdr: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  sortBy: z
    .enum([
      "registrationNumber",
      "brand",
      "type",
      "status",
      "loadCapacity",
      "createdAt",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/trailers - List trailers with pagination and filters
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

    const validatedQuery = trailerQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe parametry zapytania",
          details: validatedQuery.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { page, limit, search, type, status, isActive, hasAdr, sortBy, sortOrder } =
      validatedQuery.data;

    // Build where clause with tenant isolation
    const where: {
      tenantId: string;
      type?: TrailerType;
      status?: VehicleStatus;
      isActive?: boolean;
      adrClasses?: { not: null } | null;
      OR?: Array<{
        registrationNumber?: { contains: string; mode: "insensitive" };
        brand?: { contains: string; mode: "insensitive" };
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

    if (hasAdr !== undefined) {
      where.adrClasses = hasAdr ? { not: null } : null;
    }

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute queries in parallel
    const [trailers, total] = await Promise.all([
      prisma.trailer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          registrationNumber: true,
          type: true,
          brand: true,
          year: true,
          loadCapacity: true,
          volume: true,
          axles: true,
          adrClasses: true,
          status: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.trailer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: trailers,
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
    console.error("Error fetching trailers:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania naczep" },
      { status: 500 }
    );
  }
}

// POST /api/trailers - Create a new trailer
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
        { error: "Brak uprawnien do tworzenia naczep" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = trailerCreateSchema.safeParse(body);

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
    const existingTrailer = await prisma.trailer.findUnique({
      where: {
        tenantId_registrationNumber: {
          tenantId,
          registrationNumber: validatedData.data.registrationNumber,
        },
      },
    });

    if (existingTrailer) {
      return NextResponse.json(
        { error: "Naczepa o tym numerze rejestracyjnym juz istnieje" },
        { status: 409 }
      );
    }

    // Create trailer
    const trailer = await prisma.trailer.create({
      data: {
        tenantId,
        ...validatedData.data,
      },
    });

    return NextResponse.json({ data: trailer }, { status: 201 });
  } catch (error) {
    console.error("Error creating trailer:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia naczepy" },
      { status: 500 }
    );
  }
}
