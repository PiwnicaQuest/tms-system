"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Download,
  Users,
  Truck,
  TrendingUp,
  RefreshCw,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subMonths } from "date-fns";
import { pl } from "date-fns/locale";

interface ReportData {
  revenueChart: Array<{
    date: string;
    label: string;
    revenue: number;
    costs: number;
    profit: number;
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
  costsByCategory: Array<{
    category: string;
    label: string;
    amount: number;
    color: string;
  }>;
}

interface DriverReport {
  id: string;
  name: string;
  month: string;
  revenue: number;
  orders: number;
  avgPerOrder: number;
  workDays: number;
}

interface VehicleReport {
  id: string;
  registration: string;
  month: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  orders: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [driverReports, setDriverReports] = useState<DriverReport[]>([]);
  const [vehicleReports, setVehicleReports] = useState<VehicleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  // Generate month options for the last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "LLLL yyyy", { locale: pl }),
    };
  });

  // Fetch report data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [chartsRes, driversRes, vehiclesRes] = await Promise.all([
          fetch(`/api/dashboard/charts?period=${period}`),
          fetch(`/api/costs/reports/drivers?year=${selectedMonth.split("-")[0]}&month=${selectedMonth.split("-")[1]}`),
          fetch(`/api/costs/reports/vehicles?year=${selectedMonth.split("-")[0]}&month=${selectedMonth.split("-")[1]}`),
        ]);

        if (chartsRes.ok) {
          const data = await chartsRes.json();
          setReportData(data);
        }

        if (driversRes.ok) {
          const data = await driversRes.json();
          if (data.data) {
            setDriverReports(
              data.data.map((d: {
                driver: { firstName: string; lastName: string };
                driverId: string;
                totalRevenue: number;
                totalOrders: number;
                avgDailyRevenue: number;
                workDays: number;
              }) => ({
                id: d.driverId,
                name: `${d.driver.firstName} ${d.driver.lastName}`,
                month: selectedMonth,
                revenue: d.totalRevenue,
                orders: d.totalOrders,
                avgPerOrder: d.totalOrders > 0 ? d.totalRevenue / d.totalOrders : 0,
                workDays: d.workDays,
              }))
            );
          }
        }

        if (vehiclesRes.ok) {
          const data = await vehiclesRes.json();
          if (data.data) {
            setVehicleReports(
              data.data.map((v: {
                vehicle: { registrationNumber: string };
                vehicleId: string;
                totalRevenue: number;
                totalCost: number;
                profit: number;
                profitMargin: number;
                operatingDays: number;
              }) => ({
                id: v.vehicleId,
                registration: v.vehicle.registrationNumber,
                month: selectedMonth,
                revenue: v.totalRevenue,
                costs: v.totalCost,
                profit: v.profit,
                profitMargin: v.profitMargin,
                orders: v.operatingDays,
              }))
            );
          }
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, selectedMonth]);

  // Export to CSV
  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(";"),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (typeof value === "number") {
              return value.toString().replace(".", ",");
            }
            return `"${value}"`;
          })
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Raporty
          </h1>
          <p className="text-muted-foreground">
            Analizuj wydajność floty, kierowców i finanse
          </p>
        </div>
      </div>

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList>
          <TabsTrigger value="financial">
            <TrendingUp className="mr-2 h-4 w-4" />
            Finanse
          </TabsTrigger>
          <TabsTrigger value="drivers">
            <Users className="mr-2 h-4 w-4" />
            Kierowcy
          </TabsTrigger>
          <TabsTrigger value="vehicles">
            <Truck className="mr-2 h-4 w-4" />
            Pojazdy
          </TabsTrigger>
        </TabsList>

        {/* Financial Reports */}
        <TabsContent value="financial" className="space-y-6">
          <div className="flex items-center justify-between">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Ostatnie 30 dni</SelectItem>
                <SelectItem value="6months">Ostatnie 6 miesięcy</SelectItem>
                <SelectItem value="12months">Ostatnie 12 miesięcy</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  (reportData?.revenueChart || []).map((r) => ({
                    Okres: r.label,
                    Przychody: r.revenue,
                    Koszty: r.costs,
                    Zysk: r.profit,
                  })),
                  "raport-finansowy"
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Eksportuj CSV
            </Button>
          </div>

          {/* Revenue/Costs/Profit Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Przychody, koszty i zysk</CardTitle>
              <CardDescription>
                Porównanie przychodów, kosztów i zysku w wybranym okresie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.revenueChart || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Przychody" fill="#10b981" />
                    <Bar dataKey="costs" name="Koszty" fill="#ef4444" />
                    <Bar dataKey="profit" name="Zysk" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Costs Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Struktura kosztów</CardTitle>
              <CardDescription>Podział kosztów według kategorii</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategoria</TableHead>
                    <TableHead className="text-right">Kwota</TableHead>
                    <TableHead className="text-right">Udział</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportData?.costsByCategory || []).map((cost) => {
                    const total = (reportData?.costsByCategory || []).reduce(
                      (acc, c) => acc + c.amount,
                      0
                    );
                    const share = total > 0 ? (cost.amount / total) * 100 : 0;
                    return (
                      <TableRow key={cost.category}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cost.color }}
                            />
                            {cost.label}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cost.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatPercent(share)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Driver Reports */}
        <TabsContent value="drivers" className="space-y-6">
          <div className="flex items-center justify-between">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  driverReports.map((d) => ({
                    Kierowca: d.name,
                    Przychod: d.revenue,
                    Zlecenia: d.orders,
                    "Sr. na zlecenie": d.avgPerOrder,
                    "Dni pracy": d.workDays,
                  })),
                  "raport-kierowcow"
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Eksportuj CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Wydajność kierowców</CardTitle>
              <CardDescription>
                Ranking kierowców według wygenerowanego przychodu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Kierowca</TableHead>
                    <TableHead className="text-right">Przychód</TableHead>
                    <TableHead className="text-right">Zlecenia</TableHead>
                    <TableHead className="text-right">Śr. na zlecenie</TableHead>
                    <TableHead className="text-right">Dni pracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverReports.length > 0 ? (
                    driverReports
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((driver, index) => (
                        <TableRow key={driver.id}>
                          <TableCell>
                            {index < 3 ? (
                              <Badge
                                variant={
                                  index === 0
                                    ? "default"
                                    : index === 1
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {index + 1}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                {index + 1}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {driver.name}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(driver.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {driver.orders}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(driver.avgPerOrder)}
                          </TableCell>
                          <TableCell className="text-right">
                            {driver.workDays}
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Brak danych dla wybranego miesiąca
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Driver Performance Chart */}
          {reportData?.topDrivers && reportData.topDrivers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Porównanie przychodów kierowców</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.topDrivers}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis type="category" dataKey="name" width={150} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                      <Bar dataKey="revenue" name="Przychód" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vehicle Reports */}
        <TabsContent value="vehicles" className="space-y-6">
          <div className="flex items-center justify-between">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  vehicleReports.map((v) => ({
                    Pojazd: v.registration,
                    Przychod: v.revenue,
                    Koszty: v.costs,
                    Zysk: v.profit,
                    "Marza (%)": v.profitMargin,
                    "Dni ekspl.": v.orders,
                  })),
                  "raport-pojazdow"
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Eksportuj CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rentowność pojazdów</CardTitle>
              <CardDescription>
                Analiza przychodów, kosztów i zysku per pojazd
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Pojazd</TableHead>
                    <TableHead className="text-right">Przychód</TableHead>
                    <TableHead className="text-right">Koszty</TableHead>
                    <TableHead className="text-right">Zysk</TableHead>
                    <TableHead className="text-right">Marża</TableHead>
                    <TableHead className="text-right">Dni ekspl.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleReports.length > 0 ? (
                    vehicleReports
                      .sort((a, b) => b.profit - a.profit)
                      .map((vehicle, index) => (
                        <TableRow key={vehicle.id}>
                          <TableCell>
                            {index < 3 ? (
                              <Badge
                                variant={
                                  index === 0
                                    ? "default"
                                    : index === 1
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {index + 1}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                {index + 1}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {vehicle.registration}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(vehicle.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(vehicle.costs)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              vehicle.profit >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(vehicle.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                vehicle.profitMargin >= 20
                                  ? "default"
                                  : vehicle.profitMargin >= 10
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {formatPercent(vehicle.profitMargin)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {vehicle.orders}
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Brak danych dla wybranego miesiąca
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Vehicle Performance Chart */}
          {reportData?.topVehicles && reportData.topVehicles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Porównanie przychodów pojazdów</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.topVehicles}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis type="category" dataKey="registration" width={120} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                      <Bar dataKey="revenue" name="Przychód" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
