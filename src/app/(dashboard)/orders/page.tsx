"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/ui/page-loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Truck,
  MapPin,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  AutocompleteInput,
  AutocompleteOption,
  fetchDrivers,
  fetchVehicles,
} from "@/components/ui/autocomplete-input";

// Order status type
type OrderStatus =
  | "PLANNED"
  | "ASSIGNED"
  | "CONFIRMED"
  | "LOADING"
  | "IN_TRANSIT"
  | "UNLOADING"
  | "COMPLETED"
  | "CANCELLED"
  | "PROBLEM";

// Status labels in Polish
const statusLabels: Record<OrderStatus, string> = {
  PLANNED: "Zaplanowane",
  ASSIGNED: "Przypisane",
  CONFIRMED: "Potwierdzone",
  LOADING: "Zaladunek",
  IN_TRANSIT: "W trasie",
  UNLOADING: "Rozladunek",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
  PROBLEM: "Problem",
};

// Status colors
const statusColors: Record<OrderStatus, string> = {
  PLANNED: "bg-slate-500 hover:bg-slate-600",
  ASSIGNED: "bg-blue-500 hover:bg-blue-600",
  CONFIRMED: "bg-cyan-500 hover:bg-cyan-600",
  LOADING: "bg-amber-500 hover:bg-amber-600",
  IN_TRANSIT: "bg-emerald-500 hover:bg-emerald-600",
  UNLOADING: "bg-amber-500 hover:bg-amber-600",
  COMPLETED: "bg-green-600 hover:bg-green-700",
  CANCELLED: "bg-red-500 hover:bg-red-600",
  PROBLEM: "bg-orange-500 hover:bg-orange-600",
};

interface Order {
  id: string;
  orderNumber: string;
  externalNumber: string | null;
  type: "OWN" | "FORWARDING";
  status: OrderStatus;
  origin: string;
  originCity: string | null;
  destination: string;
  destinationCity: string | null;
  loadingDate: string;
  unloadingDate: string;
  priceNet: number | null;
  currency: string;
  contractor: {
    id: string;
    name: string;
    shortName: string | null;
  } | null;
  driver: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  vehicle: {
    id: string;
    registrationNumber: string;
  } | null;
  trailer: {
    id: string;
    registrationNumber: string;
  } | null;
}

interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [driverId, setDriverId] = useState(searchParams.get("driverId") || "");
  const [vehicleId, setVehicleId] = useState(searchParams.get("vehicleId") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");

  // Autocomplete state for driver and vehicle
  const [selectedDriver, setSelectedDriver] = useState<AutocompleteOption | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<AutocompleteOption | null>(null);
  const [driverInputValue, setDriverInputValue] = useState("");
  const [vehicleInputValue, setVehicleInputValue] = useState("");

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (driverId) params.set("driverId", driverId);
      if (vehicleId) params.set("vehicleId", vehicleId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch orders");

      const data: OrdersResponse = await response.json();
      setOrders(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, status, driverId, vehicleId, dateFrom, dateTo]);

  // Fetch orders on mount and filter change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchOrders();
  };

  // Handle driver selection
  const handleDriverSelect = (option: AutocompleteOption | null) => {
    setSelectedDriver(option);
    setDriverId(option?.value || "");
  };

  // Handle vehicle selection
  const handleVehicleSelect = (option: AutocompleteOption | null) => {
    setSelectedVehicle(option);
    setVehicleId(option?.value || "");
  };

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDriverId("");
    setVehicleId("");
    setSelectedDriver(null);
    setSelectedVehicle(null);
    setDriverInputValue("");
    setVehicleInputValue("");
    setDateFrom("");
    setDateTo("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Delete order
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunac to zlecenie?")) return;

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas usuwania zlecenia");
        return;
      }

      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Wystapil blad podczas usuwania zlecenia");
    }
  };

  // Update status
  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas zmiany statusu");
        return;
      }

      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Wystapil blad podczas zmiany statusu");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format price
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return "-";
    return `${price.toLocaleString("pl-PL")} ${currency}`;
  };

  // Check if filters are active
  const hasActiveFilters =
    search || (status && status !== "all") || driverId || vehicleId || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Zlecenia
          </h1>
          <p className="text-muted-foreground">
            Zarzadzanie zleceniami transportowymi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odswiez
          </Button>
          <Button asChild>
            <Link href="/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              Nowe zlecenie
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po numerze, trasie, opisie..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtry
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Aktywne
                  </Badge>
                )}
              </Button>
              <Button type="submit">Szukaj</Button>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-5 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kierowca</Label>
                  <AutocompleteInput
                    value={driverInputValue}
                    onChange={setDriverInputValue}
                    onSelect={handleDriverSelect}
                    fetchOptions={fetchDrivers}
                    placeholder="Wyszukaj kierowce..."
                    selectedOption={selectedDriver}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pojazd</Label>
                  <AutocompleteInput
                    value={vehicleInputValue}
                    onChange={setVehicleInputValue}
                    onSelect={handleVehicleSelect}
                    fetchOptions={fetchVehicles}
                    placeholder="Wyszukaj pojazd..."
                    selectedOption={selectedVehicle}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data od</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data do</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                {hasActiveFilters && (
                  <div className="md:col-span-5 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Wyczysc filtry
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista zlecen</CardTitle>
          <CardDescription>
            Znaleziono {pagination.total} zlecen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nie znaleziono zlecen</p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Wyczysc filtry
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr zlecenia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trasa</TableHead>
                    <TableHead>Daty</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Kierowca / Pojazd</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          {order.externalNumber && (
                            <p className="text-xs text-muted-foreground">
                              {order.externalNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${
                                statusColors[order.status]
                              } text-white h-6 px-2`}
                            >
                              {statusLabels[order.status]}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {Object.entries(statusLabels).map(
                              ([key, label]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={() =>
                                    handleStatusChange(
                                      order.id,
                                      key as OrderStatus
                                    )
                                  }
                                  disabled={order.status === key}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full mr-2 ${
                                      statusColors[key as OrderStatus]
                                    }`}
                                  />
                                  {label}
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="text-sm">
                            <p>{order.originCity || order.origin}</p>
                            <p className="text-muted-foreground">
                              {order.destinationCity || order.destination}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="text-sm">
                            <p>{formatDate(order.loadingDate)}</p>
                            <p className="text-muted-foreground">
                              {formatDate(order.unloadingDate)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.contractor ? (
                          <span className="text-sm">
                            {order.contractor.shortName || order.contractor.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Truck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="text-sm">
                            {order.driver ? (
                              <p>
                                {order.driver.firstName} {order.driver.lastName}
                              </p>
                            ) : (
                              <p className="text-muted-foreground">
                                Nieprzypisany
                              </p>
                            )}
                            {order.vehicle && (
                              <Badge variant="outline" className="text-xs">
                                {order.vehicle.registrationNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(order.priceNet, order.currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/orders/${order.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Szczegoly
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/orders/${order.id}/edit`)
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(order.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usun
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Strona {pagination.page} z {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Poprzednia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Nastepna
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrdersPageContent />
    </Suspense>
  );
}
