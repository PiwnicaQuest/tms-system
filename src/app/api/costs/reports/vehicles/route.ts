import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/costs/reports/vehicles - Get vehicle monthly reports with profitability
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const vehicleId = searchParams.get("vehicleId");

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (vehicleId) where.vehicleId = vehicleId;

    // Aggregate daily records by vehicle
    const revenueAggregations = await prisma.dailyWorkRecord.groupBy({
      by: ["vehicleId"],
      where,
      _sum: {
        allocatedAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get vehicle details
    const vehicleIds = revenueAggregations.map((a) => a.vehicleId);
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, registrationNumber: true, brand: true, model: true },
    });

    // Get costs for vehicles in the period
    const costs = await prisma.cost.groupBy({
      by: ["vehicleId", "category"],
      where: {
        tenantId: session.user.tenantId,
        vehicleId: { in: vehicleIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Count distinct drivers per vehicle
    const driverCounts = await prisma.dailyWorkRecord.findMany({
      where,
      select: {
        vehicleId: true,
        driverId: true,
      },
      distinct: ["vehicleId", "driverId"],
    });

    const driverCountMap = new Map<string, number>();
    driverCounts.forEach((d) => {
      driverCountMap.set(d.vehicleId, (driverCountMap.get(d.vehicleId) || 0) + 1);
    });

    // Build cost map per vehicle
    const costMap = new Map<string, { fuel: number; service: number; toll: number; insurance: number; other: number }>();
    costs.forEach((c) => {
      if (!c.vehicleId) return;
      if (!costMap.has(c.vehicleId)) {
        costMap.set(c.vehicleId, { fuel: 0, service: 0, toll: 0, insurance: 0, other: 0 });
      }
      const vehicleCosts = costMap.get(c.vehicleId)!;
      const amount = c._sum.amount || 0;
      switch (c.category) {
        case "FUEL":
          vehicleCosts.fuel += amount;
          break;
        case "SERVICE":
          vehicleCosts.service += amount;
          break;
        case "TOLL":
          vehicleCosts.toll += amount;
          break;
        case "INSURANCE":
          vehicleCosts.insurance += amount;
          break;
        default:
          vehicleCosts.other += amount;
      }
    });

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    const reports = revenueAggregations.map((agg) => {
      const vehicle = vehicleMap.get(agg.vehicleId);
      const totalRevenue = agg._sum.allocatedAmount || 0;
      const operatingDays = agg._count.id;
      const vehicleCosts = costMap.get(agg.vehicleId) || { fuel: 0, service: 0, toll: 0, insurance: 0, other: 0 };
      const totalCost = vehicleCosts.fuel + vehicleCosts.service + vehicleCosts.toll + vehicleCosts.insurance + vehicleCosts.other;
      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        vehicleId: agg.vehicleId,
        registrationNumber: vehicle?.registrationNumber || "Unknown",
        brand: vehicle?.brand,
        model: vehicle?.model,
        year,
        month,
        operatingDays,
        totalRevenue,
        fuelCost: vehicleCosts.fuel,
        serviceCost: vehicleCosts.service,
        tollCost: vehicleCosts.toll,
        insuranceCost: vehicleCosts.insurance,
        otherCost: vehicleCosts.other,
        totalCost,
        profit,
        profitMargin,
        driversCount: driverCountMap.get(agg.vehicleId) || 0,
      };
    });

    // Sort by profit descending
    reports.sort((a, b) => b.profit - a.profit);

    return NextResponse.json({
      data: reports,
      summary: {
        year,
        month,
        totalVehicles: reports.length,
        totalRevenue: reports.reduce((sum, r) => sum + r.totalRevenue, 0),
        totalCost: reports.reduce((sum, r) => sum + r.totalCost, 0),
        totalProfit: reports.reduce((sum, r) => sum + r.profit, 0),
        avgProfitMargin: reports.length > 0
          ? reports.reduce((sum, r) => sum + r.profitMargin, 0) / reports.length
          : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
