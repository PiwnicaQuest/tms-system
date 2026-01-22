"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CostAddDialog, costCategoryLabels } from "@/components/ui/cost-add-dialog";
import {
  Calculator,
  Users,
  Truck,
  Plus,
  Download,
  Calendar,
  TrendingUp,
  Loader2,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Wrench,
  Shield,
  FileText,
} from "lucide-react";

// Types
interface Cost {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  currency: string;
  date: string;
  vehicleId: string | null;
  driverId: string | null;
  orderId: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  vehicle: { id: string; registrationNumber: string } | null;
  driver: { id: string; firstName: string; lastName: string } | null;
}

interface CostsResponse {
  data: Cost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    categoryTotals: Record<string, number>;
    total: number;
  };
}

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  FUEL: <Fuel className="h-4 w-4" />,
  SERVICE: <Wrench className="h-4 w-4" />,
  TOLL: <FileText className="h-4 w-4" />,
  INSURANCE: <Shield className="h-4 w-4" />,
  PARKING: <FileText className="h-4 w-4" />,
  FINE: <FileText className="h-4 w-4" />,
  SALARY: <Users className="h-4 w-4" />,
  TAX: <FileText className="h-4 w-4" />,
  OFFICE: <FileText className="h-4 w-4" />,
  OTHER: <FileText className="h-4 w-4" />,
};

// Format date helper
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// Format currency helper
const formatCurrency = (amount: number, currency: string = "PLN") => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
};

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [summary, setSummary] = useState<{
    categoryTotals: Record<string, number>;
    total: number;
  }>({ categoryTotals: {}, total: 0 });
  
  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingCostId, setDeletingCostId] = useState<string | null>(null);

  // Fetch costs
  const fetchCosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      
      if (categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }
      if (dateRange.startDate) {
        params.set("startDate", dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.set("endDate", dateRange.endDate);
      }

      const res = await fetch(`/api/costs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch costs");
      
      const data: CostsResponse = await res.json();
      setCosts(data.data);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
      setSummary(data.summary);
    } catch (error) {
      console.error("Error fetching costs:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, categoryFilter, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Delete cost
  const handleDeleteCost = async () => {
    if (!deletingCostId) return;
    
    try {
      const res = await fetch(`/api/costs/${deletingCostId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete cost");
      
      setDeletingCostId(null);
      fetchCosts();
    } catch (error) {
      console.error("Error deleting cost:", error);
      alert("Nie udało się usunąć kosztu");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Data", "Kategoria", "Opis", "Pojazd", "Kierowca", "Kwota"];
    const csvContent = [
      headers.join(";"),
      ...costs.map((cost) =>
        [
          formatDate(cost.date),
          costCategoryLabels[cost.category] || cost.category,
          cost.description || "",
          cost.vehicle?.registrationNumber || "",
          cost.driver ? `${cost.driver.firstName} ${cost.driver.lastName}` : "",
          `${cost.amount.toFixed(2).replace(".", ",")} ${cost.currency}`,
        ].join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `koszty-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter costs by search term (client-side filtering on description/vehicle/driver)
  const filteredCosts = costs.filter((cost) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cost.description?.toLowerCase().includes(searchLower) ||
      cost.vehicle?.registrationNumber.toLowerCase().includes(searchLower) ||
      (cost.driver && `${cost.driver.firstName} ${cost.driver.lastName}`.toLowerCase().includes(searchLower))
    );
  });

  // Top 5 categories by total
  const topCategories = Object.entries(summary.categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Koszty
          </h1>
          <p className="text-muted-foreground">
            Zarządzanie kosztami floty i operacji
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={costs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Eksport CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj koszt
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Suma kosztów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Liczba wpisów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Paliwo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.categoryTotals.FUEL || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Serwis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.categoryTotals.SERVICE || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {Object.entries(costCategoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-[150px]"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-[150px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista kosztów</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak kosztów do wyświetlenia</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Kategoria</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead>Pojazd</TableHead>
                    <TableHead>Kierowca</TableHead>
                    <TableHead className="text-right">Kwota</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="font-medium">
                        {formatDate(cost.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {categoryIcons[cost.category]}
                          {costCategoryLabels[cost.category] || cost.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {cost.description || "-"}
                      </TableCell>
                      <TableCell>
                        {cost.vehicle ? (
                          <Link
                            href={`/vehicles/${cost.vehicle.id}`}
                            className="text-primary hover:underline"
                          >
                            {cost.vehicle.registrationNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cost.driver ? (
                          <Link
                            href={`/drivers/${cost.driver.id}`}
                            className="text-primary hover:underline"
                          >
                            {cost.driver.firstName} {cost.driver.lastName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(cost.amount, cost.currency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCostId(cost.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Strona {pagination.page} z {pagination.totalPages} ({pagination.total} wpisów)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Poprzednia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Następna
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Category Summary */}
      {topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie wg kategorii</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {topCategories.map(([category, amount]) => (
                <div
                  key={category}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="p-2 rounded-full bg-muted">
                    {categoryIcons[category]}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {costCategoryLabels[category] || category}
                    </p>
                    <p className="font-semibold">{formatCurrency(amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Cost Dialog */}
      <CostAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchCosts}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCostId}
        onOpenChange={(open) => !open && setDeletingCostId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Koszt zostanie trwale usunięty z
              systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
