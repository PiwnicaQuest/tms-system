import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";

// GET /api/dashboard/stats - Get dashboard statistics
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

    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Fetch all stats in parallel
    const [
      // Vehicles
      totalVehicles,
      activeVehicles,
      // Drivers
      totalDrivers,
      activeDrivers,
      driversOnLeave,
      // Orders today
      ordersToday,
      ordersInTransit,
      ordersPlanned,
      // Orders this month
      ordersThisMonth,
      ordersLastMonth,
      // Revenue this month (from completed orders)
      revenueThisMonth,
      revenueLastMonth,
      // Costs this month
      costsThisMonth,
      costsLastMonth,
      // Recent orders
      recentOrders,
      // Expiring documents (next 30 days)
      expiringDocuments,
      // Unpaid invoices
      unpaidInvoices,
      overdueInvoices,
    ] = await Promise.all([
      // Vehicles
      prisma.vehicle.count({
        where: { tenantId, isActive: true },
      }),
      prisma.vehicle.count({
        where: { tenantId, isActive: true, status: "ACTIVE" },
      }),
      // Drivers
      prisma.driver.count({
        where: { tenantId, isActive: true },
      }),
      prisma.driver.count({
        where: { tenantId, isActive: true, status: "ACTIVE" },
      }),
      prisma.driver.count({
        where: { tenantId, isActive: true, status: "ON_LEAVE" },
      }),
      // Orders today
      prisma.order.count({
        where: {
          tenantId,
          loadingDate: { gte: today, lte: todayEnd },
        },
      }),
      prisma.order.count({
        where: { tenantId, status: "IN_TRANSIT" },
      }),
      prisma.order.count({
        where: { tenantId, status: "PLANNED" },
      }),
      // Orders this month
      prisma.order.count({
        where: {
          tenantId,
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      prisma.order.count({
        where: {
          tenantId,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      // Revenue this month
      prisma.order.aggregate({
        where: {
          tenantId,
          status: "COMPLETED",
          loadingDate: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { priceNet: true },
      }),
      prisma.order.aggregate({
        where: {
          tenantId,
          status: "COMPLETED",
          loadingDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { priceNet: true },
      }),
      // Costs this month
      prisma.cost.aggregate({
        where: {
          tenantId,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.cost.aggregate({
        where: {
          tenantId,
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),
      // Recent orders
      prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          driver: {
            select: { firstName: true, lastName: true },
          },
          vehicle: {
            select: { registrationNumber: true },
          },
        },
      }),
      // Expiring documents (next 30 days)
      prisma.document.findMany({
        where: {
          tenantId,
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { expiryDate: "asc" },
        take: 5,
        include: {
          driver: { select: { firstName: true, lastName: true } },
          vehicle: { select: { registrationNumber: true } },
        },
      }),
      // Unpaid invoices
      prisma.invoice.count({
        where: {
          tenantId,
          isPaid: false,
          status: { in: ["ISSUED", "SENT"] },
        },
      }),
      prisma.invoice.count({
        where: {
          tenantId,
          status: "OVERDUE",
        },
      }),
    ]);

    // Calculate trends
    const currentRevenue = revenueThisMonth._sum.priceNet || 0;
    const lastRevenue = revenueLastMonth._sum.priceNet || 0;
    const revenueTrend = lastRevenue > 0 
      ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 
      : 0;

    const currentCosts = costsThisMonth._sum.amount || 0;
    const lastCosts = costsLastMonth._sum.amount || 0;
    const costsTrend = lastCosts > 0 
      ? ((currentCosts - lastCosts) / lastCosts) * 100 
      : 0;

    const ordersTrend = ordersLastMonth > 0 
      ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100 
      : 0;

    // Calculate profit
    const profit = currentRevenue - currentCosts;
    const lastProfit = lastRevenue - lastCosts;
    const profitTrend = lastProfit > 0 
      ? ((profit - lastProfit) / lastProfit) * 100 
      : 0;

    // Generate alerts
    const alerts: Array<{ type: "error" | "warning" | "info"; message: string }> = [];

    if (overdueInvoices > 0) {
      alerts.push({
        type: "error",
        message: `${overdueInvoices} ${overdueInvoices === 1 ? "faktura przeterminowana" : "faktury przeterminowane"}!`,
      });
    }

    expiringDocuments.forEach((doc) => {
      const daysUntil = Math.ceil(
        (new Date(doc.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const subject = doc.driver 
        ? `${doc.driver.firstName} ${doc.driver.lastName}`
        : doc.vehicle?.registrationNumber || "Nieznany";
      
      alerts.push({
        type: daysUntil <= 7 ? "error" : "warning",
        message: `${doc.name} (${subject}) wygasa za ${daysUntil} dni`,
      });
    });

    if (ordersPlanned > 0) {
      alerts.push({
        type: "info",
        message: `${ordersPlanned} ${ordersPlanned === 1 ? "zlecenie oczekuje" : "zlecenia oczekują"} na przypisanie`,
      });
    }

    return NextResponse.json({
      kpis: {
        vehicles: {
          total: totalVehicles,
          active: activeVehicles,
        },
        drivers: {
          total: totalDrivers,
          active: activeDrivers,
          onLeave: driversOnLeave,
        },
        ordersToday: {
          total: ordersToday,
          inTransit: ordersInTransit,
          planned: ordersPlanned,
        },
        revenue: {
          current: currentRevenue,
          previous: lastRevenue,
          trend: Math.round(revenueTrend * 10) / 10,
        },
        costs: {
          current: currentCosts,
          previous: lastCosts,
          trend: Math.round(costsTrend * 10) / 10,
        },
        profit: {
          current: profit,
          previous: lastProfit,
          trend: Math.round(profitTrend * 10) / 10,
        },
        orders: {
          thisMonth: ordersThisMonth,
          lastMonth: ordersLastMonth,
          trend: Math.round(ordersTrend * 10) / 10,
        },
        invoices: {
          unpaid: unpaidInvoices,
          overdue: overdueInvoices,
        },
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        route: `${order.originCity || order.origin} → ${order.destinationCity || order.destination}`,
        driver: order.driver 
          ? `${order.driver.firstName} ${order.driver.lastName}` 
          : null,
        vehicle: order.vehicle?.registrationNumber || null,
        status: order.status,
        amount: order.priceNet,
        currency: order.currency,
      })),
      alerts: alerts.slice(0, 5),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania statystyk" },
      { status: 500 }
    );
  }
}
