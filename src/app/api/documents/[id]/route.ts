import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { DocumentType } from "@prisma/client";

// Validation schemas
const documentUpdateSchema = z.object({
  type: z.nativeEnum(DocumentType).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().int().positive().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  reminderSent: z.boolean().optional(),
  vehicleId: z.string().optional().nullable(),
  trailerId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
});

const idSchema = z.string().min(1, "ID jest wymagane");

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/documents/[id] - Get single document
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
        { error: "Nieprawidlowe ID dokumentu" },
        { status: 400 }
      );
    }

    const document = await prisma.document.findFirst({
      where: {
        id: validatedId.data,
        tenantId, // Tenant isolation
      },
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            brand: true,
            model: true,
            type: true,
          },
        },
        trailer: {
          select: {
            id: true,
            registrationNumber: true,
            type: true,
            brand: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            origin: true,
            destination: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nie zostal znaleziony" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania dokumentu" },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update document
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
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "DISPATCHER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do edycji dokumentow" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID dokumentu" },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to tenant
    const existingDocument = await prisma.document.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: "Dokument nie zostal znaleziony" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = documentUpdateSchema.safeParse(body);

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
    if (validatedData.data.vehicleId !== undefined && validatedData.data.vehicleId !== null) {
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

    if (validatedData.data.trailerId !== undefined && validatedData.data.trailerId !== null) {
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

    if (validatedData.data.driverId !== undefined && validatedData.data.driverId !== null) {
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

    if (validatedData.data.orderId !== undefined && validatedData.data.orderId !== null) {
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

    const document = await prisma.document.update({
      where: { id: validatedId.data },
      data: validatedData.data,
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

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji dokumentu" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document
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
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do usuwania dokumentow" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const validatedId = idSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe ID dokumentu" },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to tenant
    const existingDocument = await prisma.document.findFirst({
      where: {
        id: validatedId.data,
        tenantId,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: "Dokument nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Delete document
    await prisma.document.delete({
      where: { id: validatedId.data },
    });

    return NextResponse.json({
      message: "Dokument zostal usuniety",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania dokumentu" },
      { status: 500 }
    );
  }
}
