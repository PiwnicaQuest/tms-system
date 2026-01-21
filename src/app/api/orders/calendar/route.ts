import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { OrderStatus, Prisma } from "@prisma/client";

// Status colors for calendar events
const statusColors: Record<OrderStatus, string> = {
  NEW: "#3b82f6", // blue-500
  PLANNED: "#64748b", // slate-500
  ASSIGNED: "#eab308", // yellow-500
  CONFIRMED: "#06b6d4", // cyan-500
  ACCEPTED: "#14b8a6", // teal-500
  LOADING: "#f59e0b", // amber-500
  IN_TRANSIT: "#22c55e", // green-500
  UNLOADING: "#a855f7", // purple-500
  DELIVERED: "#10b981", // emerald-500
  COMPLETED: "#6b7280", // gray-500
  CANCELLED: "#ef4444", // red-500
  PROBLEM: "#f97316", // orange-500
};

// Status labels in Polish
const statusLabels: Record<OrderStatus, string> = {
  NEW: "Nowe",
  PLANNED: "Zaplanowane",
  ASSIGNED: "Przypisane",
  CONFIRMED: "Potwierdzone",
  ACCEPTED: "Zaakceptowane",
  LOADING: "Zaladunek",
  IN_TRANSIT: "W trasie",
  UNLOADING: "Rozladunek",
  DELIVERED: "Dostarczone",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
  PROBLEM: "Problem",
};

// GET /api/orders/calendar - Get orders for calendar view
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
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const status = searchParams.get("status") as OrderStatus | null;
    const driverId = searchParams.get("driverId");
    const vehicleId = searchParams.get("vehicleId");

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      tenantId,
    };

    // Date range filter - filter by loadingDate or unloadingDate falling within range
    if (start || end) {
      const dateFilters: Prisma.OrderWhereInput[] = [];

      if (start && end) {
        // Orders where loading date OR unloading date falls within the range
        dateFilters.push({
          OR: [
            {
              loadingDate: {
                gte: new Date(start),
                lte: new Date(end),
              },
            },
            {
              unloadingDate: {
                gte: new Date(start),
                lte: new Date(end),
              },
            },
            {
              // Orders that span the entire range
              AND: [
                { loadingDate: { lte: new Date(start) } },
                { unloadingDate: { gte: new Date(end) } },
              ],
            },
          ],
        });
      } else if (start) {
        dateFilters.push({
          OR: [
            { loadingDate: { gte: new Date(start) } },
            { unloadingDate: { gte: new Date(start) } },
          ],
        });
      } else if (end) {
        dateFilters.push({
          OR: [
            { loadingDate: { lte: new Date(end) } },
            { unloadingDate: { lte: new Date(end) } },
          ],
        });
      }

      if (dateFilters.length > 0) {
        where.AND = dateFilters;
      }
    }

    if (status) {
      where.status = status;
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
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
      orderBy: {
        loadingDate: "asc",
      },
    });

    // Transform orders to FullCalendar event format
    const events = orders.map((order) => {
      // Build route string
      const originLocation = order.originCity || order.origin;
      const destinationLocation = order.destinationCity || order.destination;
      const route = `${originLocation} - ${destinationLocation}`;

      // Build title with order number and route
      const title = `${order.orderNumber}: ${route}`;

      // Get driver name
      const driverName = order.driver
        ? `${order.driver.firstName} ${order.driver.lastName}`
        : null;

      // Get vehicle registration
      const vehicleReg = order.vehicle?.registrationNumber || null;

      return {
        id: order.id,
        title,
        start: order.loadingDate.toISOString(),
        end: order.unloadingDate.toISOString(),
        allDay: true,
        color: statusColors[order.status],
        borderColor: statusColors[order.status],
        textColor: "#ffffff",
        extendedProps: {
          orderNumber: order.orderNumber,
          externalNumber: order.externalNumber,
          status: order.status,
          statusLabel: statusLabels[order.status],
          type: order.type,
          origin: order.origin,
          originCity: order.originCity,
          originCountry: order.originCountry,
          destination: order.destination,
          destinationCity: order.destinationCity,
          destinationCountry: order.destinationCountry,
          route,
          loadingDate: order.loadingDate.toISOString(),
          loadingTimeFrom: order.loadingTimeFrom,
          loadingTimeTo: order.loadingTimeTo,
          unloadingDate: order.unloadingDate.toISOString(),
          unloadingTimeFrom: order.unloadingTimeFrom,
          unloadingTimeTo: order.unloadingTimeTo,
          driverId: order.driverId,
          driverName,
          vehicleId: order.vehicleId,
          vehicleReg,
          trailerId: order.trailerId,
          trailerReg: order.trailer?.registrationNumber || null,
          contractorId: order.contractorId,
          contractorName: order.contractor?.shortName || order.contractor?.name || null,
          priceNet: order.priceNet,
          currency: order.currency,
          cargoDescription: order.cargoDescription,
          distanceKm: order.distanceKm,
        },
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania wydarzen kalendarza" },
      { status: 500 }
    );
  }
}
