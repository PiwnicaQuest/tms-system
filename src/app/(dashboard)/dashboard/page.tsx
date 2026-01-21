"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Users,
  ClipboardList,
  TrendingUp,
  Calendar,
  AlertCircle,
  RefreshCw,
  Wallet,
  PiggyBank,
  FileText,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Link from "next/link";

interface DashboardStats {
  kpis: {
    vehicles: { total: number; active: number };
    drivers: { total: number; active: number; onLeave: number };
    ordersToday: { total: number; inTransit: number; planned: number };
    revenue: { current: number; previous: number; trend: number };
    costs: { current: number; previous: number; trend: number };
    profit: { current: number; previous: number; trend: number };
    orders: { thisMonth: number; lastMonth: number; trend: number };
    invoices: { unpaid: number; overdue: number };
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    route: string;
    driver: string | null;
    vehicle: string | null;
    status: string;
    amount: number | null;
    currency: string;
  }>;
  alerts: Array<{ type: "error" | "warning" | "info"; message: string }>;
}

interface ChartData {
  revenueChart: Array<{
    date: string;
    label: string;
    revenue: number;
    costs: number;
    profit: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    label: string;
    count: number;
    color: string;
  }>;
  costsByCategory: Array<{
    category: string;
    label: string;
    amount: number;
    color: string;
  }>;
  topDrivers: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
  }>;
  topVehicles: Array<{
    id: string;
    registration: string;
    revenue: number;
    orders: number;
  }>;
}

const statusColors: Record<string, string> = {
  PLANNED: "bg-slate-500",
  ASSIGNED: "bg-blue-500",
  CONFIRMED: "bg-violet-500",
  LOADING: "bg-amber-500",
  IN_TRANSIT: "bg-emerald-500",
  UNLOADING: "bg-purple-500",
  COMPLETED: "bg-green-700",
  CANCELLED: "bg-red-500",
  PROBLEM: "bg-red-600",
};

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState("6months");

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, chartsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch(`/api/dashboard/charts?period=${chartPeriod}`),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (chartsRes.ok) {
          const chartsData = await chartsRes.json();
          setCharts(chartsData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chartPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Witaj w Bakus TMS. Oto przegląd Twojej floty.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/reports">
            <BarChart3 className="mr-2 h-4 w-4" />
            Raporty
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Pojazdy aktywne"
          value={stats?.kpis.vehicles.active || 0}
          description={`z ${stats?.kpis.vehicles.total || 0} w flocie`}
          icon={Truck}
        />
        <KpiCard
          title="Kierowcy dostępni"
          value={stats?.kpis.drivers.active || 0}
          description={`${stats?.kpis.drivers.onLeave || 0} na urlopie`}
          icon={Users}
        />
        <KpiCard
          title="Zlecenia dziś"
          value={stats?.kpis.ordersToday.total || 0}
          description={`${stats?.kpis.ordersToday.inTransit || 0} w trasie, ${stats?.kpis.ordersToday.planned || 0} zaplanowane`}
          icon={ClipboardList}
        />
        <KpiCard
          title="Przychód (miesiąc)"
          value={formatCurrency(stats?.kpis.revenue.current || 0)}
          description={`vs ${formatCurrency(stats?.kpis.revenue.previous || 0)} poprzedni`}
          icon={TrendingUp}
          trend={
            stats?.kpis.revenue.trend
              ? {
                  value: stats.kpis.revenue.trend,
                  isPositive: stats.kpis.revenue.trend > 0,
                }
              : undefined
          }
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Koszty (miesiąc)"
          value={formatCurrency(stats?.kpis.costs.current || 0)}
          description={`vs ${formatCurrency(stats?.kpis.costs.previous || 0)} poprzedni`}
          icon={Wallet}
          trend={
            stats?.kpis.costs.trend
              ? {
                  value: stats.kpis.costs.trend,
                  isPositive: stats.kpis.costs.trend < 0,
                }
              : undefined
          }
        />
        <KpiCard
          title="Zysk (miesiąc)"
          value={formatCurrency(stats?.kpis.profit.current || 0)}
          description={`vs ${formatCurrency(stats?.kpis.profit.previous || 0)} poprzedni`}
          icon={PiggyBank}
          trend={
            stats?.kpis.profit.trend
              ? {
                  value: stats.kpis.profit.trend,
                  isPositive: stats.kpis.profit.trend > 0,
                }
              : undefined
          }
        />
        <KpiCard
          title="Zlecenia (miesiąc)"
          value={stats?.kpis.orders.thisMonth || 0}
          description={`vs ${stats?.kpis.orders.lastMonth || 0} poprzedni`}
          icon={ClipboardList}
          trend={
            stats?.kpis.orders.trend
              ? {
                  value: stats.kpis.orders.trend,
                  isPositive: stats.kpis.orders.trend > 0,
                }
              : undefined
          }
        />
        <KpiCard
          title="Faktury nieopłacone"
          value={stats?.kpis.invoices.unpaid || 0}
          description={`${stats?.kpis.invoices.overdue || 0} przeterminowanych`}
          icon={FileText}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue/Costs Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Przychody i koszty</CardTitle>
            <Select value={chartPeriod} onValueChange={setChartPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Ostatnie 30 dni</SelectItem>
                <SelectItem value="6months">Ostatnie 6 miesięcy</SelectItem>
                <SelectItem value="12months">Ostatnie 12 miesięcy</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.revenueChart || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                    labelStyle={{ color: "var(--foreground)" }}
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Przychody"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="costs"
                    name="Koszty"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorCosts)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Zlecenia wg statusu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.ordersByStatus || []}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {(charts?.ordersByStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Costs by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Koszty wg kategorii</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(charts?.costsByCategory || []).slice(0, 6)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                  <Bar dataKey="amount" name="Kwota">
                    {(charts?.costsByCategory || []).slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ostatnie zlecenia
            </CardTitle>
            <Link
              href="/orders"
              className="text-sm text-primary hover:underline"
            >
              Zobacz wszystkie
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentOrders || []).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.orderNumber}</span>
                      <Badge
                        variant="secondary"
                        className={`${statusColors[order.status]} text-white`}
                      >
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.route}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.driver || "Brak kierowcy"} •{" "}
                      {order.vehicle || "Brak pojazdu"}
                    </p>
                  </div>
                  <div className="text-right">
                    {order.amount && (
                      <p className="font-semibold">
                        {formatCurrency(order.amount)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Brak zleceń
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alerty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.alerts || []).map((alert, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-3 text-sm ${
                    alert.type === "error"
                      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                      : alert.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                      : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
                  }`}
                >
                  {alert.message}
                </div>
              ))}
              {(!stats?.alerts || stats.alerts.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Brak alertów
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top kierowcy (miesiąc)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(charts?.topDrivers || []).map((driver, index) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.orders} zleceń
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(driver.revenue)}</p>
                </div>
              ))}
              {(!charts?.topDrivers || charts.topDrivers.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Brak danych
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Vehicles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Top pojazdy (miesiąc)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(charts?.topVehicles || []).map((vehicle, index) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{vehicle.registration}</p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.orders} zleceń
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(vehicle.revenue)}</p>
                </div>
              ))}
              {(!charts?.topVehicles || charts.topVehicles.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Brak danych
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
