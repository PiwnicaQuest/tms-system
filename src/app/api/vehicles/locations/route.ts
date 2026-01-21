import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
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

    // Get all active vehicles with GPS data
    const vehicles = await prisma.vehicle.findMany({
      where: {
        tenantId,
        isActive: true,
        status: "ACTIVE",
      },
      select: {
        id: true,
        registrationNumber: true,
        type: true,
        brand: true,
        model: true,
        lastLatitude: true,
        lastLongitude: true,
        lastGpsUpdate: true,
        currentDriverId: true,
      },
    });

    // Get current drivers for vehicles
    const driverIds = vehicles
      .map((v) => v.currentDriverId)
      .filter((id): id is string => id !== null);

    const drivers = await prisma.driver.findMany({
      where: {
        id: { in: driverIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    const driversMap = new Map(drivers.map((d) => [d.id, d]));

    // Get current orders for vehicles
    const vehicleIds = vehicles.map((v) => v.id);
    const activeOrders = await prisma.order.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        status: { in: ["ASSIGNED", "CONFIRMED", "LOADING", "IN_TRANSIT", "UNLOADING"] },
      },
      select: {
        id: true,
        orderNumber: true,
        vehicleId: true,
        origin: true,
        destination: true,
        status: true,
      },
    });

    const ordersMap = new Map(activeOrders.map((o) => [o.vehicleId!, o]));

    // Format response
    const locations = vehicles.map((vehicle) => {
      const driver = vehicle.currentDriverId
        ? driversMap.get(vehicle.currentDriverId)
        : null;
      const order = ordersMap.get(vehicle.id);

      return {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        type: vehicle.type,
        brand: vehicle.brand,
        model: vehicle.model,
        latitude: vehicle.lastLatitude,
        longitude: vehicle.lastLongitude,
        lastUpdate: vehicle.lastGpsUpdate,
        hasGps: vehicle.lastLatitude !== null && vehicle.lastLongitude !== null,
        driver: driver
          ? {
              id: driver.id,
              name: `${driver.firstName} ${driver.lastName}`,
              phone: driver.phone,
            }
          : null,
        currentOrder: order
          ? {
              id: order.id,
              orderNumber: order.orderNumber,
              route: `${order.origin} → ${order.destination}`,
              status: order.status,
            }
          : null,
      };
    });

    // Separate vehicles with and without GPS
    const withGps = locations.filter((v) => v.hasGps);
    const withoutGps = locations.filter((v) => !v.hasGps);

    return NextResponse.json({
      vehicles: withGps,
      vehiclesWithoutGps: withoutGps,
      totalVehicles: locations.length,
      vehiclesWithGps: withGps.length,
    });
  } catch (error) {
    console.error("Error fetching vehicle locations:", error);
    return NextResponse.json(
      { error: "Błąd pobierania lokalizacji" },
      { status: 500 }
    );
  }
}

// Update vehicle location (for GPS devices/mobile app)
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
    const { vehicleId, latitude, longitude } = body;

    if (!vehicleId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Brak wymaganych danych (vehicleId, latitude, longitude)" },
        { status: 400 }
      );
    }

    // Verify vehicle belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Pojazd nie znaleziony" },
        { status: 404 }
      );
    }

    // Update location
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastGpsUpdate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      vehicle: {
        id: updated.id,
        registrationNumber: updated.registrationNumber,
        latitude: updated.lastLatitude,
        longitude: updated.lastLongitude,
        lastUpdate: updated.lastGpsUpdate,
      },
    });
  } catch (error) {
    console.error("Error updating vehicle location:", error);
    return NextResponse.json(
      { error: "Błąd aktualizacji lokalizacji" },
      { status: 500 }
    );
  }
}
