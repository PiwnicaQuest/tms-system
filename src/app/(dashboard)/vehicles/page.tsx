"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload, ImageThumbnail } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Truck,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Fuel,
  RotateCcw,
} from "lucide-react";

type VehicleStatus = "ACTIVE" | "INACTIVE" | "IN_SERVICE" | "SOLD";
type VehicleType = "TRUCK" | "BUS" | "SOLO" | "TRAILER" | "CAR";
type FuelType = "DIESEL" | "PETROL" | "LPG" | "ELECTRIC" | "HYBRID";

const statusLabels: Record<VehicleStatus, string> = {
  ACTIVE: "Aktywny",
  IN_SERVICE: "W serwisie",
  INACTIVE: "Nieaktywny",
  SOLD: "Sprzedany",
};

const statusColors: Record<VehicleStatus, string> = {
  ACTIVE: "bg-emerald-500",
  IN_SERVICE: "bg-amber-500",
  INACTIVE: "bg-slate-500",
  SOLD: "bg-red-500",
};

const typeLabels: Record<VehicleType, string> = {
  TRUCK: "Ciągnik",
  BUS: "Bus",
  SOLO: "Solówka",
  TRAILER: "Naczepa",
  CAR: "Osobówka",
};

const fuelLabels: Record<FuelType, string> = {
  DIESEL: "Diesel",
  PETROL: "Benzyna",
  LPG: "LPG",
  ELECTRIC: "Elektryczny",
  HYBRID: "Hybryda",
};

interface Vehicle {
  id: string;
  registrationNumber: string;
  type: VehicleType;
  brand: string | null;
  model: string | null;
  vin: string | null;
  year: number | null;
  status: VehicleStatus;
  loadCapacity: number | null;
  volume: number | null;
  euroClass: string | null;
  fuelType: FuelType | null;
  currentDriverId: string | null;
  currentTrailerId: string | null;
  notes: string | null;
  isActive: boolean;
  imageUrl: string | null;
}

interface VehiclesResponse {
  data: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialFormData = {
  registrationNumber: "",
  type: "TRUCK" as VehicleType,
  brand: "",
  model: "",
  vin: "",
  year: new Date().getFullYear(),
  status: "ACTIVE" as VehicleStatus,
  loadCapacity: "",
  volume: "",
  euroClass: "",
  fuelType: "DIESEL" as FuelType,
  notes: "",
  imageUrl: null as string | null,
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [activeCounts, setActiveCounts] = useState({ active: 0, inactive: 0 });

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch counts for tabs
  const fetchCounts = useCallback(async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch("/api/vehicles?limit=1&isActive=true"),
        fetch("/api/vehicles?limit=1&isActive=false"),
      ]);
      const activeData = await activeRes.json();
      const inactiveData = await inactiveRes.json();
      setActiveCounts({
        active: activeData.pagination?.total || 0,
        inactive: inactiveData.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }, []);

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      params.set("isActive", activeTab === "active" ? "true" : "false");
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/vehicles?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch vehicles");

      const data: VehiclesResponse = await response.json();
      setVehicles(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, typeFilter, activeTab]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as "active" | "inactive");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Open dialog for new vehicle
  const handleNew = () => {
    setEditingVehicle(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowDialog(true);
  };

  // Open dialog for edit
  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      registrationNumber: vehicle.registrationNumber,
      type: vehicle.type,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      vin: vehicle.vin || "",
      year: vehicle.year || new Date().getFullYear(),
      status: vehicle.status,
      loadCapacity: vehicle.loadCapacity?.toString() || "",
      volume: vehicle.volume?.toString() || "",
      euroClass: vehicle.euroClass || "",
      fuelType: vehicle.fuelType || "DIESEL",
      notes: vehicle.notes || "",
      imageUrl: vehicle.imageUrl || null,
    });
    setFormErrors({});
    setShowDialog(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten pojazd?")) return;

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas usuwania pojazdu");
        return;
      }

      fetchVehicles();
      fetchCounts();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      alert("Wystąpił błąd podczas usuwania pojazdu");
    }
  };

  // Handle restore
  const handleRestore = async (id: string) => {
    if (!confirm("Czy na pewno chcesz przywrócić ten pojazd?")) return;

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, status: "ACTIVE" }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas przywracania pojazdu");
        return;
      }

      fetchVehicles();
      fetchCounts();
    } catch (error) {
      console.error("Error restoring vehicle:", error);
      alert("Wystąpił błąd podczas przywracania pojazdu");
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});

    try {
      const payload = {
        registrationNumber: formData.registrationNumber,
        type: formData.type,
        brand: formData.brand || null,
        model: formData.model || null,
        vin: formData.vin || null,
        year: formData.year || null,
        status: formData.status,
        loadCapacity: formData.loadCapacity ? parseFloat(formData.loadCapacity) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        euroClass: formData.euroClass || null,
        fuelType: formData.fuelType,
        notes: formData.notes || null,
        imageUrl: formData.imageUrl || null,
      };

      const url = editingVehicle
        ? `/api/vehicles/${editingVehicle.id}`
        : "/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setFormErrors({ registrationNumber: data.error });
        } else {
          throw new Error(data.error || "Failed to save vehicle");
        }
        return;
      }

      setShowDialog(false);
      fetchVehicles();
      fetchCounts();
    } catch (error) {
      console.error("Error saving vehicle:", error);
      alert("Wystąpił błąd podczas zapisywania pojazdu");
    } finally {
      setFormLoading(false);
    }
  };

  // Calculate stats for current view
  const stats = {
    total: pagination.total,
    active: vehicles.filter((v) => v.status === "ACTIVE").length,
    inService: vehicles.filter((v) => v.status === "IN_SERVICE").length,
    inactive: vehicles.filter((v) => v.status === "INACTIVE" || v.status === "SOLD").length,
  };

  // Render vehicle table
  const renderVehicleTable = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {activeTab === "active"
            ? "Nie znaleziono aktywnych pojazdów"
            : "Brak nieaktywnych pojazdów"}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Zdjęcie</TableHead>
              <TableHead>Nr rejestracyjny</TableHead>
              <TableHead>Marka / Model</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paliwo</TableHead>
              <TableHead>Ładowność</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} className={!vehicle.isActive ? "opacity-60" : ""}>
                <TableCell className="w-[60px]">
                  <ImageThumbnail
                    src={vehicle.imageUrl}
                    alt={vehicle.registrationNumber}
                    fallbackIcon={<Truck className="h-4 w-4" />}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/vehicles/${vehicle.id}`}
                    className="font-mono font-medium hover:underline"
                  >
                    {vehicle.registrationNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{vehicle.brand || "-"}</p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ""}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabels[vehicle.type]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`${statusColors[vehicle.status]} text-white`}
                  >
                    {statusLabels[vehicle.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {vehicle.fuelType ? (
                    <div className="flex items-center gap-1">
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                      {fuelLabels[vehicle.fuelType]}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {vehicle.loadCapacity ? (
                    <span>{vehicle.loadCapacity.toLocaleString("pl-PL")} kg</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/vehicles/${vehicle.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Szczegóły
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {activeTab === "active" ? (
                        <DropdownMenuItem
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleRestore(vehicle.id)}
                          className="text-emerald-600"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Przywróć
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Strona {pagination.page} z {pagination.totalPages}
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
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Pojazdy
          </h1>
          <p className="text-muted-foreground">
            Zarządzanie flotą pojazdów firmy
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pojazd
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Wszystkie pojazdy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCounts.active + activeCounts.inactive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Aktywne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCounts.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              W serwisie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.inService}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-500" />
              Nieaktywne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCounts.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active">
            Aktywne ({activeCounts.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Nieaktywne ({activeCounts.inactive})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj po nr rejestracyjnym, marce..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
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
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </form>
            </CardContent>
          </Card>

          {/* Vehicles Table */}
          <Card>
            <CardHeader>
              <CardTitle>Aktywne pojazdy</CardTitle>
              <CardDescription>
                Znaleziono {pagination.total} pojazdów
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderVehicleTable()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj po nr rejestracyjnym, marce..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </form>
            </CardContent>
          </Card>

          {/* Vehicles Table */}
          <Card>
            <CardHeader>
              <CardTitle>Nieaktywne pojazdy</CardTitle>
              <CardDescription>
                Znaleziono {pagination.total} pojazdów
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderVehicleTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Edytuj pojazd" : "Dodaj nowy pojazd"}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? "Zaktualizuj dane pojazdu"
                : "Wypełnij formularz, aby dodać nowy pojazd do floty"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Nr rejestracyjny *</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="np. WGM1068L"
                    required
                  />
                  {formErrors.registrationNumber && (
                    <p className="text-sm text-red-600">{formErrors.registrationNumber}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Typ pojazdu *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: VehicleType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marka</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="np. MAN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="np. TGX 18.480"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Rok produkcji</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) || 0 })
                    }
                    min={1900}
                    max={2100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: VehicleStatus) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuelType">Rodzaj paliwa</Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value: FuelType) =>
                      setFormData({ ...formData, fuelType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fuelLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) =>
                      setFormData({ ...formData, vin: e.target.value.toUpperCase() })
                    }
                    placeholder="Numer VIN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loadCapacity">Ładowność (kg)</Label>
                  <Input
                    id="loadCapacity"
                    type="number"
                    value={formData.loadCapacity}
                    onChange={(e) =>
                      setFormData({ ...formData, loadCapacity: e.target.value })
                    }
                    placeholder="np. 24000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="euroClass">Klasa Euro</Label>
                  <Input
                    id="euroClass"
                    value={formData.euroClass}
                    onChange={(e) =>
                      setFormData({ ...formData, euroClass: e.target.value })
                    }
                    placeholder="np. Euro 6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Uwagi</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Dodatkowe informacje..."
                />
              </div>

              <div className="space-y-2">
                <Label>Zdjęcie pojazdu</Label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                  entityType="vehicle"
                  entityId={editingVehicle?.id}
                  disabled={formLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : editingVehicle ? (
                  "Zapisz zmiany"
                ) : (
                  "Dodaj pojazd"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
