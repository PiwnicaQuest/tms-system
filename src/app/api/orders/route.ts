import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit-service";
import { triggerWebhook } from "@/lib/webhooks";

// GET /api/orders - List orders with filters
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

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get("status") as OrderStatus | null;
    const driverId = searchParams.get("driverId");
    const vehicleId = searchParams.get("vehicleId");
    const contractorId = searchParams.get("contractorId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const sortBy = searchParams.get("sortBy") || "loadingDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause - always filter by tenantId
    const where: Prisma.OrderWhereInput = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (contractorId) {
      where.contractorId = contractorId;
    }

    if (dateFrom || dateTo) {
      where.loadingDate = {};
      if (dateFrom) {
        where.loadingDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.loadingDate.lte = new Date(dateTo);
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { externalNumber: { contains: search, mode: "insensitive" } },
        { origin: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { originCity: { contains: search, mode: "insensitive" } },
        { destinationCity: { contains: search, mode: "insensitive" } },
        { cargoDescription: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build order by clause
    const orderBy: Prisma.OrderOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute query with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
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
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania zlecen" },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
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

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "orderNumber",
      "origin",
      "destination",
      "loadingDate",
      "unloadingDate",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Pole ${field} jest wymagane` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate order number
    const existingOrder = await prisma.order.findUnique({
      where: {
        tenantId_orderNumber: {
          tenantId,
          orderNumber: body.orderNumber,
        },
      },
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: "Zlecenie o podanym numerze juz istnieje" },
        { status: 409 }
      );
    }

    // Parse dates
    const loadingDate = new Date(body.loadingDate);
    const unloadingDate = new Date(body.unloadingDate);

    // Create order with initial assignment in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          tenantId,
          orderNumber: body.orderNumber,
          externalNumber: body.externalNumber || null,
          type: (body.type as OrderType) || OrderType.OWN,
          status: (body.status as OrderStatus) || OrderStatus.PLANNED,
          contractorId: body.contractorId || null,
          subcontractorId: body.subcontractorId || null,
          vehicleId: body.vehicleId || null,
          trailerId: body.trailerId || null,
          driverId: body.driverId || null,
          origin: body.origin,
          originCity: body.originCity || null,
          originPostalCode: body.originPostalCode || null,
          originCountry: body.originCountry || "PL",
          destination: body.destination,
          destinationCity: body.destinationCity || null,
          destinationPostalCode: body.destinationPostalCode || null,
          destinationCountry: body.destinationCountry || "PL",
          distanceKm: body.distanceKm ? parseFloat(body.distanceKm) : null,
          loadingDate,
          loadingTimeFrom: body.loadingTimeFrom || null,
          loadingTimeTo: body.loadingTimeTo || null,
          unloadingDate,
          unloadingTimeFrom: body.unloadingTimeFrom || null,
          unloadingTimeTo: body.unloadingTimeTo || null,
          cargoDescription: body.cargoDescription || null,
          cargoWeight: body.cargoWeight ? parseFloat(body.cargoWeight) : null,
          cargoVolume: body.cargoVolume ? parseFloat(body.cargoVolume) : null,
          cargoPallets: body.cargoPallets ? parseInt(body.cargoPallets, 10) : null,
          cargoValue: body.cargoValue ? parseFloat(body.cargoValue) : null,
          requiresAdr: body.requiresAdr || false,
          priceNet: body.priceNet ? parseFloat(body.priceNet) : null,
          currency: body.currency || "PLN",
          costNet: body.costNet ? parseFloat(body.costNet) : null,
          flatRateKm: body.flatRateKm ? parseFloat(body.flatRateKm) : null,
          flatRateOverage: body.flatRateOverage
            ? parseFloat(body.flatRateOverage)
            : null,
          kmLimit: body.kmLimit ? parseFloat(body.kmLimit) : null,
          kmOverageRate: body.kmOverageRate
            ? parseFloat(body.kmOverageRate)
            : null,
          notes: body.notes || null,
          internalNotes: body.internalNotes || null,
          createdById: body.createdById || null,
        },
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
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

      // Handle assignments - either from assignments array or single driver/vehicle
      const priceNet = body.priceNet ? parseFloat(body.priceNet) : null;

      if (body.assignments && Array.isArray(body.assignments) && body.assignments.length > 0) {
        // Create multiple assignments from the assignments array
        for (let i = 0; i < body.assignments.length; i++) {
          const assignment = body.assignments[i];
          const allocatedAmount = priceNet && assignment.revenueShare
            ? priceNet * assignment.revenueShare
            : null;

          await tx.orderAssignment.create({
            data: {
              tenantId,
              orderId: newOrder.id,
              driverId: assignment.driverId,
              vehicleId: assignment.vehicleId || null,
              trailerId: assignment.trailerId || null,
              startDate: loadingDate,
              revenueShare: assignment.revenueShare || 1.0,
              allocatedAmount,
              distanceKm: assignment.distanceKm || null,
              reason: "INITIAL",
              isPrimary: i === 0, // First assignment is primary
              isActive: true,
              createdBy: session.user.id,
            },
          });
        }
      } else if (body.driverId) {
        // Fallback to single assignment for backwards compatibility
        await tx.orderAssignment.create({
          data: {
            tenantId,
            orderId: newOrder.id,
            driverId: body.driverId,
            vehicleId: body.vehicleId || null,
            trailerId: body.trailerId || null,
            startDate: loadingDate,
            revenueShare: 1.0,
            allocatedAmount: priceNet,
            distanceKm: body.distanceKm ? parseFloat(body.distanceKm) : null,
            reason: "INITIAL",
            isPrimary: true,
            isActive: true,
            createdBy: session.user.id,
          },
        });
      }

      return newOrder;
    });

    // Log audit
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "Order",
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber },
      request,
    });

    // Trigger webhook for order creation
    triggerWebhook(tenantId, "order.created", {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        origin: order.origin,
        destination: order.destination,
        loadingDate: order.loadingDate,
        unloadingDate: order.unloadingDate,
        priceNet: order.priceNet,
        currency: order.currency,
        contractor: order.contractor,
        driver: order.driver,
        vehicle: order.vehicle,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia zlecenia" },
      { status: 500 }
    );
  }
}
