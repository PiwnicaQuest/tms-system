"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Building2,
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  CreditCard,
  FileText,
  Package,
  Loader2,
  Calendar,
} from "lucide-react";

// Types
type ContractorType = "CLIENT" | "CARRIER" | "BOTH";

const typeLabels: Record<ContractorType, string> = {
  CLIENT: "Klient",
  CARRIER: "Przewoznik",
  BOTH: "Klient i przewoznik",
};

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  origin: string;
  destination: string;
  loadingDate: string;
  unloadingDate: string;
  priceNet: number | null;
  currency: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalGross: number;
  currency: string;
  status: string;
}

interface Contractor {
  id: string;
  type: ContractorType;
  name: string;
  shortName: string | null;
  nip: string | null;
  regon: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  // Adres korespondencyjny
  corrAddress: string | null;
  corrCity: string | null;
  corrPostalCode: string | null;
  corrCountry: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  paymentDays: number;
  creditLimit: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
  invoices?: Invoice[];
  _count?: {
    orders: number;
    invoices: number;
  };
}

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

const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "Szkic",
  ISSUED: "Wystawiona",
  SENT: "Wyslana",
  PAID: "Zaplacona",
  OVERDUE: "Przeterminowana",
  CANCELLED: "Anulowana",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ContractorDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContractor = async () => {
      try {
        const response = await fetch(`/api/contractors/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch contractor");
        }
        const data = await response.json();
        setContractor(data);
      } catch (error) {
        console.error("Error fetching contractor:", error);
        alert("Nie udalo sie pobrac danych kontrahenta");
        router.push("/contractors");
      } finally {
        setLoading(false);
      }
    };

    fetchContractor();
  }, [id, router]);

  const getTypeBadgeClass = (contractorType: ContractorType) => {
    const baseClasses = "text-xs font-medium";
    switch (contractorType) {
      case "CLIENT":
        return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`;
      case "CARRIER":
        return `${baseClasses} bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300`;
      case "BOTH":
        return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`;
      default:
        return baseClasses;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Kontrahent nie zostal znaleziony</p>
        <Link href="/contractors">
          <Button variant="link">Powrot do listy</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contractors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                {contractor.name}
              </h1>
              <Badge className={getTypeBadgeClass(contractor.type)}>
                {typeLabels[contractor.type]}
              </Badge>
              {!contractor.isActive && (
                <Badge variant="secondary">Nieaktywny</Badge>
              )}
            </div>
            {contractor.shortName && (
              <p className="text-muted-foreground">{contractor.shortName}</p>
            )}
          </div>
        </div>
        <Link href={`/contractors/${id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacje podstawowe</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">NIP</p>
                <p className="font-mono">{contractor.nip || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">REGON</p>
                <p className="font-mono">{contractor.regon || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Termin platnosci</p>
                <p>{contractor.paymentDays} dni</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Limit kredytowy</p>
                <p>
                  {contractor.creditLimit
                    ? `${contractor.creditLimit.toLocaleString("pl-PL")} PLN`
                    : "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adres
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contractor.address || contractor.city ? (
                <div>
                  {contractor.address && <p>{contractor.address}</p>}
                  <p>
                    {contractor.postalCode} {contractor.city}
                  </p>
                  <p>{contractor.country}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Brak danych adresowych</p>
              )}
            </CardContent>
          </Card>

          {/* Correspondence Address */}
          {(contractor.corrAddress || contractor.corrCity) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adres korespondencyjny
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {contractor.corrAddress && <p>{contractor.corrAddress}</p>}
                  <p>
                    {contractor.corrPostalCode} {contractor.corrCity}
                  </p>
                  {contractor.corrCountry && <p>{contractor.corrCountry}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {contractor.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Uwagi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{contractor.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Orders and Invoices Tabs */}
          <Card>
            <Tabs defaultValue="orders">
              <CardHeader>
                <TabsList>
                  <TabsTrigger value="orders" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Zlecenia ({contractor._count?.orders || 0})
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Faktury ({contractor._count?.invoices || 0})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="orders" className="mt-0">
                  {contractor.orders && contractor.orders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Trasa</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Wartosc</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contractor.orders.slice(0, 10).map((order) => (
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
                              <Badge variant="outline">
                                {orderStatusLabels[order.status] || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.origin} → {order.destination}
                            </TableCell>
                            <TableCell>
                              {new Date(order.loadingDate).toLocaleDateString("pl-PL")}
                            </TableCell>
                            <TableCell className="text-right">
                              {order.priceNet
                                ? `${order.priceNet.toLocaleString("pl-PL")} ${order.currency}`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      Brak zlecen
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="invoices" className="mt-0">
                  {contractor.invoices && contractor.invoices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data wystawienia</TableHead>
                          <TableHead>Termin</TableHead>
                          <TableHead className="text-right">Kwota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contractor.invoices.slice(0, 10).map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="font-medium hover:underline"
                              >
                                {invoice.invoiceNumber}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {invoiceStatusLabels[invoice.status] || invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(invoice.issueDate).toLocaleDateString("pl-PL")}
                            </TableCell>
                            <TableCell>
                              {new Date(invoice.dueDate).toLocaleDateString("pl-PL")}
                            </TableCell>
                            <TableCell className="text-right">
                              {invoice.totalGross.toLocaleString("pl-PL")}{" "}
                              {invoice.currency}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      Brak faktur
                    </p>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Contact */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contractor.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${contractor.email}`}
                    className="text-primary hover:underline"
                  >
                    {contractor.email}
                  </a>
                </div>
              )}
              {contractor.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${contractor.phone}`}
                    className="text-primary hover:underline"
                  >
                    {contractor.phone}
                  </a>
                </div>
              )}
              {contractor.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={contractor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {contractor.website}
                  </a>
                </div>
              )}
              {!contractor.email && !contractor.phone && !contractor.website && (
                <p className="text-muted-foreground">Brak danych kontaktowych</p>
              )}
            </CardContent>
          </Card>

          {(contractor.contactPerson ||
            contractor.contactPhone ||
            contractor.contactEmail) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Osoba kontaktowa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contractor.contactPerson && (
                  <p className="font-medium">{contractor.contactPerson}</p>
                )}
                {contractor.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contractor.contactEmail}`}
                      className="text-primary hover:underline"
                    >
                      {contractor.contactEmail}
                    </a>
                  </div>
                )}
                {contractor.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${contractor.contactPhone}`}
                      className="text-primary hover:underline"
                    >
                      {contractor.contactPhone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Utworzono</p>
                <p>{new Date(contractor.createdAt).toLocaleString("pl-PL")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ostatnia aktualizacja</p>
                <p>{new Date(contractor.updatedAt).toLocaleString("pl-PL")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
