import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { TrailerType, VehicleStatus } from "@prisma/client";

// Validation schemas
const trailerUpdateSchema = z.object({
  registrationNumber: z.string().min(1).optional(),
  type: z.nativeEnum(TrailerType).optional(),
  brand: z.string().optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  loadCapacity: z.number().positive().optional().nullable(),
  volume: z.number().positive().optional().nullable(),
  axles: z.number().int().positive().optional().nullable(),
  adrClasses: z.string().optional().nullable(),
  status: z.nativeEnum(VehicleStatus).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const idSchema = z.string().min(1, "ID jest wymagane");

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/trailers/[id] - Get single trailer
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
        { error: "Nieprawidlowe ID naczepy" },
        { status: 400 }
      );
    }

    const trailer = await prisma.trailer.findFirst({
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
            cargoDescription: true,
            cargoWeight: true,
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
            documents: true,
          },
        },
      },
    });

    if (!trailer) {
      return NextResponse.json(
        { error: "Naczepa nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Calculate document expiry warnings
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDocuments = trailer.documents
      .filter((doc) => doc.expiryDate && doc.expiryDate <= thirtyDaysFromNow)
      .map((doc) => {
        const daysUntilExpiry = doc.expiryDate
          ? Math.ceil(
              (doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;
        return {
          id: doc.id,
          type: doc.type,
          name: doc.name,
          expiryDate: doc.expiryDate,
          daysUntilExpiry,
          isExpired: daysUntilExpiry < 0,
        };
      });

    return NextResponse.json({
      data: {
        ...trailer,
        expiringDocuments,
      },
    });
  } catch (error) {
    console.error("Error fetching trailer:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania naczepy" },
      { status: 500 }
    );
  }
}

// PUT /api/trailers/[id] - Update trailer
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
        { error: "Brak uprawnien do edycji naczep" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID naczepy" },
        { status: 400 }
      );
    }

    // Check if trailer exists and belongs to tenant
    const existingTrailer = await prisma.trailer.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingTrailer) {
      return NextResponse.json(
        { error: "Naczepa nie zostala znaleziona" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = trailerUpdateSchema.safeParse(body);

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
        existingTrailer.registrationNumber
    ) {
      const duplicateTrailer = await prisma.trailer.findUnique({
        where: {
          tenantId_registrationNumber: {
            tenantId,
            registrationNumber: validatedData.data.registrationNumber,
          },
        },
      });

      if (duplicateTrailer) {
        return NextResponse.json(
          { error: "Naczepa o tym numerze rejestracyjnym juz istnieje" },
          { status: 409 }
        );
      }
    }

    const trailer = await prisma.trailer.update({
      where: { id: validatedId.data },
      data: validatedData.data,
    });

    return NextResponse.json({ data: trailer });
  } catch (error) {
    console.error("Error updating trailer:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji naczepy" },
      { status: 500 }
    );
  }
}

// DELETE /api/trailers/[id] - Delete trailer (soft delete)
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
        { error: "Brak uprawnien do usuwania naczep" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID naczepy" },
        { status: 400 }
      );
    }

    // Check if trailer exists and belongs to tenant
    const existingTrailer = await prisma.trailer.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingTrailer) {
      return NextResponse.json(
        { error: "Naczepa nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Check for related active orders
    const activeOrders = await prisma.order.count({
      where: {
        trailerId: validatedId.data,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        {
          error:
            "Nie mozna usunac naczepy z aktywnymi zleceniami. Najpierw zakoncz lub anuluj powiazane zlecenia.",
        },
        { status: 409 }
      );
    }

    // Soft delete - set isActive to false and status to INACTIVE
    const trailer = await prisma.trailer.update({
      where: { id: validatedId.data },
      data: {
        isActive: false,
        status: VehicleStatus.INACTIVE,
      },
    });

    return NextResponse.json({
      data: trailer,
      message: "Naczepa zostala dezaktywowana",
    });
  } catch (error) {
    console.error("Error deleting trailer:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania naczepy" },
      { status: 500 }
    );
  }
}
