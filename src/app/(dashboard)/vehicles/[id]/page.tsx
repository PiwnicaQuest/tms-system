"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentUploadDialog, documentTypeLabels } from "@/components/ui/document-upload-dialog";
import { CostAddDialog, costCategoryLabels } from "@/components/ui/cost-add-dialog";
import {
  Truck,
  ArrowLeft,
  Edit,
  Calendar,
  Fuel,
  MapPin,
  User,
  FileText,
  Wrench,
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  RefreshCw,
  Package,
} from "lucide-react";

// Types
type VehicleStatus = "ACTIVE" | "IN_SERVICE" | "INACTIVE" | "OUT_OF_ORDER";
type VehicleType = "TRUCK" | "SEMI_TRAILER" | "VAN" | "SOLO" | "TRAILER";

interface Vehicle {
  id: string;
  registrationNumber: string;
  brand: string | null;
  model: string | null;
  type: VehicleType;
  status: VehicleStatus;
  year: number | null;
  vin: string | null;
  loadCapacity: number | null;
  volume: number | null;
  euroClass: string | null;
  fuelType: string | null;
  currentDriverId: string | null;
  currentTrailerId: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastGpsUpdate: string | null;
  notes: string | null;
  isActive: boolean;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    origin: string;
    destination: string;
    loadingDate: string;
    unloadingDate: string;
  }>;
  costs: Array<{
    id: string;
    category: string;
    amount: number;
    currency: string;
    date: string;
    description: string | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    expiryDate: string | null;
    fileUrl: string | null;
  }>;
  _count: {
    orders: number;
    costs: number;
    documents: number;
    dailyWorkRecords: number;
  };
}

// Status configuration
const statusConfig: Record<VehicleStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Aktywny", color: "bg-emerald-500" },
  IN_SERVICE: { label: "W serwisie", color: "bg-amber-500" },
  INACTIVE: { label: "Nieaktywny", color: "bg-slate-500" },
  OUT_OF_ORDER: { label: "Awaria", color: "bg-red-500" },
};

const typeLabels: Record<VehicleType, string> = {
  TRUCK: "Ciagnik siodlowy",
  SEMI_TRAILER: "Naczepa",
  VAN: "Dostawczy",
  SOLO: "Solowka",
  TRAILER: "Przyczepa",
};

const orderStatusLabels: Record<string, string> = {
  NEW: "Nowe",
  PLANNED: "Zaplanowane",
  ASSIGNED: "Przypisane",
  CONFIRMED: "Potwierdzone",
  ACCEPTED: "Zaakceptowane",
  LOADING: "Zaladunek",
  IN_TRANSIT: "W trasie",
  UNLOADING: "Rozladunek",
  DELIVERED: "Dostarczone",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
  PROBLEM: "Problem",
};

const orderStatusColors: Record<string, string> = {
  NEW: "bg-blue-500",
  PLANNED: "bg-slate-500",
  ASSIGNED: "bg-yellow-500",
  CONFIRMED: "bg-cyan-500",
  ACCEPTED: "bg-teal-500",
  LOADING: "bg-amber-500",
  IN_TRANSIT: "bg-green-500",
  UNLOADING: "bg-purple-500",
  DELIVERED: "bg-emerald-500",
  COMPLETED: "bg-gray-500",
  CANCELLED: "bg-red-500",
  PROBLEM: "bg-orange-500",
};

// Helper functions
function formatMileage(km: number | null): string {
  if (km === null) return "-";
  return km.toLocaleString("pl-PL") + " km";
}

function formatCurrency(amount: number | null, currency: string = "PLN"): string {
  if (amount === null) return "-";
  return amount.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " " + currency;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pl-PL");
}

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VehicleDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);

  // Fetch vehicle function
  const fetchVehicle = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vehicles/${resolvedParams.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Pojazd nie zostal znaleziony");
        } else {
          throw new Error("Failed to fetch vehicle");
        }
        return;
      }

      const data = await response.json();
      setVehicle(data.data);
    } catch (err) {
      console.error("Error fetching vehicle:", err);
      setError("Wystapil blad podczas pobierania pojazdu");
    } finally {
      setLoading(false);
    }
  };

  // Fetch vehicle on mount
  useEffect(() => {
    fetchVehicle();
  }, [resolvedParams.id]);

  // Calculate stats from orders and costs
  const totalCosts = vehicle?.costs?.reduce((sum, c) => sum + c.amount, 0) || 0;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !vehicle) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vehicles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Pojazd</h1>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg">{error || "Nie znaleziono pojazdu"}</p>
            <Button className="mt-4" asChild>
              <Link href="/vehicles">Powrot do listy</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find documents with expiring dates
  const expiringDocuments = vehicle.documents.filter(
    (doc) => doc.expiryDate && (isDateExpiringSoon(doc.expiryDate, 60) || isDateExpired(doc.expiryDate))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vehicles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Truck className="h-8 w-8" />
                {vehicle.registrationNumber}
              </h1>
              <Badge
                variant="secondary"
                className={`${statusConfig[vehicle.status]?.color || "bg-slate-500"} text-white`}
              >
                {statusConfig[vehicle.status]?.label || vehicle.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {vehicle.brand || ""} {vehicle.model || ""} {vehicle.year ? `(${vehicle.year})` : ""}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCostDialog(true)}>
          <Link href={`/vehicles/${vehicle.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edytuj
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ladownosc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {vehicle.loadCapacity ? `${vehicle.loadCapacity.toLocaleString("pl-PL")} kg` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Objetosc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {vehicle.volume ? `${vehicle.volume} m3` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Liczba zlecen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vehicle._count.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Koszty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalCosts)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {expiringDocuments.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Wazne terminy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-2 ${
                  isDateExpired(doc.expiryDate)
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {isDateExpired(doc.expiryDate) ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span className={isDateExpired(doc.expiryDate) ? "font-medium" : ""}>
                  {doc.name} - {isDateExpired(doc.expiryDate) ? "Przeterminowany" : `za ${getDaysUntil(doc.expiryDate)} dni`}
                  ({doc.expiryDate ? formatDate(doc.expiryDate) : ""})
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Szczegoly</TabsTrigger>
          <TabsTrigger value="orders">Zlecenia ({vehicle._count.orders})</TabsTrigger>
          <TabsTrigger value="costs">Koszty ({vehicle._count.costs})</TabsTrigger>
          <TabsTrigger value="documents">Dokumenty ({vehicle._count.documents})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Dane pojazdu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Nr rejestracyjny
                    </p>
                    <p className="font-mono font-medium">
                      {vehicle.registrationNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Typ</p>
                    <p className="font-medium">{typeLabels[vehicle.type] || vehicle.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Marka</p>
                    <p className="font-medium">{vehicle.brand || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{vehicle.model || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rok produkcji</p>
                    <p className="font-medium">{vehicle.year || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">VIN</p>
                    <p className="font-mono text-sm">{vehicle.vin || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paliwo</p>
                    <p className="font-medium">{vehicle.fuelType || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Klasa Euro</p>
                    <p className="font-medium">{vehicle.euroClass || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ladownosc
                    </p>
                    <p className="font-medium">
                      {vehicle.loadCapacity ? `${vehicle.loadCapacity.toLocaleString("pl-PL")} kg` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Objetosc
                    </p>
                    <p className="font-medium">
                      {vehicle.volume ? `${vehicle.volume} m3` : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPS/Location Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Lokalizacja GPS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicle.lastLatitude && vehicle.lastLongitude ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Szerokosc</p>
                        <p className="font-mono">{vehicle.lastLatitude}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dlugosc</p>
                        <p className="font-mono">{vehicle.lastLongitude}</p>
                      </div>
                    </div>
                    {vehicle.lastGpsUpdate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Ostatnia aktualizacja</p>
                        <p className="font-medium">{formatDate(vehicle.lastGpsUpdate)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Brak danych GPS</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {vehicle.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notatki
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ostatnie zlecenia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak zlecen</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr zlecenia</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trasa</TableHead>
                      <TableHead>Zaladunek</TableHead>
                      <TableHead>Rozladunek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${orderStatusColors[order.status] || "bg-slate-500"} text-white`}
                          >
                            {orderStatusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.origin} → {order.destination}
                        </TableCell>
                        <TableCell>{formatDate(order.loadingDate)}</TableCell>
                        <TableCell>{formatDate(order.unloadingDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Koszty
              </CardTitle>
              <Button onClick={() => setShowCostDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj koszt
              </Button>
            </CardHeader>
            <CardContent>
              {vehicle.costs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak zarejestrowanych kosztow</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Kategoria</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead className="text-right">Kwota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.costs.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="font-medium">
                          {formatDate(cost.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{costCategoryLabels[cost.category] || cost.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          {cost.description || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cost.amount, cost.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dokumenty
              </CardTitle>
              <Button onClick={() => setShowDocumentDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj dokument
              </Button>
            </CardHeader>
            <CardContent>
              {vehicle.documents.length === 0 ? (
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
                      <TableHead>Data waznosci</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{documentTypeLabels[doc.type] || doc.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {doc.expiryDate ? (
                            <div className="flex items-center gap-2">
                              {formatDate(doc.expiryDate)}
                              {isDateExpired(doc.expiryDate) && (
                                <Badge variant="destructive" className="text-xs">
                                  Przeterminowany
                                </Badge>
                              )}
                              {!isDateExpired(doc.expiryDate) && isDateExpiringSoon(doc.expiryDate, 60) && (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500 text-white text-xs"
                                >
                                  Wkrotce
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.fileUrl ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                Pobierz
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
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

      {/* Document Upload Dialog */}
      {vehicle && (
        <DocumentUploadDialog
          open={showDocumentDialog}
          onOpenChange={setShowDocumentDialog}
          entityType="vehicle"
          entityId={vehicle.id}
          entityName={vehicle.registrationNumber}
          onSuccess={fetchVehicle}
        />
      )}

      {/* Cost Add Dialog */}
      {vehicle && (
        <CostAddDialog
          open={showCostDialog}
          onOpenChange={setShowCostDialog}
          entityType="vehicle"
          entityId={vehicle.id}
          entityName={vehicle.registrationNumber}
          onSuccess={fetchVehicle}
        />
      )}
    </div>
  );
}
