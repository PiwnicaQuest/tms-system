"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Pencil,
  Trash2,
  Loader2,
  RotateCcw,
  UserX,
  UserCheck,
} from "lucide-react";

// Types matching Prisma schema
type DriverStatus = "ACTIVE" | "ON_LEAVE" | "SICK" | "INACTIVE" | "TERMINATED";
type EmploymentType = "EMPLOYMENT" | "B2B" | "CONTRACT";

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  pesel: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  employmentType: EmploymentType;
  employmentDate: string | null;
  terminationDate: string | null;
  currentVehicleId: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  licenseCategories: string | null;
  adrNumber: string | null;
  adrExpiry: string | null;
  adrClasses: string | null;
  medicalExpiry: string | null;
  status: DriverStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DriverFormData {
  firstName: string;
  lastName: string;
  pesel: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  employmentType: EmploymentType;
  licenseNumber: string;
  licenseExpiry: string;
  licenseCategories: string;
  medicalExpiry: string;
  status: DriverStatus;
}

// Status configuration
const statusConfig: Record<DriverStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Aktywny", color: "bg-emerald-500" },
  ON_LEAVE: { label: "Urlop", color: "bg-blue-500" },
  SICK: { label: "L4", color: "bg-amber-500" },
  INACTIVE: { label: "Nieaktywny", color: "bg-slate-500" },
  TERMINATED: { label: "Zwolniony", color: "bg-red-500" },
};

const employmentTypeLabels: Record<EmploymentType, string> = {
  EMPLOYMENT: "Umowa o prace",
  B2B: "B2B",
  CONTRACT: "Umowa zlecenie",
};

// Helper functions
function isDateExpiringSoon(dateString: string | null, daysThreshold: number = 30): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold && diffDays >= 0;
}

function isDateExpired(dateString: string | null): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

function getDaysUntil(dateString: string | null): number {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString().split("T")[0];
}

const emptyFormData: DriverFormData = {
  firstName: "",
  lastName: "",
  pesel: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  employmentType: "EMPLOYMENT",
  licenseNumber: "",
  licenseExpiry: "",
  licenseCategories: "",
  medicalExpiry: "",
  status: "ACTIVE",
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [tabCounts, setTabCounts] = useState({ active: 0, inactive: 0 });

  // Fetch counts for tabs
  const fetchCounts = useCallback(async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch("/api/drivers?limit=1&isActive=true"),
        fetch("/api/drivers?limit=1&isActive=false"),
      ]);
      const activeData = await activeRes.json();
      const inactiveData = await inactiveRes.json();
      setTabCounts({
        active: activeData.pagination?.total || 0,
        inactive: inactiveData.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      params.set("isActive", activeTab === "active" ? "true" : "false");
      params.set("limit", "100");

      const response = await fetch(`/api/drivers?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setDrivers(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, activeTab]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as "active" | "inactive");
    setStatusFilter("all");
  };

  const handleNew = () => {
    setEditingDriver(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName,
      lastName: driver.lastName,
      pesel: driver.pesel || "",
      phone: driver.phone || "",
      email: driver.email || "",
      address: driver.address || "",
      city: driver.city || "",
      postalCode: driver.postalCode || "",
      employmentType: driver.employmentType,
      licenseNumber: driver.licenseNumber || "",
      licenseExpiry: formatDate(driver.licenseExpiry),
      licenseCategories: driver.licenseCategories || "",
      medicalExpiry: formatDate(driver.medicalExpiry),
      status: driver.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (driver: Driver) => {
    if (!confirm(`Czy na pewno chcesz dezaktywowac kierowce ${driver.firstName} ${driver.lastName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDrivers();
        fetchCounts();
      } else {
        const error = await response.json();
        alert(error.error || "Blad podczas dezaktywacji kierowcy");
      }
    } catch (error) {
      console.error("Error deleting driver:", error);
      alert("Blad podczas dezaktywacji kierowcy");
    }
  };

  const handleRestore = async (driver: Driver) => {
    if (!confirm(`Czy na pewno chcesz przywrocic kierowce ${driver.firstName} ${driver.lastName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, status: "ACTIVE" }),
      });

      if (response.ok) {
        fetchDrivers();
        fetchCounts();
      } else {
        const error = await response.json();
        alert(error.error || "Blad podczas przywracania kierowcy");
      }
    } catch (error) {
      console.error("Error restoring driver:", error);
      alert("Blad podczas przywracania kierowcy");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        pesel: formData.pesel || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        postalCode: formData.postalCode || null,
        licenseNumber: formData.licenseNumber || null,
        licenseExpiry: formData.licenseExpiry || null,
        licenseCategories: formData.licenseCategories || null,
        medicalExpiry: formData.medicalExpiry || null,
      };

      const url = editingDriver
        ? `/api/drivers/${editingDriver.id}`
        : "/api/drivers";
      const method = editingDriver ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchDrivers();
        fetchCounts();
      } else {
        const error = await response.json();
        alert(error.error || "Blad podczas zapisywania kierowcy");
      }
    } catch (error) {
      console.error("Error saving driver:", error);
      alert("Blad podczas zapisywania kierowcy");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation based on active tab
  const stats = activeTab === "active" 
    ? {
        total: drivers.length,
        active: drivers.filter((d) => d.status === "ACTIVE").length,
        onLeave: drivers.filter((d) => d.status === "ON_LEAVE").length,
        sick: drivers.filter((d) => d.status === "SICK").length,
      }
    : {
        total: drivers.length,
        inactive: drivers.filter((d) => d.status === "INACTIVE").length,
        terminated: drivers.filter((d) => d.status === "TERMINATED").length,
      };

  // Get available status options based on tab
  const getStatusOptions = () => {
    if (activeTab === "active") {
      return [
        { value: "ACTIVE", label: "Aktywni" },
        { value: "ON_LEAVE", label: "Na urlopie" },
        { value: "SICK", label: "L4" },
      ];
    }
    return [
      { value: "INACTIVE", label: "Nieaktywni" },
      { value: "TERMINATED", label: "Zwolnieni" },
    ];
  };

  // Render driver table
  const renderDriverTable = () => (
    <>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {activeTab === "active"
            ? "Nie znaleziono aktywnych kierowcow"
            : "Brak nieaktywnych kierowcow"}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kierowca</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Forma zatrudnienia</TableHead>
              <TableHead>Prawo jazdy</TableHead>
              <TableHead>Terminy</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {driver.firstName[0]}
                        {driver.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/drivers/${driver.id}`}
                        className="font-medium hover:underline"
                      >
                        {driver.firstName} {driver.lastName}
                      </Link>
                      {driver.city && (
                        <p className="text-sm text-muted-foreground">
                          {driver.city}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {driver.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {driver.phone}
                      </div>
                    )}
                    {driver.email && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {driver.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`${statusConfig[driver.status].color} text-white`}
                  >
                    {statusConfig[driver.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {employmentTypeLabels[driver.employmentType]}
                </TableCell>
                <TableCell>
                  <div>
                    {driver.licenseNumber && (
                      <p className="font-mono text-sm">{driver.licenseNumber}</p>
                    )}
                    {driver.licenseCategories && (
                      <div className="flex gap-1 mt-1">
                        {driver.licenseCategories.split(",").map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {cat.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {isDateExpired(driver.licenseExpiry) && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Prawo jazdy!
                      </div>
                    )}
                    {isDateExpiringSoon(driver.licenseExpiry) && !isDateExpired(driver.licenseExpiry) && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Calendar className="h-3 w-3" />
                        PJ: {getDaysUntil(driver.licenseExpiry)} dni
                      </div>
                    )}
                    {isDateExpiringSoon(driver.medicalExpiry) && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Calendar className="h-3 w-3" />
                        Badania: {getDaysUntil(driver.medicalExpiry)} dni
                      </div>
                    )}
                    {!isDateExpired(driver.licenseExpiry) &&
                      !isDateExpiringSoon(driver.licenseExpiry) &&
                      !isDateExpiringSoon(driver.medicalExpiry) && (
                        <span className="text-xs text-muted-foreground">OK</span>
                      )}
                  </div>
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
                        <Link href={`/drivers/${driver.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Szczegoly
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(driver)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      {activeTab === "active" ? (
                        <DropdownMenuItem
                          onClick={() => handleDelete(driver)}
                          className="text-red-600"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Dezaktywuj
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleRestore(driver)}
                          className="text-emerald-600"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Przywroc
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
    </>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Kierowcy
          </h1>
          <p className="text-muted-foreground">
            Zarzadzanie kierowcami firmy
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj kierowce
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Aktywni ({tabCounts.active})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-2">
            <UserX className="h-4 w-4" />
            Nieaktywni ({tabCounts.inactive})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Stats Cards for Active */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Wszyscy aktywni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Pracujacy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{"active" in stats ? stats.active : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Na urlopie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{"onLeave" in stats ? stats.onLeave : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Zwolnienie lekarskie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{"sick" in stats ? stats.sick : 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj po imieniu, nazwisku, nr prawa jazdy..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                    {getStatusOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Drivers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista aktywnych kierowcow</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDriverTable()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {/* Stats Cards for Inactive */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Wszyscy nieaktywni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-500" />
                  Nieaktywni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{"inactive" in stats ? stats.inactive : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Zwolnieni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{"terminated" in stats ? stats.terminated : 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj po imieniu, nazwisku..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                    {getStatusOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Drivers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista nieaktywnych kierowcow</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDriverTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? "Edytuj kierowce" : "Dodaj kierowce"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imie *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pesel">PESEL</Label>
                <Input
                  id="pesel"
                  value={formData.pesel}
                  onChange={(e) =>
                    setFormData({ ...formData, pesel: e.target.value })
                  }
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Kod pocztowy</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Miasto</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employmentType">Forma zatrudnienia</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value: EmploymentType) =>
                    setFormData({ ...formData, employmentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYMENT">Umowa o prace</SelectItem>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="CONTRACT">Umowa zlecenie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: DriverStatus) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktywny</SelectItem>
                    <SelectItem value="ON_LEAVE">Na urlopie</SelectItem>
                    <SelectItem value="SICK">L4</SelectItem>
                    <SelectItem value="INACTIVE">Nieaktywny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Dokumenty</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Numer prawa jazdy</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, licenseNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseCategories">Kategorie (np. C, C+E)</Label>
                  <Input
                    id="licenseCategories"
                    value={formData.licenseCategories}
                    onChange={(e) =>
                      setFormData({ ...formData, licenseCategories: e.target.value })
                    }
                    placeholder="C, C+E"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseExpiry">Waznosc prawa jazdy</Label>
                  <Input
                    id="licenseExpiry"
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) =>
                      setFormData({ ...formData, licenseExpiry: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicalExpiry">Waznosc badan lekarskich</Label>
                  <Input
                    id="medicalExpiry"
                    type="date"
                    value={formData.medicalExpiry}
                    onChange={(e) =>
                      setFormData({ ...formData, medicalExpiry: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDriver ? "Zapisz zmiany" : "Dodaj kierowce"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
