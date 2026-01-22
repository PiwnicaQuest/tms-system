"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Container,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

type TrailerStatus = "ACTIVE" | "IN_SERVICE" | "INACTIVE" | "SOLD";
type TrailerType = "CURTAIN" | "REFRIGERATOR" | "TANKER" | "FLATBED" | "MEGA" | "BOX" | "TIPPER" | "OTHER";

const statusLabels: Record<TrailerStatus, string> = {
  ACTIVE: "Aktywna",
  IN_SERVICE: "W serwisie",
  INACTIVE: "Nieaktywna",
  SOLD: "Sprzedana",
};

const statusColors: Record<TrailerStatus, string> = {
  ACTIVE: "bg-emerald-500",
  IN_SERVICE: "bg-amber-500",
  INACTIVE: "bg-slate-500",
  SOLD: "bg-red-500",
};

const typeLabels: Record<TrailerType, string> = {
  CURTAIN: "Firanka",
  REFRIGERATOR: "Chłodnia",
  TANKER: "Cysterna",
  FLATBED: "Platforma",
  MEGA: "Mega",
  BOX: "Kontener",
  TIPPER: "Wywrotka",
  OTHER: "Inna",
};

interface Trailer {
  id: string;
  registrationNumber: string;
  type: TrailerType;
  brand: string | null;
  year: number | null;
  loadCapacity: number | null;
  volume: number | null;
  axles: number | null;
  status: TrailerStatus;
  adrClasses: string | null;
  notes?: string | null;
  isActive: boolean;
}

interface TrailersResponse {
  data: Trailer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialFormData = {
  registrationNumber: "",
  type: "CURTAIN" as TrailerType,
  brand: "",
  year: new Date().getFullYear(),
  status: "ACTIVE" as TrailerStatus,
  loadCapacity: "",
  volume: "",
  axles: "3",
  adrClasses: "",
  notes: "",
};

export default function TrailersPage() {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
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
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch counts for tabs
  const fetchCounts = useCallback(async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch("/api/trailers?limit=1&isActive=true"),
        fetch("/api/trailers?limit=1&isActive=false"),
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

  const fetchTrailers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      params.set("isActive", activeTab === "active" ? "true" : "false");
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/trailers?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch trailers");

      const data: TrailersResponse = await response.json();
      setTrailers(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching trailers:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, typeFilter, activeTab]);

  useEffect(() => {
    fetchTrailers();
  }, [fetchTrailers]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as "active" | "inactive");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Open dialog for new trailer
  const handleNew = () => {
    setEditingTrailer(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowDialog(true);
  };

  // Open dialog for edit
  const handleEdit = (trailer: Trailer) => {
    setEditingTrailer(trailer);
    setFormData({
      registrationNumber: trailer.registrationNumber,
      type: trailer.type,
      brand: trailer.brand || "",
      year: trailer.year || new Date().getFullYear(),
      status: trailer.status,
      loadCapacity: trailer.loadCapacity?.toString() || "",
      volume: trailer.volume?.toString() || "",
      axles: trailer.axles?.toString() || "3",
      adrClasses: trailer.adrClasses || "",
      notes: trailer.notes || "",
    });
    setFormErrors({});
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę naczepę?")) return;

    try {
      const response = await fetch(`/api/trailers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas usuwania naczepy");
        return;
      }

      fetchTrailers();
      fetchCounts();
    } catch (error) {
      console.error("Error deleting trailer:", error);
      alert("Wystąpił błąd podczas usuwania naczepy");
    }
  };

  // Handle restore
  const handleRestore = async (id: string) => {
    if (!confirm("Czy na pewno chcesz przywrócić tę naczepę?")) return;

    try {
      const response = await fetch(`/api/trailers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, status: "ACTIVE" }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas przywracania naczepy");
        return;
      }

      fetchTrailers();
      fetchCounts();
    } catch (error) {
      console.error("Error restoring trailer:", error);
      alert("Wystąpił błąd podczas przywracania naczepy");
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
        year: formData.year || null,
        status: formData.status,
        loadCapacity: formData.loadCapacity ? parseFloat(formData.loadCapacity) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        axles: formData.axles ? parseInt(formData.axles) : null,
        adrClasses: formData.adrClasses || null,
        notes: formData.notes || null,
      };

      const url = editingTrailer
        ? `/api/trailers/${editingTrailer.id}`
        : "/api/trailers";
      const method = editingTrailer ? "PUT" : "POST";

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
          throw new Error(data.error || "Failed to save trailer");
        }
        return;
      }

      setShowDialog(false);
      fetchTrailers();
      fetchCounts();
    } catch (error) {
      console.error("Error saving trailer:", error);
      alert("Wystąpił błąd podczas zapisywania naczepy");
    } finally {
      setFormLoading(false);
    }
  };

  const stats = {
    total: pagination.total,
    active: trailers.filter((t) => t.status === "ACTIVE").length,
    inService: trailers.filter((t) => t.status === "IN_SERVICE").length,
  };

  // Render trailer table
  const renderTrailerTable = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : trailers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Container className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>
            {activeTab === "active"
              ? "Nie znaleziono aktywnych naczep"
              : "Brak nieaktywnych naczep"}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nr rejestracyjny</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Marka</TableHead>
              <TableHead>Rok</TableHead>
              <TableHead>Ładowność</TableHead>
              <TableHead>Pojemność</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ADR</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trailers.map((trailer) => (
              <TableRow key={trailer.id} className={!trailer.isActive ? "opacity-60" : ""}>
                <TableCell>
                  <Link
                    href={`/trailers/${trailer.id}`}
                    className="font-mono font-medium hover:underline"
                  >
                    {trailer.registrationNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabels[trailer.type]}</Badge>
                </TableCell>
                <TableCell>{trailer.brand || "-"}</TableCell>
                <TableCell>{trailer.year || "-"}</TableCell>
                <TableCell>
                  {trailer.loadCapacity
                    ? `${trailer.loadCapacity.toLocaleString("pl-PL")} kg`
                    : "-"}
                </TableCell>
                <TableCell>
                  {trailer.volume ? `${trailer.volume} m³` : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`${statusColors[trailer.status]} text-white`}
                  >
                    {statusLabels[trailer.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {trailer.adrClasses ? (
                    <Badge variant="destructive" className="text-xs">
                      ADR
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/trailers/${trailer.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Szczegóły
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(trailer)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {activeTab === "active" ? (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(trailer.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleRestore(trailer.id)}
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
            <Container className="h-8 w-8" />
            Naczepy
          </h1>
          <p className="text-muted-foreground">
            Zarządzanie naczepami i przyczepami
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchTrailers()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odśwież
          </Button>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj naczepę
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Wszystkie naczepy
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
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj po nr rejestracyjnym..."
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
              </div>
            </CardContent>
          </Card>

          {/* Trailers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Aktywne naczepy</CardTitle>
              <CardDescription>
                Znaleziono {pagination.total} naczep
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTrailerTable()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj po nr rejestracyjnym..."
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
              </div>
            </CardContent>
          </Card>

          {/* Trailers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Nieaktywne naczepy</CardTitle>
              <CardDescription>
                Znaleziono {pagination.total} naczep
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTrailerTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTrailer ? "Edytuj naczepę" : "Dodaj nową naczepę"}
            </DialogTitle>
            <DialogDescription>
              {editingTrailer
                ? "Zaktualizuj dane naczepy"
                : "Wypełnij formularz, aby dodać nową naczepę"}
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
                    placeholder="np. WGM2001"
                    required
                  />
                  {formErrors.registrationNumber && (
                    <p className="text-sm text-red-600">{formErrors.registrationNumber}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Typ naczepy *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: TrailerType) =>
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marka</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="np. Krone"
                  />
                </div>
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
                    onValueChange={(value: TrailerStatus) =>
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
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="volume">Pojemność (m³)</Label>
                  <Input
                    id="volume"
                    type="number"
                    value={formData.volume}
                    onChange={(e) =>
                      setFormData({ ...formData, volume: e.target.value })
                    }
                    placeholder="np. 92"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="axles">Liczba osi</Label>
                  <Input
                    id="axles"
                    type="number"
                    value={formData.axles}
                    onChange={(e) =>
                      setFormData({ ...formData, axles: e.target.value })
                    }
                    min={1}
                    max={5}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adrClasses">Klasy ADR (rozdzielone przecinkiem)</Label>
                <Input
                  id="adrClasses"
                  value={formData.adrClasses}
                  onChange={(e) =>
                    setFormData({ ...formData, adrClasses: e.target.value })
                  }
                  placeholder="np. 2, 3, 4.1"
                />
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
                ) : editingTrailer ? (
                  "Zapisz zmiany"
                ) : (
                  "Dodaj naczepę"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
