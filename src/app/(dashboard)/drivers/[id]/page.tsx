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
import {
  Users,
  ArrowLeft,
  Edit,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  CreditCard,
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  Truck,
  Briefcase,
  Award,
  Plus,
  RefreshCw,
  Package,
} from "lucide-react";

// Types
type DriverStatus = "ACTIVE" | "ON_LEAVE" | "SICK_LEAVE" | "INACTIVE" | "TERMINATED";
type EmploymentType = "EMPLOYMENT" | "B2B" | "CONTRACT";

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  pesel: string | null;
  dateOfBirth: string | null;
  status: DriverStatus;
  employmentType: EmploymentType;
  employmentDate: string | null;
  terminationDate: string | null;
  currentVehicleId: string | null;
  licenseNumber: string | null;
  licenseCategories: string | null;
  licenseExpiry: string | null;
  adrNumber: string | null;
  adrExpiry: string | null;
  adrClasses: string | null;
  medicalExpiry: string | null;
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
    priceNet: number | null;
    currency: string;
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
  driverMonthlyReports: Array<{
    id: string;
    year: number;
    month: number;
    workDays: number;
    totalRevenue: number | null;
    totalOrders: number;
    avgDailyRevenue: number | null;
    isFinalized: boolean;
  }>;
  _count: {
    orders: number;
    costs: number;
    documents: number;
    dailyWorkRecords: number;
  };
  expiryWarnings: Array<{
    type: string;
    expiryDate: string;
    daysUntilExpiry: number;
    isExpired: boolean;
  }>;
}

// Status configuration
const statusConfig: Record<DriverStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Aktywny", color: "bg-emerald-500" },
  ON_LEAVE: { label: "Urlop", color: "bg-blue-500" },
  SICK_LEAVE: { label: "L4", color: "bg-amber-500" },
  INACTIVE: { label: "Nieaktywny", color: "bg-slate-500" },
  TERMINATED: { label: "Zwolniony", color: "bg-red-500" },
};

const employmentTypeLabels: Record<EmploymentType, string> = {
  EMPLOYMENT: "Umowa o prace",
  B2B: "B2B",
  CONTRACT: "Umowa zlecenie",
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

const monthNames = [
  "Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec",
  "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"
];

// Helper functions
function formatCurrency(amount: number | null, currency: string = "PLN"): string {
  if (amount === null) return "-";
  return amount.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " " + currency;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
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

function calculateYearsOfService(hireDate: string | null): number {
  if (!hireDate) return 0;
  const hire = new Date(hireDate);
  const today = new Date();
  const years = today.getFullYear() - hire.getFullYear();
  return years;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DriverDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch driver
  useEffect(() => {
    const fetchDriver = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/drivers/${resolvedParams.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Kierowca nie zostal znaleziony");
          } else {
            throw new Error("Failed to fetch driver");
          }
          return;
        }

        const data = await response.json();
        setDriver(data.data);
      } catch (err) {
        console.error("Error fetching driver:", err);
        setError("Wystapil blad podczas pobierania kierowcy");
      } finally {
        setLoading(false);
      }
    };

    fetchDriver();
  }, [resolvedParams.id]);

  // Calculate stats
  const totalRevenue = driver?.driverMonthlyReports?.[0]?.totalRevenue || 0;
  const yearsOfService = calculateYearsOfService(driver?.employmentDate || null);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !driver) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/drivers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Kierowca</h1>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg">{error || "Nie znaleziono kierowcy"}</p>
            <Button className="mt-4" asChild>
              <Link href="/drivers">Powrot do listy</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/drivers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {driver.firstName[0]}
                {driver.lastName[0]}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  {driver.firstName} {driver.lastName}
                </h1>
                <Badge
                  variant="secondary"
                  className={`${statusConfig[driver.status]?.color || "bg-slate-500"} text-white`}
                >
                  {statusConfig[driver.status]?.label || driver.status}
                </Badge>
              </div>
              {driver.city && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {driver.city}
                </p>
              )}
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/drivers/${driver.id}/edit`}>
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
              <TrendingUp className="h-4 w-4" />
              Przychod (miesiac)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Liczba zlecen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{driver._count.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Dni pracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{driver._count.dailyWorkRecords}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Staz pracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{yearsOfService} lat</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Alerts */}
      {driver.expiryWarnings && driver.expiryWarnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Wazne terminy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {driver.expiryWarnings.map((warning, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 ${
                  warning.isExpired
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {warning.isExpired ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span className={warning.isExpired ? "font-medium" : ""}>
                  {warning.type} - {warning.isExpired ? "Wygasl!" : `za ${warning.daysUntilExpiry} dni`}
                  ({formatDate(warning.expiryDate)})
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
          <TabsTrigger value="orders">Zlecenia ({driver._count.orders})</TabsTrigger>
          <TabsTrigger value="reports">Raporty ({driver.driverMonthlyReports?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Dokumenty ({driver._count.documents})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dane osobowe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Imie</p>
                    <p className="font-medium">{driver.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nazwisko</p>
                    <p className="font-medium">{driver.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data urodzenia</p>
                    <p className="font-medium">{formatDate(driver.dateOfBirth)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PESEL</p>
                    <p className="font-mono">{driver.pesel || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Kontakt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {driver.phone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {driver.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adres</p>
                  <p className="font-medium">
                    {driver.address || "-"}
                    {driver.postalCode && driver.city && (
                      <>
                        <br />
                        {driver.postalCode} {driver.city}
                      </>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* License Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Prawo jazdy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nr prawa jazdy</p>
                  <p className="font-mono font-medium">{driver.licenseNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kategorie</p>
                  <div className="flex gap-2 mt-1">
                    {driver.licenseCategories ? (
                      driver.licenseCategories.split(",").map((cat) => (
                        <Badge key={cat.trim()} variant="outline">
                          {cat.trim()}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Data waznosci</p>
                    <p className="font-medium">{formatDate(driver.licenseExpiry)}</p>
                  </div>
                  {driver.licenseExpiry && (
                    <>
                      {isDateExpired(driver.licenseExpiry) ? (
                        <Badge variant="destructive">Wygaslo</Badge>
                      ) : isDateExpiringSoon(driver.licenseExpiry, 60) ? (
                        <Badge variant="secondary" className="bg-amber-500 text-white">
                          Za {getDaysUntil(driver.licenseExpiry)} dni
                        </Badge>
                      ) : null}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ADR Info */}
            {(driver.adrNumber || driver.adrExpiry) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Certyfikat ADR
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nr certyfikatu</p>
                    <p className="font-mono text-sm">{driver.adrNumber || "-"}</p>
                  </div>
                  {driver.adrClasses && (
                    <div>
                      <p className="text-sm text-muted-foreground">Klasy</p>
                      <p className="font-medium">{driver.adrClasses}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Data waznosci</p>
                      <p className="font-medium">{formatDate(driver.adrExpiry)}</p>
                    </div>
                    {driver.adrExpiry && isDateExpiringSoon(driver.adrExpiry, 60) && (
                      <Badge variant="secondary" className="bg-amber-500 text-white">
                        Za {getDaysUntil(driver.adrExpiry)} dni
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medical Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Badania lekarskie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Data waznosci</p>
                    <p className="font-medium">{formatDate(driver.medicalExpiry)}</p>
                  </div>
                  {driver.medicalExpiry && isDateExpiringSoon(driver.medicalExpiry, 60) && (
                    <Badge variant="secondary" className="bg-amber-500 text-white">
                      Za {getDaysUntil(driver.medicalExpiry)} dni
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Zatrudnienie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Rodzaj umowy</p>
                  <p className="font-medium">{employmentTypeLabels[driver.employmentType] || driver.employmentType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data zatrudnienia</p>
                  <p className="font-medium">{formatDate(driver.employmentDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Staz pracy</p>
                  <p className="font-medium">{yearsOfService} lat</p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {driver.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notatki
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{driver.notes}</p>
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
              {driver.orders.length === 0 ? (
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
                      <TableHead className="text-right">Cena</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driver.orders.map((order) => (
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
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.priceNet, order.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Raporty miesieczne
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!driver.driverMonthlyReports || driver.driverMonthlyReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak raportow</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Okres</TableHead>
                      <TableHead>Dni pracy</TableHead>
                      <TableHead>Liczba zlecen</TableHead>
                      <TableHead className="text-right">Sr. dzienny</TableHead>
                      <TableHead className="text-right">Przychod</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driver.driverMonthlyReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {monthNames[report.month - 1]} {report.year}
                        </TableCell>
                        <TableCell>{report.workDays}</TableCell>
                        <TableCell>{report.totalOrders}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(report.avgDailyRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(report.totalRevenue)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.isFinalized ? "default" : "outline"}>
                            {report.isFinalized ? "Zamkniety" : "Otwarty"}
                          </Badge>
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
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj dokument
              </Button>
            </CardHeader>
            <CardContent>
              {driver.documents.length === 0 ? (
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
                    {driver.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.type}</Badge>
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
    </div>
  );
}
