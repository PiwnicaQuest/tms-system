"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Truck,
  Users,
  Building2,
  ExternalLink,
  Trash2,
  Download,
  Clock,
  RefreshCw,
  MoreHorizontal,
  Container,
  Package,
} from "lucide-react";
import { documentTypeLabels } from "@/components/ui/document-upload-dialog";

type EntityType = "vehicle" | "trailer" | "driver" | "order" | "company" | "all";

interface Document {
  id: string;
  type: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  expiryDate: string | null;
  vehicle: { id: string; registrationNumber: string } | null;
  trailer: { id: string; registrationNumber: string } | null;
  driver: { id: string; firstName: string; lastName: string } | null;
  order: { id: string; orderNumber: string } | null;
  createdAt: string;
}

interface DocumentsResponse {
  data: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const entityTypeLabels: Record<EntityType, string> = {
  all: "Wszystkie",
  vehicle: "Pojazdy",
  trailer: "Naczepy",
  driver: "Kierowcy",
  order: "Zlecenia",
  company: "Firma",
};

const entityTypeIcons: Record<string, React.ReactNode> = {
  vehicle: <Truck className="h-4 w-4" />,
  trailer: <Container className="h-4 w-4" />,
  driver: <Users className="h-4 w-4" />,
  order: <Package className="h-4 w-4" />,
  company: <Building2 className="h-4 w-4" />,
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("pl-PL");
}

function isExpiringSoon(dateString: string | null, days: number = 30): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  const diff = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function isExpired(dateString: string | null): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

function getDaysUntil(dateString: string | null): number {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const today = new Date();
  const diff = date.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getEntityInfo(doc: Document): { type: string; name: string; link: string } | null {
  if (doc.vehicle) {
    return {
      type: "vehicle",
      name: doc.vehicle.registrationNumber,
      link: `/vehicles/${doc.vehicle.id}`,
    };
  }
  if (doc.trailer) {
    return {
      type: "trailer",
      name: doc.trailer.registrationNumber,
      link: `/trailers/${doc.trailer.id}`,
    };
  }
  if (doc.driver) {
    return {
      type: "driver",
      name: `${doc.driver.firstName} ${doc.driver.lastName}`,
      link: `/drivers/${doc.driver.id}`,
    };
  }
  if (doc.order) {
    return {
      type: "order",
      name: doc.order.orderNumber,
      link: `/orders/${doc.order.id}`,
    };
  }
  return { type: "company", name: "Firma", link: "/settings" };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityType>("all");
  const [activeTab, setActiveTab] = useState<"all" | "expiring" | "expired">("all");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    expiring: 0,
    expired: 0,
  });

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      
      if (search) params.set("search", search);
      if (entityFilter !== "all") params.set("entityType", entityFilter);
      if (activeTab === "expiring") params.set("expiringSoon", "true");
      if (activeTab === "expired") params.set("expired", "true");

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch documents");

      const data: DocumentsResponse = await response.json();
      setDocuments(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, entityFilter, activeTab]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const [totalRes, expiringRes, expiredRes] = await Promise.all([
        fetch("/api/documents?limit=1"),
        fetch("/api/documents?limit=1&expiringSoon=true"),
        fetch("/api/documents?limit=1&expired=true"),
      ]);
      
      const [totalData, expiringData, expiredData] = await Promise.all([
        totalRes.json(),
        expiringRes.json(),
        expiredRes.json(),
      ]);

      setStats({
        total: totalData.pagination?.total || 0,
        expiring: expiringData.pagination?.total || 0,
        expired: expiredData.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten dokument?")) return;

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas usuwania dokumentu");
        return;
      }

      fetchDocuments();
      fetchStats();
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Wystąpił błąd podczas usuwania dokumentu");
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as "all" | "expiring" | "expired");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Render document row
  const renderDocumentRow = (doc: Document) => {
    const entityInfo = getEntityInfo(doc);
    const expired = isExpired(doc.expiryDate);
    const expiringSoon = !expired && isExpiringSoon(doc.expiryDate, 30);

    return (
      <TableRow key={doc.id}>
        <TableCell>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{doc.name}</p>
              {doc.description && (
                <p className="text-sm text-muted-foreground">{doc.description}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">
            {documentTypeLabels[doc.type] || doc.type}
          </Badge>
        </TableCell>
        <TableCell>
          {entityInfo && (
            <Link 
              href={entityInfo.link}
              className="flex items-center gap-2 hover:underline"
            >
              {entityTypeIcons[entityInfo.type]}
              <span>{entityInfo.name}</span>
            </Link>
          )}
        </TableCell>
        <TableCell>
          {doc.expiryDate ? (
            <div className="flex items-center gap-2">
              <span className={expired ? "text-red-600" : expiringSoon ? "text-amber-600" : ""}>
                {formatDate(doc.expiryDate)}
              </span>
              {expired && (
                <Badge variant="destructive" className="text-xs">
                  Przeterminowany
                </Badge>
              )}
              {expiringSoon && (
                <Badge className="bg-amber-500 text-white text-xs">
                  Za {getDaysUntil(doc.expiryDate)} dni
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          {formatFileSize(doc.fileSize)}
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
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Otwórz
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={doc.fileUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Pobierz
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(doc.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Dokumenty
          </h1>
          <p className="text-muted-foreground">
            Zarządzanie dokumentami pojazdów, naczep i kierowców
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchDocuments(); fetchStats(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Odśwież
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Wszystkie dokumenty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Wygasające (30 dni)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.expiring}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Przeterminowane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              Aktualne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.total - stats.expiring - stats.expired}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="expiring" className="text-amber-600">
            Wygasające ({stats.expiring})
          </TabsTrigger>
          <TabsTrigger value="expired" className="text-red-600">
            Przeterminowane ({stats.expired})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj dokumentów..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select 
                  value={entityFilter} 
                  onValueChange={(value: EntityType) => {
                    setEntityFilter(value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Kategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(entityTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all" && "Wszystkie dokumenty"}
                {activeTab === "expiring" && "Dokumenty wygasające w ciągu 30 dni"}
                {activeTab === "expired" && "Dokumenty przeterminowane"}
              </CardTitle>
              <CardDescription>
                Znaleziono {pagination.total} dokumentów
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nie znaleziono dokumentów</p>
                  <p className="text-sm mt-1">
                    Dokumenty możesz dodać ze strony szczegółów pojazdu, naczepy lub kierowcy
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Powiązanie</TableHead>
                        <TableHead>Data ważności</TableHead>
                        <TableHead>Rozmiar</TableHead>
                        <TableHead className="text-right">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map(renderDocumentRow)}
                    </TableBody>
                  </Table>

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
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page <= 1}
                        >
                          Poprzednia
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page >= pagination.totalPages}
                        >
                          Następna
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
