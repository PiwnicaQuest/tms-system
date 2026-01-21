"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Loader2,
  UserX,
  UserCheck,
  ChevronDown,
  ChevronRight,
  StickyNote,
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
  notes: string;
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
  EMPLOYMENT: "Umowa o pracę",
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

function formatDisplayDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("pl-PL");
}

function formatNoteDate(): string {
  return new Date().toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  notes: "",
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [terminatedDrivers, setTerminatedDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTerminated, setLoadingTerminated] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  // Termination dialog state
  const [terminationDialogOpen, setTerminationDialogOpen] = useState(false);
  const [driverToTerminate, setDriverToTerminate] = useState<Driver | null>(null);
  const [terminationDate, setTerminationDate] = useState(formatDate(new Date().toISOString()));
  const [terminationNote, setTerminationNote] = useState("");
  const [terminating, setTerminating] = useState(false);

  // Restore dialog state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [driverToRestore, setDriverToRestore] = useState<Driver | null>(null);
  const [restoreNote, setRestoreNote] = useState("");
  const [restoring, setRestoring] = useState(false);

  // Terminated section expanded state
  const [terminatedExpanded, setTerminatedExpanded] = useState(false);

  // Fetch active drivers
  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      // Filter out TERMINATED drivers
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "100");

      const response = await fetch(`/api/drivers?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        // Filter out terminated drivers on client side as well
        const activeDrivers = (result.data || []).filter(
          (d: Driver) => d.status !== "TERMINATED"
        );
        setDrivers(activeDrivers);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Fetch terminated drivers
  const fetchTerminatedDrivers = useCallback(async () => {
    try {
      setLoadingTerminated(true);
      const params = new URLSearchParams();
      params.set("status", "TERMINATED");
      params.set("limit", "100");

      const response = await fetch(`/api/drivers?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setTerminatedDrivers(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching terminated drivers:", error);
    } finally {
      setLoadingTerminated(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    fetchTerminatedDrivers();
  }, [fetchDrivers, fetchTerminatedDrivers]);

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
      notes: driver.notes || "",
    });
    setDialogOpen(true);
  };

  // Open termination dialog
  const handleTerminateClick = (driver: Driver) => {
    setDriverToTerminate(driver);
    setTerminationDate(formatDate(new Date().toISOString()));
    setTerminationNote("");
    setTerminationDialogOpen(true);
  };

  // Execute termination
  const handleTerminate = async () => {
    if (!driverToTerminate) return;

    setTerminating(true);
    try {
      // Build updated notes with termination info
      const existingNotes = driverToTerminate.notes || "";
      const terminationEntry = `[${formatNoteDate()}] ZWOLNIENIE: ${terminationNote || "Brak podanego powodu"}`;
      const updatedNotes = existingNotes
        ? `${terminationEntry}\n\n${existingNotes}`
        : terminationEntry;

      const response = await fetch(`/api/drivers/${driverToTerminate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TERMINATED",
          terminationDate: terminationDate,
          isActive: false,
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        setTerminationDialogOpen(false);
        setDriverToTerminate(null);
        setTerminationNote("");
        fetchDrivers();
        fetchTerminatedDrivers();
      } else {
        const error = await response.json();
        alert(error.error || "Błąd podczas zwalniania kierowcy");
      }
    } catch (error) {
      console.error("Error terminating driver:", error);
      alert("Błąd podczas zwalniania kierowcy");
    } finally {
      setTerminating(false);
    }
  };

  // Open restore dialog
  const handleRestoreClick = (driver: Driver) => {
    setDriverToRestore(driver);
    setRestoreNote("");
    setRestoreDialogOpen(true);
  };

  // Execute restore
  const handleRestore = async () => {
    if (!driverToRestore) return;

    setRestoring(true);
    try {
      // Build updated notes with restore info
      const existingNotes = driverToRestore.notes || "";
      const restoreEntry = `[${formatNoteDate()}] PRZYWROCENIE: ${restoreNote || "Przywrócony do pracy"}`;
      const updatedNotes = existingNotes
        ? `${restoreEntry}\n\n${existingNotes}`
        : restoreEntry;

      const response = await fetch(`/api/drivers/${driverToRestore.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ACTIVE",
          terminationDate: null,
          isActive: true,
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        setRestoreDialogOpen(false);
        setDriverToRestore(null);
        setRestoreNote("");
        fetchDrivers();
        fetchTerminatedDrivers();
      } else {
        const error = await response.json();
        alert(error.error || "Błąd podczas przywracania kierowcy");
      }
    } catch (error) {
      console.error("Error restoring driver:", error);
      alert("Błąd podczas przywracania kierowcy");
    } finally {
      setRestoring(false);
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
        notes: formData.notes || null,
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
        fetchTerminatedDrivers();
      } else {
        const error = await response.json();
        alert(error.error || "Błąd podczas zapisywania kierowcy");
      }
    } catch (error) {
      console.error("Error saving driver:", error);
      alert("Błąd podczas zapisywania kierowcy");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const stats = {
    total: drivers.length + terminatedDrivers.length,
    active: drivers.filter((d) => d.status === "ACTIVE").length,
    onLeave: drivers.filter((d) => d.status === "ON_LEAVE").length,
    sick: drivers.filter((d) => d.status === "SICK").length,
    terminated: terminatedDrivers.length,
  };

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
            Zarządzanie kierowcami firmy
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj kierowcę
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Wszyscy kierowcy
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
              Aktywni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.active}</p>
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
            <p className="text-2xl font-bold">{stats.onLeave}</p>
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
            <p className="text-2xl font-bold">{stats.sick}</p>
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
            <p className="text-2xl font-bold">{stats.terminated}</p>
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
                <SelectItem value="ACTIVE">Aktywni</SelectItem>
                <SelectItem value="ON_LEAVE">Na urlopie</SelectItem>
                <SelectItem value="SICK">L4</SelectItem>
                <SelectItem value="INACTIVE">Nieaktywni</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            Aktywni kierowcy ({drivers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak kierowców do wyświetlenia
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
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/drivers/${driver.id}`}
                              className="font-medium hover:underline"
                            >
                              {driver.firstName} {driver.lastName}
                            </Link>
                            {driver.notes && (
                              <span title="Posiada notatki"><StickyNote className="h-3 w-3 text-amber-500" /></span>
                            )}
                          </div>
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
                              Szczegóły
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(driver)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTerminateClick(driver)}
                            className="text-red-600"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Zwolnij
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Terminated Drivers Section */}
      <Collapsible open={terminatedExpanded} onOpenChange={setTerminatedExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  Zwolnieni kierowcy ({terminatedDrivers.length})
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm font-normal">
                    {terminatedExpanded ? "Zwiń" : "Rozwiń"}
                  </span>
                  {terminatedExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {loadingTerminated ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : terminatedDrivers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Brak zwolnionych kierowców
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kierowca</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Forma zatrudnienia</TableHead>
                      <TableHead>Data zatrudnienia</TableHead>
                      <TableHead>Data zwolnienia</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terminatedDrivers.map((driver) => (
                      <TableRow key={driver.id} className="bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-red-600">
                                {driver.firstName[0]}
                                {driver.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/drivers/${driver.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {driver.firstName} {driver.lastName}
                                </Link>
                                {driver.notes && (
                                  <span title="Posiada notatki"><StickyNote className="h-3 w-3 text-amber-500" /></span>
                                )}
                              </div>
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
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
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
                        <TableCell className="text-muted-foreground">
                          {employmentTypeLabels[driver.employmentType]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDisplayDate(driver.employmentDate)}
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">
                            {formatDisplayDate(driver.terminationDate)}
                          </span>
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
                                  Szczegóły
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRestoreClick(driver)}
                                className="text-emerald-600"
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Przywróć
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? "Edytuj kierowcę" : "Dodaj kierowcę"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię *</Label>
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
                    <SelectItem value="EMPLOYMENT">Umowa o pracę</SelectItem>
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
                  <Label htmlFor="licenseExpiry">Ważność prawa jazdy</Label>
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
                  <Label htmlFor="medicalExpiry">Ważność badań lekarskich</Label>
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
            {/* Notes Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Notatki
              </h4>
              <div className="space-y-2">
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Dodatkowe informacje o kierowcy..."
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Notatki sa widoczne tylko dla pracownikow biura. Historia zmian statusu jest zapisywana automatycznie.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDriver ? "Zapisz zmiany" : "Dodaj kierowcę"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Termination Dialog */}
      <Dialog open={terminationDialogOpen} onOpenChange={setTerminationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="h-5 w-5" />
              Zwolnienie kierowcy
            </DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz zwolnić kierowcę{" "}
              <span className="font-semibold">
                {driverToTerminate?.firstName} {driverToTerminate?.lastName}
              </span>
              ? Kierowca zostanie przeniesiony do listy zwolnionych.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="terminationDate">Data zwolnienia</Label>
              <Input
                id="terminationDate"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminationNote">Powód zwolnienia / Notatka</Label>
              <Textarea
                id="terminationNote"
                value={terminationNote}
                onChange={(e) => setTerminationNote(e.target.value)}
                placeholder="Podaj powód zwolnienia lub dodatkowe informacje..."
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Notatka zostanie zapisana w profilu kierowcy z data i oznaczeniem &quot;ZWOLNIENIE&quot;.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTerminationDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating}
            >
              {terminating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zwolnij kierowcę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <UserCheck className="h-5 w-5" />
              Przywrócenie kierowcy
            </DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz przywrócić kierowcę{" "}
              <span className="font-semibold">
                {driverToRestore?.firstName} {driverToRestore?.lastName}
              </span>
              ? Kierowca zostanie przeniesiony do listy aktywnych ze statusem
              &quot;Aktywny&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restoreNote">Notatka (opcjonalnie)</Label>
              <Textarea
                id="restoreNote"
                value={restoreNote}
                onChange={(e) => setRestoreNote(e.target.value)}
                placeholder="Dodatkowe informacje o przywróceniu..."
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Notatka zostanie zapisana w profilu kierowcy z data i oznaczeniem &quot;PRZYWROCENIE&quot;.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleRestore}
              disabled={restoring}
            >
              {restoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Przywróć kierowcę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
