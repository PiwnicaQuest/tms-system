import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/costs/reports/drivers - Get driver monthly reports
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const driverId = searchParams.get("driverId");

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (driverId) where.driverId = driverId;

    // Aggregate daily records by driver
    const aggregations = await prisma.dailyWorkRecord.groupBy({
      by: ["driverId"],
      where,
      _sum: {
        allocatedAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get driver details
    const driverIds = aggregations.map((a) => a.driverId);
    const drivers = await prisma.driver.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    // Count distinct orders per driver
    const orderCounts = await prisma.dailyWorkRecord.groupBy({
      by: ["driverId"],
      where: {
        ...where,
        orderId: { not: null },
      },
      _count: {
        orderId: true,
      },
    });

    const orderCountMap = new Map(orderCounts.map((o) => [o.driverId, o._count.orderId]));
    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const reports = aggregations.map((agg) => {
      const driver = driverMap.get(agg.driverId);
      const totalRevenue = agg._sum.allocatedAmount || 0;
      const workDays = agg._count.id;
      const totalOrders = orderCountMap.get(agg.driverId) || 0;

      return {
        driverId: agg.driverId,
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
        year,
        month,
        workDays,
        totalRevenue,
        totalOrders,
        avgDailyRevenue: workDays > 0 ? totalRevenue / workDays : 0,
      };
    });

    // Sort by total revenue descending
    reports.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      data: reports,
      summary: {
        year,
        month,
        totalDrivers: reports.length,
        totalRevenue: reports.reduce((sum, r) => sum + r.totalRevenue, 0),
        totalWorkDays: reports.reduce((sum, r) => sum + r.workDays, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching driver reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
