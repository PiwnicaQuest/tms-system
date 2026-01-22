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
import { ImageThumbnail } from "@/components/ui/image-upload";
import {
  Container,
  ArrowLeft,
  Edit,
  FileText,
  AlertTriangle,
  Clock,
  RefreshCw,
  Package,
  Scale,
  Box,
} from "lucide-react";

type TrailerStatus = "ACTIVE" | "IN_SERVICE" | "INACTIVE" | "SOLD";
type TrailerType = "CURTAIN" | "REFRIGERATOR" | "TANKER" | "FLATBED" | "MEGA" | "BOX" | "TIPPER" | "OTHER";

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
  notes: string | null;
  imageUrl: string | null;
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
  documents: Array<{
    id: string;
    type: string;
    name: string;
    expiryDate: string | null;
    fileUrl: string | null;
  }>;
  _count: {
    orders: number;
    documents: number;
  };
}

const statusConfig: Record<TrailerStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Aktywna", color: "bg-emerald-500" },
  IN_SERVICE: { label: "W serwisie", color: "bg-amber-500" },
  INACTIVE: { label: "Nieaktywna", color: "bg-slate-500" },
  SOLD: { label: "Sprzedana", color: "bg-red-500" },
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

const orderStatusLabels: Record<string, string> = {
  NEW: "Nowe",
  PLANNED: "Zaplanowane",
  ASSIGNED: "Przypisane",
  IN_TRANSIT: "W trasie",
  DELIVERED: "Dostarczone",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
};

const orderStatusColors: Record<string, string> = {
  NEW: "bg-blue-500",
  PLANNED: "bg-slate-500",
  ASSIGNED: "bg-yellow-500",
  IN_TRANSIT: "bg-green-500",
  DELIVERED: "bg-emerald-500",
  COMPLETED: "bg-gray-500",
  CANCELLED: "bg-red-500",
};

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

export default function TrailerDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const [trailer, setTrailer] = useState<Trailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrailer = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/trailers/${resolvedParams.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Naczepa nie została znaleziona");
          } else {
            throw new Error("Failed to fetch trailer");
          }
          return;
        }

        const data = await response.json();
        setTrailer(data.data);
      } catch (err) {
        console.error("Error fetching trailer:", err);
        setError("Wystąpił błąd podczas pobierania naczepy");
      } finally {
        setLoading(false);
      }
    };

    fetchTrailer();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !trailer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trailers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Naczepa</h1>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg">{error || "Nie znaleziono naczepy"}</p>
            <Button className="mt-4" asChild>
              <Link href="/trailers">Powrót do listy</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiringDocuments = trailer.documents?.filter(
    (doc) => doc.expiryDate && (isDateExpiringSoon(doc.expiryDate, 60) || isDateExpired(doc.expiryDate))
  ) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trailers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <ImageThumbnail
              src={trailer.imageUrl}
              alt={trailer.registrationNumber}
              fallbackIcon={<Container className="h-6 w-6" />}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  {trailer.registrationNumber}
                </h1>
                <Badge
                  variant="secondary"
                  className={`${statusConfig[trailer.status]?.color || "bg-slate-500"} text-white`}
                >
                  {statusConfig[trailer.status]?.label || trailer.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {typeLabels[trailer.type]} {trailer.brand ? `• ${trailer.brand}` : ""} {trailer.year ? `(${trailer.year})` : ""}
              </p>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/trailers/${trailer.id}/edit`}>
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
              <Scale className="h-4 w-4" />
              Ładowność
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {trailer.loadCapacity ? `${trailer.loadCapacity.toLocaleString("pl-PL")} kg` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4" />
              Pojemność
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {trailer.volume ? `${trailer.volume} m³` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Liczba zleceń
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{trailer._count?.orders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dokumenty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{trailer._count?.documents || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {expiringDocuments.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Ważne terminy
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
          <TabsTrigger value="details">Szczegóły</TabsTrigger>
          <TabsTrigger value="orders">Zlecenia ({trailer._count?.orders || 0})</TabsTrigger>
          <TabsTrigger value="documents">Dokumenty ({trailer._count?.documents || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Container className="h-5 w-5" />
                  Dane naczepy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nr rejestracyjny</p>
                    <p className="font-mono font-medium">{trailer.registrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Typ</p>
                    <p className="font-medium">{typeLabels[trailer.type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Marka</p>
                    <p className="font-medium">{trailer.brand || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rok produkcji</p>
                    <p className="font-medium">{trailer.year || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Liczba osi</p>
                    <p className="font-medium">{trailer.axles || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Klasy ADR</p>
                    <p className="font-medium">{trailer.adrClasses || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ładowność</p>
                    <p className="font-medium">
                      {trailer.loadCapacity ? `${trailer.loadCapacity.toLocaleString("pl-PL")} kg` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pojemność</p>
                    <p className="font-medium">{trailer.volume ? `${trailer.volume} m³` : "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {trailer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notatki
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{trailer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Ostatnie zlecenia</CardTitle>
            </CardHeader>
            <CardContent>
              {(!trailer.orders || trailer.orders.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak zleceń</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr zlecenia</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trasa</TableHead>
                      <TableHead>Załadunek</TableHead>
                      <TableHead>Rozładunek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trailer.orders.map((order) => (
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

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Dokumenty</CardTitle>
            </CardHeader>
            <CardContent>
              {(!trailer.documents || trailer.documents.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak dokumentów</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Data ważności</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trailer.documents.map((doc) => (
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
                                  Wkrótce
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
