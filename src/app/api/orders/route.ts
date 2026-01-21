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

    // Extract waypoints from body
    const { waypoints, ...orderData } = body;

    // Validate required fields
    const requiredFields = [
      "orderNumber",
      "origin",
      "destination",
      "loadingDate",
      "unloadingDate",
    ];

    for (const field of requiredFields) {
      if (!orderData[field]) {
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
          orderNumber: orderData.orderNumber,
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
    const loadingDate = new Date(orderData.loadingDate);
    const unloadingDate = new Date(orderData.unloadingDate);

    // Create order with initial assignment and waypoints in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          tenantId,
          orderNumber: orderData.orderNumber,
          externalNumber: orderData.externalNumber || null,
          type: (orderData.type as OrderType) || OrderType.OWN,
          status: (orderData.status as OrderStatus) || OrderStatus.PLANNED,
          contractorId: orderData.contractorId || null,
          subcontractorId: orderData.subcontractorId || null,
          vehicleId: orderData.vehicleId || null,
          trailerId: orderData.trailerId || null,
          driverId: orderData.driverId || null,
          origin: orderData.origin,
          originCity: orderData.originCity || null,
          originPostalCode: orderData.originPostalCode || null,
          originCountry: orderData.originCountry || "PL",
          destination: orderData.destination,
          destinationCity: orderData.destinationCity || null,
          destinationPostalCode: orderData.destinationPostalCode || null,
          destinationCountry: orderData.destinationCountry || "PL",
          distanceKm: orderData.distanceKm ? parseFloat(orderData.distanceKm) : null,
          loadingDate,
          loadingTimeFrom: orderData.loadingTimeFrom || null,
          loadingTimeTo: orderData.loadingTimeTo || null,
          unloadingDate,
          unloadingTimeFrom: orderData.unloadingTimeFrom || null,
          unloadingTimeTo: orderData.unloadingTimeTo || null,
          cargoDescription: orderData.cargoDescription || null,
          cargoWeight: orderData.cargoWeight ? parseFloat(orderData.cargoWeight) : null,
          cargoVolume: orderData.cargoVolume ? parseFloat(orderData.cargoVolume) : null,
          cargoPallets: orderData.cargoPallets ? parseInt(orderData.cargoPallets, 10) : null,
          cargoValue: orderData.cargoValue ? parseFloat(orderData.cargoValue) : null,
          requiresAdr: orderData.requiresAdr || false,
          priceNet: orderData.priceNet ? parseFloat(orderData.priceNet) : null,
          currency: orderData.currency || "PLN",
          costNet: orderData.costNet ? parseFloat(orderData.costNet) : null,
          flatRateKm: orderData.flatRateKm ? parseFloat(orderData.flatRateKm) : null,
          flatRateOverage: orderData.flatRateOverage
            ? parseFloat(orderData.flatRateOverage)
            : null,
          kmLimit: orderData.kmLimit ? parseFloat(orderData.kmLimit) : null,
          kmOverageRate: orderData.kmOverageRate
            ? parseFloat(orderData.kmOverageRate)
            : null,
          notes: orderData.notes || null,
          internalNotes: orderData.internalNotes || null,
          createdById: orderData.createdById || null,
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

      // Create waypoints if provided
      if (waypoints && Array.isArray(waypoints) && waypoints.length > 0) {
        await tx.waypoint.createMany({
          data: waypoints.map((wp: any, index: number) => ({
            orderId: newOrder.id,
            sequence: wp.sequence || index + 1,
            type: "STOP",
            address: wp.address,
            city: wp.city || null,
            country: wp.country || "PL",
            scheduledDate: wp.scheduledDate ? new Date(wp.scheduledDate) : null,
            scheduledTime: wp.scheduledTime || null,
            notes: wp.notes || null,
          })),
        });
      }

      // Handle assignments - either from assignments array or single driver/vehicle
      const priceNet = orderData.priceNet ? parseFloat(orderData.priceNet) : null;

      if (orderData.assignments && Array.isArray(orderData.assignments) && orderData.assignments.length > 0) {
        // Create multiple assignments from the assignments array
        for (let i = 0; i < orderData.assignments.length; i++) {
          const assignment = orderData.assignments[i];
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
      } else if (orderData.driverId) {
        // Fallback to single assignment for backwards compatibility
        await tx.orderAssignment.create({
          data: {
            tenantId,
            orderId: newOrder.id,
            driverId: orderData.driverId,
            vehicleId: orderData.vehicleId || null,
            trailerId: orderData.trailerId || null,
            startDate: loadingDate,
            revenueShare: 1.0,
            allocatedAmount: priceNet,
            distanceKm: orderData.distanceKm ? parseFloat(orderData.distanceKm) : null,
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
