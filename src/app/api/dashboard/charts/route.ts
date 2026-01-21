import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { pl } from "date-fns/locale";

// GET /api/dashboard/charts - Get chart data for dashboard
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
    const period = searchParams.get("period") || "6months"; // 6months, 12months, 30days

    const now = new Date();
    let startDate: Date;
    let groupBy: "month" | "day" = "month";

    switch (period) {
      case "30days":
        startDate = subMonths(now, 1);
        groupBy = "day";
        break;
      case "12months":
        startDate = subMonths(now, 12);
        break;
      case "6months":
      default:
        startDate = subMonths(now, 6);
    }

    // Fetch revenue and costs data
    const [orders, costs, ordersByStatus, topDrivers, topVehicles] = await Promise.all([
      // Orders with revenue
      prisma.order.findMany({
        where: {
          tenantId,
          loadingDate: { gte: startDate },
          status: "COMPLETED",
        },
        select: {
          loadingDate: true,
          priceNet: true,
        },
      }),
      // Costs
      prisma.cost.findMany({
        where: {
          tenantId,
          date: { gte: startDate },
        },
        select: {
          date: true,
          amount: true,
          category: true,
        },
      }),
      // Orders by status (current)
      prisma.order.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { id: true },
      }),
      // Top drivers by revenue (this month)
      prisma.order.groupBy({
        by: ["driverId"],
        where: {
          tenantId,
          status: "COMPLETED",
          loadingDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
          driverId: { not: null },
        },
        _sum: { priceNet: true },
        _count: { id: true },
        orderBy: { _sum: { priceNet: "desc" } },
        take: 5,
      }),
      // Top vehicles by revenue (this month)
      prisma.order.groupBy({
        by: ["vehicleId"],
        where: {
          tenantId,
          status: "COMPLETED",
          loadingDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
          vehicleId: { not: null },
        },
        _sum: { priceNet: true },
        _count: { id: true },
        orderBy: { _sum: { priceNet: "desc" } },
        take: 5,
      }),
    ]);

    // Fetch driver and vehicle names
    const driverIds = topDrivers.map((d) => d.driverId).filter(Boolean) as string[];
    const vehicleIds = topVehicles.map((v) => v.vehicleId).filter(Boolean) as string[];

    const [drivers, vehicles] = await Promise.all([
      prisma.driver.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.vehicle.findMany({
        where: { id: { in: vehicleIds } },
        select: { id: true, registrationNumber: true },
      }),
    ]);

    const driversMap = new Map(drivers.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
    const vehiclesMap = new Map(vehicles.map((v) => [v.id, v.registrationNumber]));

    // Group data by period
    let revenueByPeriod: Record<string, number> = {};
    let costsByPeriod: Record<string, number> = {};
    let costsByCategory: Record<string, number> = {};

    if (groupBy === "month") {
      // Generate all months in range
      for (let i = 0; i <= (period === "12months" ? 12 : 6); i++) {
        const date = subMonths(now, i);
        const key = format(date, "yyyy-MM");
        revenueByPeriod[key] = 0;
        costsByPeriod[key] = 0;
      }

      // Aggregate revenue by month
      orders.forEach((order) => {
        const key = format(new Date(order.loadingDate), "yyyy-MM");
        if (revenueByPeriod[key] !== undefined) {
          revenueByPeriod[key] += order.priceNet || 0;
        }
      });

      // Aggregate costs by month
      costs.forEach((cost) => {
        const key = format(new Date(cost.date), "yyyy-MM");
        if (costsByPeriod[key] !== undefined) {
          costsByPeriod[key] += cost.amount || 0;
        }
        // Also aggregate by category
        costsByCategory[cost.category] = (costsByCategory[cost.category] || 0) + cost.amount;
      });
    } else {
      // Group by day for 30 days view
      const days = eachDayOfInterval({ start: startDate, end: now });
      days.forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        revenueByPeriod[key] = 0;
        costsByPeriod[key] = 0;
      });

      orders.forEach((order) => {
        const key = format(new Date(order.loadingDate), "yyyy-MM-dd");
        if (revenueByPeriod[key] !== undefined) {
          revenueByPeriod[key] += order.priceNet || 0;
        }
      });

      costs.forEach((cost) => {
        const key = format(new Date(cost.date), "yyyy-MM-dd");
        if (costsByPeriod[key] !== undefined) {
          costsByPeriod[key] += cost.amount || 0;
        }
        costsByCategory[cost.category] = (costsByCategory[cost.category] || 0) + cost.amount;
      });
    }

    // Format revenue/costs chart data
    const revenueChartData = Object.entries(revenueByPeriod)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date,
        label: groupBy === "month" 
          ? format(new Date(date + "-01"), "LLL yyyy", { locale: pl })
          : format(new Date(date), "d MMM", { locale: pl }),
        revenue,
        costs: costsByPeriod[date] || 0,
        profit: revenue - (costsByPeriod[date] || 0),
      }));

    // Format orders by status
    const statusLabels: Record<string, string> = {
      PLANNED: "Zaplanowane",
      ASSIGNED: "Przypisane",
      CONFIRMED: "Potwierdzone",
      LOADING: "Załadunek",
      IN_TRANSIT: "W trasie",
      UNLOADING: "Rozładunek",
      COMPLETED: "Zrealizowane",
      CANCELLED: "Anulowane",
      PROBLEM: "Problem",
    };

    const statusColors: Record<string, string> = {
      PLANNED: "#94a3b8",
      ASSIGNED: "#3b82f6",
      CONFIRMED: "#8b5cf6",
      LOADING: "#f59e0b",
      IN_TRANSIT: "#10b981",
      UNLOADING: "#a855f7",
      COMPLETED: "#22c55e",
      CANCELLED: "#ef4444",
      PROBLEM: "#dc2626",
    };

    const orderStatusData = ordersByStatus.map((item) => ({
      status: item.status,
      label: statusLabels[item.status] || item.status,
      count: item._count.id,
      color: statusColors[item.status] || "#6b7280",
    }));

    // Format costs by category
    const categoryLabels: Record<string, string> = {
      FUEL: "Paliwo",
      SERVICE: "Serwis",
      TOLL: "Opłaty drogowe",
      INSURANCE: "Ubezpieczenia",
      PARKING: "Parkingi",
      FINE: "Mandaty",
      SALARY: "Wynagrodzenia",
      TAX: "Podatki",
      OFFICE: "Biuro",
      OTHER: "Inne",
    };

    const categoryColors: Record<string, string> = {
      FUEL: "#ef4444",
      SERVICE: "#f59e0b",
      TOLL: "#3b82f6",
      INSURANCE: "#8b5cf6",
      PARKING: "#6366f1",
      FINE: "#dc2626",
      SALARY: "#10b981",
      TAX: "#64748b",
      OFFICE: "#06b6d4",
      OTHER: "#94a3b8",
    };

    const costsCategoryData = Object.entries(costsByCategory)
      .map(([category, amount]) => ({
        category,
        label: categoryLabels[category] || category,
        amount,
        color: categoryColors[category] || "#6b7280",
      }))
      .sort((a, b) => b.amount - a.amount);

    // Format top drivers
    const topDriversData = topDrivers.map((d) => ({
      id: d.driverId,
      name: driversMap.get(d.driverId!) || "Nieznany",
      revenue: d._sum.priceNet || 0,
      orders: d._count.id,
    }));

    // Format top vehicles
    const topVehiclesData = topVehicles.map((v) => ({
      id: v.vehicleId,
      registration: vehiclesMap.get(v.vehicleId!) || "Nieznany",
      revenue: v._sum.priceNet || 0,
      orders: v._count.id,
    }));

    return NextResponse.json({
      revenueChart: revenueChartData,
      ordersByStatus: orderStatusData,
      costsByCategory: costsCategoryData,
      topDrivers: topDriversData,
      topVehicles: topVehiclesData,
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania danych wykresow" },
      { status: 500 }
    );
  }
}
