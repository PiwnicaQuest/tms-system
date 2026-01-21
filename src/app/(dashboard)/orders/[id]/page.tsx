"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  Truck,
  Building2,
  FileText,
  DollarSign,
  RefreshCw,
  MoreHorizontal,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Download,
  Users,
} from "lucide-react";
import { OrderAssignmentsList } from "@/components/orders/assignments";

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
  PLANNED: "bg-slate-500",
  ASSIGNED: "bg-blue-500",
  CONFIRMED: "bg-cyan-500",
  LOADING: "bg-amber-500",
  IN_TRANSIT: "bg-emerald-500",
  UNLOADING: "bg-amber-500",
  COMPLETED: "bg-green-600",
  CANCELLED: "bg-red-500",
  PROBLEM: "bg-orange-500",
};

// Status icons
const statusIcons: Record<OrderStatus, typeof CheckCircle2> = {
  PLANNED: Clock,
  ASSIGNED: User,
  CONFIRMED: CheckCircle2,
  LOADING: Package,
  IN_TRANSIT: Truck,
  UNLOADING: Package,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  PROBLEM: AlertTriangle,
};

interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;
  externalNumber: string | null;
  type: "OWN" | "FORWARDING";
  status: OrderStatus;
  contractorId: string | null;
  subcontractorId: string | null;
  vehicleId: string | null;
  trailerId: string | null;
  driverId: string | null;
  origin: string;
  originCity: string | null;
  originCountry: string;
  destination: string;
  destinationCity: string | null;
  destinationCountry: string;
  distanceKm: number | null;
  loadingDate: string;
  loadingTimeFrom: string | null;
  loadingTimeTo: string | null;
  unloadingDate: string;
  unloadingTimeFrom: string | null;
  unloadingTimeTo: string | null;
  cargoDescription: string | null;
  cargoWeight: number | null;
  cargoVolume: number | null;
  cargoPallets: number | null;
  cargoValue: number | null;
  requiresAdr: boolean;
  priceNet: number | null;
  currency: string;
  costNet: number | null;
  flatRateKm: number | null;
  flatRateOverage: number | null;
  kmLimit: number | null;
  kmOverageRate: number | null;
  notes: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  contractor: {
    id: string;
    name: string;
    shortName: string | null;
    nip: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  subcontractor: {
    id: string;
    name: string;
    shortName: string | null;
  } | null;
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  vehicle: {
    id: string;
    registrationNumber: string;
    type: string;
    brand: string | null;
    model: string | null;
  } | null;
  trailer: {
    id: string;
    registrationNumber: string;
    type: string;
  } | null;
  waypoints: Array<{
    id: string;
    sequence: number;
    type: "LOADING" | "UNLOADING" | "STOP";
    address: string;
    city: string | null;
    country: string;
    scheduledDate: string | null;
    scheduledTime: string | null;
    notes: string | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    fileUrl: string;
    createdAt: string;
  }>;
  dailyWorkRecords: Array<{
    id: string;
    date: string;
    allocatedAmount: number;
    driver: {
      id: string;
      firstName: string;
      lastName: string;
    };
    vehicle: {
      id: string;
      registrationNumber: string;
    };
  }>;
  assignments: Array<{
    id: string;
    driverId: string;
    vehicleId: string | null;
    trailerId: string | null;
    startDate: string;
    endDate: string | null;
    revenueShare: number;
    allocatedAmount: number | null;
    distanceKm: number | null;
    reason: "INITIAL" | "DRIVER_ILLNESS" | "DRIVER_VACATION" | "VEHICLE_BREAKDOWN" | "VEHICLE_SERVICE" | "SCHEDULE_CONFLICT" | "CLIENT_REQUEST" | "OPTIMIZATION" | "OTHER";
    reasonNote: string | null;
    isPrimary: boolean;
    isActive: boolean;
    driver: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    };
    vehicle: {
      id: string;
      registrationNumber: string;
      brand: string | null;
      model: string | null;
    } | null;
    trailer: {
      id: string;
      registrationNumber: string;
    } | null;
  }>;
}

// Country names
const countryNames: Record<string, string> = {
  PL: "Polska",
  DE: "Niemcy",
  CZ: "Czechy",
  SK: "Slowacja",
  AT: "Austria",
  NL: "Holandia",
  BE: "Belgia",
  FR: "Francja",
  IT: "Wlochy",
  ES: "Hiszpania",
  GB: "Wielka Brytania",
  DK: "Dania",
  SE: "Szwecja",
  HU: "Wegry",
  RO: "Rumunia",
  BG: "Bulgaria",
  LT: "Litwa",
  LV: "Lotwa",
  EE: "Estonia",
};

// Status flow for next actions
const statusFlow: Record<OrderStatus, OrderStatus[]> = {
  PLANNED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["CONFIRMED", "PLANNED", "CANCELLED"],
  CONFIRMED: ["LOADING", "ASSIGNED", "CANCELLED", "PROBLEM"],
  LOADING: ["IN_TRANSIT", "CONFIRMED", "PROBLEM"],
  IN_TRANSIT: ["UNLOADING", "LOADING", "PROBLEM"],
  UNLOADING: ["COMPLETED", "IN_TRANSIT", "PROBLEM"],
  COMPLETED: ["PROBLEM"],
  CANCELLED: ["PLANNED"],
  PROBLEM: [
    "PLANNED",
    "ASSIGNED",
    "CONFIRMED",
    "LOADING",
    "IN_TRANSIT",
    "UNLOADING",
    "COMPLETED",
    "CANCELLED",
  ],
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order
  const fetchOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Zlecenie nie zostalo znalezione");
        } else {
          throw new Error("Failed to fetch order");
        }
        return;
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Wystapil blad podczas pobierania zlecenia");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [resolvedParams.id]);

  // Refresh order data
  const handleRefresh = () => {
    fetchOrder();
  };

  // Handle status change
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas zmiany statusu");
        return;
      }

      const updatedOrder = await response.json();
      setOrder({ ...order, ...updatedOrder });
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Wystapil blad podczas zmiany statusu");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!order) return;
    if (!confirm("Czy na pewno chcesz usunac to zlecenie?")) return;

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas usuwania zlecenia");
        return;
      }

      router.push("/orders");
    } catch (err) {
      console.error("Error deleting order:", err);
      alert("Wystapil blad podczas usuwania zlecenia");
    }
  };

  // Handle CMR download
  const handleDownloadCMR = async () => {
    if (!order) return;

    try {
      const response = await fetch(`/api/orders/${order.id}/cmr`);

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas generowania CMR");
        return;
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CMR-${order.orderNumber.replace(/[/\\]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading CMR:", err);
      alert("Wystapil blad podczas pobierania CMR");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Format short date
  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format price
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return "-";
    return `${price.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  // Format time range
  const formatTimeRange = (from: string | null, to: string | null) => {
    if (!from && !to) return null;
    if (from && to) return `${from} - ${to}`;
    return from || to;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Zlecenie</h1>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg">{error || "Nie znaleziono zlecenia"}</p>
            <Button className="mt-4" asChild>
              <Link href="/orders">Powrot do listy</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusIcons[order.status];
  const nextStatuses = statusFlow[order.status];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
              <Badge
                className={`${statusColors[order.status]} text-white px-3 py-1`}
              >
                <StatusIcon className="mr-1 h-4 w-4" />
                {statusLabels[order.status]}
              </Badge>
            </div>
            {order.externalNumber && (
              <p className="text-muted-foreground">
                Nr zewnetrzny: {order.externalNumber}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Zmien status
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {nextStatuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${statusColors[status]}`}
                  />
                  {statusLabels[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={handleDownloadCMR}>
            <FileText className="mr-2 h-4 w-4" />
            Pobierz CMR
          </Button>

          <Button variant="outline" asChild>
            <Link href={`/orders/${order.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadCMR}>
                <Download className="mr-2 h-4 w-4" />
                Pobierz CMR
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <FileText className="mr-2 h-4 w-4" />
                Drukuj
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usun zlecenie
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {(
              [
                "PLANNED",
                "ASSIGNED",
                "CONFIRMED",
                "LOADING",
                "IN_TRANSIT",
                "UNLOADING",
                "COMPLETED",
              ] as OrderStatus[]
            ).map((status, index, arr) => {
              const Icon = statusIcons[status];
              const isCurrent = order.status === status;
              const isPast =
                arr.indexOf(order.status) > index ||
                order.status === "COMPLETED";
              const isCancelled = order.status === "CANCELLED";
              const isProblem = order.status === "PROBLEM";

              return (
                <div
                  key={status}
                  className={`flex flex-col items-center gap-1 ${
                    index < arr.length - 1 ? "flex-1" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCancelled || isProblem
                        ? "bg-muted text-muted-foreground"
                        : isCurrent
                        ? statusColors[status] + " text-white"
                        : isPast
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs text-center ${
                      isCurrent ? "font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {statusLabels[status]}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Szczegoly</TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="mr-2 h-4 w-4" />
            Przypisania ({order.assignments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Dokumenty ({order.documents.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Rozliczenia ({order.dailyWorkRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Route Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Trasa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Loading */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <div className="w-3 h-3 rounded-full bg-green-600" />
                    Zaladunek
                  </div>
                  <div className="pl-5 space-y-1">
                    <p className="font-medium">{order.origin}</p>
                    {order.originCity && (
                      <p className="text-muted-foreground">
                        {order.originCity},{" "}
                        {countryNames[order.originCountry] ||
                          order.originCountry}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(order.loadingDate)}
                      {formatTimeRange(
                        order.loadingTimeFrom,
                        order.loadingTimeTo
                      ) && (
                        <>
                          <span className="text-muted-foreground">|</span>
                          {formatTimeRange(
                            order.loadingTimeFrom,
                            order.loadingTimeTo
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Waypoints */}
                {order.waypoints.length > 0 && (
                  <div className="space-y-4">
                    {order.waypoints.map((waypoint, index) => (
                      <div key={waypoint.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold">
                          <div className="w-3 h-3 rounded-full border-2 border-blue-600" />
                          Punkt {index + 1} -{" "}
                          {waypoint.type === "LOADING"
                            ? "Zaladunek"
                            : waypoint.type === "UNLOADING"
                            ? "Rozladunek"
                            : "Postoj"}
                        </div>
                        <div className="pl-5 space-y-1">
                          <p className="font-medium">{waypoint.address}</p>
                          {waypoint.city && (
                            <p className="text-muted-foreground">
                              {waypoint.city},{" "}
                              {countryNames[waypoint.country] ||
                                waypoint.country}
                            </p>
                          )}
                          {waypoint.scheduledDate && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatShortDate(waypoint.scheduledDate)}
                              {waypoint.scheduledTime && (
                                <>
                                  <span className="text-muted-foreground">
                                    |
                                  </span>
                                  {waypoint.scheduledTime}
                                </>
                              )}
                            </div>
                          )}
                          {waypoint.notes && (
                            <p className="text-sm text-muted-foreground">
                              {waypoint.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Unloading */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600 font-semibold">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    Rozladunek
                  </div>
                  <div className="pl-5 space-y-1">
                    <p className="font-medium">{order.destination}</p>
                    {order.destinationCity && (
                      <p className="text-muted-foreground">
                        {order.destinationCity},{" "}
                        {countryNames[order.destinationCountry] ||
                          order.destinationCountry}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(order.unloadingDate)}
                      {formatTimeRange(
                        order.unloadingTimeFrom,
                        order.unloadingTimeTo
                      ) && (
                        <>
                          <span className="text-muted-foreground">|</span>
                          {formatTimeRange(
                            order.unloadingTimeFrom,
                            order.unloadingTimeTo
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {order.distanceKm && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dystans</span>
                      <span className="font-medium">{order.distanceKm} km</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Assignment Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Przypisanie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Typ zlecenia</span>
                  <Badge variant="outline">
                    {order.type === "OWN" ? "Wlasny transport" : "Spedycja"}
                  </Badge>
                </div>

                <Separator />

                {/* Driver */}
                <div className="space-y-2">
                  <span className="text-muted-foreground text-sm">
                    Kierowca
                  </span>
                  {order.driver ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {order.driver.firstName} {order.driver.lastName}
                        </p>
                        {order.driver.phone && (
                          <p className="text-sm text-muted-foreground">
                            {order.driver.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nieprzypisany</p>
                  )}
                </div>

                <Separator />

                {/* Vehicle */}
                <div className="space-y-2">
                  <span className="text-muted-foreground text-sm">Pojazd</span>
                  {order.vehicle ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {order.vehicle.registrationNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.vehicle.brand} {order.vehicle.model}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nieprzypisany</p>
                  )}
                </div>

                {/* Trailer */}
                {order.trailer && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-sm">
                        Naczepa
                      </span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {order.trailer.registrationNumber}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}

                {/* Subcontractor (for forwarding) */}
                {order.type === "FORWARDING" && order.subcontractor && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-sm">
                        Przewoznik / Podwykonawca
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {order.subcontractor.shortName ||
                              order.subcontractor.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Client Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Klient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.contractor ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-lg">
                        {order.contractor.name}
                      </p>
                      {order.contractor.shortName && (
                        <p className="text-muted-foreground">
                          ({order.contractor.shortName})
                        </p>
                      )}
                    </div>
                    {order.contractor.nip && (
                      <div>
                        <span className="text-muted-foreground text-sm">
                          NIP
                        </span>
                        <p>{order.contractor.nip}</p>
                      </div>
                    )}
                    <div className="flex gap-6">
                      {order.contractor.phone && (
                        <div>
                          <span className="text-muted-foreground text-sm">
                            Telefon
                          </span>
                          <p>{order.contractor.phone}</p>
                        </div>
                      )}
                      {order.contractor.email && (
                        <div>
                          <span className="text-muted-foreground text-sm">
                            Email
                          </span>
                          <p>{order.contractor.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Brak przypisanego klienta
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cargo Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Ladunek
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.cargoDescription && (
                  <div>
                    <span className="text-muted-foreground text-sm">Opis</span>
                    <p>{order.cargoDescription}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {order.cargoWeight && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Waga
                      </span>
                      <p className="font-medium">
                        {order.cargoWeight.toLocaleString("pl-PL")} kg
                      </p>
                    </div>
                  )}
                  {order.cargoVolume && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Objetosc
                      </span>
                      <p className="font-medium">{order.cargoVolume} m3</p>
                    </div>
                  )}
                  {order.cargoPallets && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Palety
                      </span>
                      <p className="font-medium">{order.cargoPallets} szt.</p>
                    </div>
                  )}
                  {order.cargoValue && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Wartosc
                      </span>
                      <p className="font-medium">
                        {formatPrice(order.cargoValue, order.currency)}
                      </p>
                    </div>
                  )}
                </div>

                {order.requiresAdr && (
                  <Badge variant="destructive" className="mt-2">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Wymaga ADR
                  </Badge>
                )}

                {!order.cargoDescription &&
                  !order.cargoWeight &&
                  !order.cargoVolume &&
                  !order.cargoPallets && (
                    <p className="text-muted-foreground text-center py-4">
                      Brak informacji o ladunku
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Ceny i rozliczenie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-4">
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-sm">
                      Cena netto
                    </span>
                    <p className="text-2xl font-bold">
                      {formatPrice(order.priceNet, order.currency)}
                    </p>
                  </div>

                  {order.type === "FORWARDING" && order.costNet && (
                    <>
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-sm">
                          Koszt przewoznika
                        </span>
                        <p className="text-2xl font-bold text-red-600">
                          {formatPrice(order.costNet, order.currency)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-sm">
                          Marza
                        </span>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(
                            (order.priceNet || 0) - (order.costNet || 0),
                            order.currency
                          )}
                        </p>
                      </div>
                    </>
                  )}

                  {order.flatRateKm && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-sm">
                        Stawka ryczaltowa/km
                      </span>
                      <p className="text-xl font-semibold">
                        {order.flatRateKm} {order.currency}
                      </p>
                    </div>
                  )}
                </div>

                {(order.kmLimit ||
                  order.kmOverageRate ||
                  order.flatRateOverage) && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid gap-4 md:grid-cols-3">
                      {order.kmLimit && (
                        <div>
                          <span className="text-muted-foreground text-sm">
                            Limit km
                          </span>
                          <p className="font-medium">{order.kmLimit} km</p>
                        </div>
                      )}
                      {order.kmOverageRate && (
                        <div>
                          <span className="text-muted-foreground text-sm">
                            Stawka powyzej limitu
                          </span>
                          <p className="font-medium">
                            {order.kmOverageRate} {order.currency}/km
                          </p>
                        </div>
                      )}
                      {order.flatRateOverage && (
                        <div>
                          <span className="text-muted-foreground text-sm">
                            Doplata
                          </span>
                          <p className="font-medium">
                            {formatPrice(
                              order.flatRateOverage,
                              order.currency
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes Card */}
            {(order.notes || order.internalNotes) && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Uwagi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.notes && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Uwagi dla klienta
                      </span>
                      <p className="whitespace-pre-wrap">{order.notes}</p>
                    </div>
                  )}
                  {order.internalNotes && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Uwagi wewnetrzne
                      </span>
                      <p className="whitespace-pre-wrap bg-muted p-3 rounded-md">
                        {order.internalNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <OrderAssignmentsList
            orderId={order.id}
            orderLoadingDate={order.loadingDate}
            orderUnloadingDate={order.unloadingDate}
            orderPrice={order.priceNet}
            assignments={order.assignments || []}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Dokumenty</CardTitle>
              <CardDescription>
                Dokumenty powiazane ze zleceniem
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak dokumentow</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Data dodania</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{formatShortDate(doc.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Pobierz
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Rozliczenia dzienne</CardTitle>
              <CardDescription>
                Historia alokacji przychodu z tego zlecenia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.dailyWorkRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak rekordow rozliczen</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Kierowca</TableHead>
                      <TableHead>Pojazd</TableHead>
                      <TableHead className="text-right">Kwota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.dailyWorkRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatShortDate(record.date)}</TableCell>
                        <TableCell>
                          {record.driver.firstName} {record.driver.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.vehicle.registrationNumber}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {record.allocatedAmount.toLocaleString("pl-PL")} PLN
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Utworzono:{" "}
              {new Date(order.createdAt).toLocaleString("pl-PL")}
            </span>
            <span>
              Ostatnia aktualizacja:{" "}
              {new Date(order.updatedAt).toLocaleString("pl-PL")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
