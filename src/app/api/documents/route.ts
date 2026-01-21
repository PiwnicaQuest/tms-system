import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { DocumentType } from "@prisma/client";

// Validation schemas
const documentCreateSchema = z.object({
  type: z.nativeEnum(DocumentType),
  name: z.string().min(1, "Nazwa dokumentu jest wymagana"),
  description: z.string().optional().nullable(),
  fileUrl: z.string().url("Nieprawidlowy URL pliku"),
  fileSize: z.number().int().positive().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  trailerId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
});

const documentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  entityType: z.enum(["vehicle", "trailer", "driver", "order", "company"]).optional(),
  vehicleId: z.string().optional(),
  trailerId: z.string().optional(),
  driverId: z.string().optional(),
  orderId: z.string().optional(),
  expiringSoon: z.string().transform((val) => val === "true").optional(),
  expired: z.string().transform((val) => val === "true").optional(),
  sortBy: z.enum(["name", "type", "expiryDate", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/documents - List documents with pagination and filters
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

    const validatedQuery = documentQuerySchema.safeParse(queryParams);

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
      type,
      entityType,
      vehicleId,
      trailerId,
      driverId,
      orderId,
      expiringSoon,
      expired,
      sortBy,
      sortOrder,
    } = validatedQuery.data;

    // Build where clause with tenant isolation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenantId,
    };

    // Filter by document type
    if (type) {
      where.type = type;
    }

    // Filter by entity type
    if (entityType) {
      switch (entityType) {
        case "vehicle":
          where.vehicleId = { not: null };
          where.trailerId = null;
          where.driverId = null;
          where.orderId = null;
          break;
        case "trailer":
          where.trailerId = { not: null };
          where.vehicleId = null;
          where.driverId = null;
          where.orderId = null;
          break;
        case "driver":
          where.driverId = { not: null };
          where.vehicleId = null;
          where.trailerId = null;
          where.orderId = null;
          break;
        case "order":
          where.orderId = { not: null };
          where.vehicleId = null;
          where.trailerId = null;
          where.driverId = null;
          break;
        case "company":
          where.vehicleId = null;
          where.trailerId = null;
          where.driverId = null;
          where.orderId = null;
          break;
      }
    }

    // Filter by specific entity IDs
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (trailerId) {
      where.trailerId = trailerId;
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    // Filter for expiring documents (within 30 days)
    if (expiringSoon) {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      where.expiryDate = {
        not: null,
        gte: today,
        lte: thirtyDaysFromNow,
      };
    }

    // Filter for expired documents
    if (expired) {
      const today = new Date();
      where.expiryDate = {
        not: null,
        lt: today,
      };
    }

    // Search by name or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute queries in parallel
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
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
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: documents,
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
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania dokumentow" },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new document
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
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "DISPATCHER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do dodawania dokumentow" },
        { status: 403 }
      );
    }

    // Handle both JSON and FormData
    const contentType = request.headers.get("content-type") || "";
    let documentData;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData upload
      const formData = await request.formData();

      documentData = {
        type: formData.get("type") as string,
        name: formData.get("name") as string,
        description: formData.get("description") as string || null,
        fileUrl: formData.get("fileUrl") as string,
        fileSize: formData.get("fileSize") ? parseInt(formData.get("fileSize") as string) : null,
        mimeType: formData.get("mimeType") as string || null,
        expiryDate: formData.get("expiryDate") as string || null,
        vehicleId: formData.get("vehicleId") as string || null,
        trailerId: formData.get("trailerId") as string || null,
        driverId: formData.get("driverId") as string || null,
        orderId: formData.get("orderId") as string || null,
      };
    } else {
      documentData = await request.json();
    }

    const validatedData = documentCreateSchema.safeParse(documentData);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Validate referenced entities belong to tenant
    if (validatedData.data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: validatedData.data.vehicleId,
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

    if (validatedData.data.trailerId) {
      const trailer = await prisma.trailer.findFirst({
        where: {
          id: validatedData.data.trailerId,
          tenantId,
        },
      });

      if (!trailer) {
        return NextResponse.json(
          { error: "Wybrana naczepa nie istnieje" },
          { status: 400 }
        );
      }
    }

    if (validatedData.data.driverId) {
      const driver = await prisma.driver.findFirst({
        where: {
          id: validatedData.data.driverId,
          tenantId,
        },
      });

      if (!driver) {
        return NextResponse.json(
          { error: "Wybrany kierowca nie istnieje" },
          { status: 400 }
        );
      }
    }

    if (validatedData.data.orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: validatedData.data.orderId,
          tenantId,
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Wybrane zlecenie nie istnieje" },
          { status: 400 }
        );
      }
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        tenantId,
        ...validatedData.data,
      },
      include: {
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
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia dokumentu" },
      { status: 500 }
    );
  }
}
