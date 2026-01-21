"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Calendar,
  AlertTriangle,
  Truck,
  Users,
  Building2,
  Upload,
  X,
  ExternalLink,
  Trash2,
  Edit,
  Download,
  Clock,
} from "lucide-react";

// Types
type DocumentType =
  | "VEHICLE_REGISTRATION"
  | "VEHICLE_INSURANCE_OC"
  | "VEHICLE_INSURANCE_AC"
  | "VEHICLE_INSPECTION"
  | "TACHOGRAPH_CALIBRATION"
  | "DRIVER_LICENSE"
  | "DRIVER_ADR"
  | "DRIVER_MEDICAL"
  | "DRIVER_PSYCHO"
  | "DRIVER_QUALIFICATION"
  | "COMPANY_LICENSE"
  | "COMPANY_INSURANCE"
  | "COMPANY_CERTIFICATE"
  | "CMR"
  | "DELIVERY_NOTE"
  | "OTHER";

type EntityType = "vehicle" | "trailer" | "driver" | "order" | "company";

interface Document {
  id: string;
  type: DocumentType;
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

// Document type configuration
const documentTypeConfig: Record<DocumentType, { label: string; category: EntityType }> = {
  VEHICLE_REGISTRATION: { label: "Dowod rejestracyjny", category: "vehicle" },
  VEHICLE_INSURANCE_OC: { label: "Ubezpieczenie OC", category: "vehicle" },
  VEHICLE_INSURANCE_AC: { label: "Ubezpieczenie AC", category: "vehicle" },
  VEHICLE_INSPECTION: { label: "Przeglad techniczny", category: "vehicle" },
  TACHOGRAPH_CALIBRATION: { label: "Kalibracja tachografu", category: "vehicle" },
  DRIVER_LICENSE: { label: "Prawo jazdy", category: "driver" },
  DRIVER_ADR: { label: "Zaswiadczenie ADR", category: "driver" },
  DRIVER_MEDICAL: { label: "Badania lekarskie", category: "driver" },
  DRIVER_PSYCHO: { label: "Badania psychologiczne", category: "driver" },
  DRIVER_QUALIFICATION: { label: "Kwalifikacja zawodowa", category: "driver" },
  COMPANY_LICENSE: { label: "Licencja transportowa", category: "company" },
  COMPANY_INSURANCE: { label: "Ubezpieczenie firmowe", category: "company" },
  COMPANY_CERTIFICATE: { label: "Certyfikat firmowy", category: "company" },
  CMR: { label: "List przewozowy CMR", category: "order" },
  DELIVERY_NOTE: { label: "Dokument dostawy", category: "order" },
  OTHER: { label: "Inny", category: "company" },
};

const entityTypeLabels: Record<EntityType, string> = {
  vehicle: "Pojazdy",
  trailer: "Naczepy",
  driver: "Kierowcy",
  order: "Zlecenia",
  company: "Firma",
};

// Mock data - will be replaced with API calls
const mockDocuments: Document[] = [
  {
    id: "1",
    type: "VEHICLE_REGISTRATION",
    name: "Dowod rejestracyjny WGM1068L",
    description: "Dowod rejestracyjny ciezarowki",
    fileUrl: "/documents/reg-wgm1068l.pdf",
    fileSize: 524288,
    mimeType: "application/pdf",
    expiryDate: null,
    vehicle: { id: "1", registrationNumber: "WGM1068L" },
    trailer: null,
    driver: null,
    order: null,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    type: "VEHICLE_INSURANCE_OC",
    name: "Polisa OC WGM1068L",
    description: "Ubezpieczenie OC pojazdu",
    fileUrl: "/documents/oc-wgm1068l.pdf",
    fileSize: 1048576,
    mimeType: "application/pdf",
    expiryDate: "2026-02-20",
    vehicle: { id: "1", registrationNumber: "WGM1068L" },
    trailer: null,
    driver: null,
    order: null,
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "3",
    type: "VEHICLE_INSPECTION",
    name: "Przeglad techniczny WGM1068L",
    description: null,
    fileUrl: "/documents/inspection-wgm1068l.pdf",
    fileSize: 256000,
    mimeType: "application/pdf",
    expiryDate: "2026-01-25",
    vehicle: { id: "1", registrationNumber: "WGM1068L" },
    trailer: null,
    driver: null,
    order: null,
    createdAt: "2024-06-10T14:00:00Z",
  },
  {
    id: "4",
    type: "DRIVER_LICENSE",
    name: "Prawo jazdy - Adam Kowalski",
    description: "Kategorie C, CE",
    fileUrl: "/documents/license-kowalski.pdf",
    fileSize: 512000,
    mimeType: "application/pdf",
    expiryDate: "2028-06-15",
    vehicle: null,
    trailer: null,
    driver: { id: "1", firstName: "Adam", lastName: "Kowalski" },
    order: null,
    createdAt: "2024-02-01T09:00:00Z",
  },
  {
    id: "5",
    type: "DRIVER_MEDICAL",
    name: "Badania lekarskie - Adam Kowalski",
    description: "Badania okresowe kierowcy",
    fileUrl: "/documents/medical-kowalski.pdf",
    fileSize: 384000,
    mimeType: "application/pdf",
    expiryDate: "2026-03-20",
    vehicle: null,
    trailer: null,
    driver: { id: "1", firstName: "Adam", lastName: "Kowalski" },
    order: null,
    createdAt: "2024-03-20T11:00:00Z",
  },
  {
    id: "6",
    type: "DRIVER_ADR",
    name: "ADR - Piotr Nowak",
    description: "Zaswiadczenie ADR podstawowe",
    fileUrl: "/documents/adr-nowak.pdf",
    fileSize: 256000,
    mimeType: "application/pdf",
    expiryDate: "2026-01-28",
    vehicle: null,
    trailer: null,
    driver: { id: "2", firstName: "Piotr", lastName: "Nowak" },
    order: null,
    createdAt: "2024-01-28T15:00:00Z",
  },
  {
    id: "7",
    type: "COMPANY_LICENSE",
    name: "Licencja transportowa",
    description: "Licencja na wykonywanie transportu miedzynarodowego",
    fileUrl: "/documents/company-license.pdf",
    fileSize: 768000,
    mimeType: "application/pdf",
    expiryDate: "2027-12-31",
    vehicle: null,
    trailer: null,
    driver: null,
    order: null,
    createdAt: "2022-01-01T08:00:00Z",
  },
  {
    id: "8",
    type: "VEHICLE_INSURANCE_OC",
    name: "Polisa OC DSR50038",
    description: "Ubezpieczenie OC pojazdu",
    fileUrl: "/documents/oc-dsr50038.pdf",
    fileSize: 1024000,
    mimeType: "application/pdf",
    expiryDate: "2025-12-15",
    vehicle: { id: "2", registrationNumber: "DSR50038" },
    trailer: null,
    driver: null,
    order: null,
    createdAt: "2024-12-15T10:00:00Z",
  },
  {
    id: "9",
    type: "CMR",
    name: "CMR ZL-2026-001234",
    description: "List przewozowy Wroclaw - Poznan",
    fileUrl: "/documents/cmr-001234.pdf",
    fileSize: 192000,
    mimeType: "application/pdf",
    expiryDate: null,
    vehicle: null,
    trailer: null,
    driver: null,
    order: { id: "1", orderNumber: "ZL-2026-001234" },
    createdAt: "2026-01-10T16:00:00Z",
  },
  {
    id: "10",
    type: "DRIVER_LICENSE",
    name: "Prawo jazdy - Jan Wisniewski",
    description: "Kategorie C, CE",
    fileUrl: "/documents/license-wisniewski.pdf",
    fileSize: 512000,
    mimeType: "application/pdf",
    expiryDate: "2026-01-20",
    vehicle: null,
    trailer: null,
    driver: { id: "3", firstName: "Jan", lastName: "Wisniewski" },
    order: null,
    createdAt: "2024-01-20T09:00:00Z",
  },
];

// Helper functions
function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("pl-PL");
}

function getDaysUntilExpiry(dateString: string | null): number | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(dateString: string | null): "ok" | "warning" | "expired" | "none" {
  const days = getDaysUntilExpiry(dateString);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 30) return "warning";
  return "ok";
}

function getEntityType(doc: Document): EntityType {
  if (doc.vehicle) return "vehicle";
  if (doc.trailer) return "trailer";
  if (doc.driver) return "driver";
  if (doc.order) return "order";
  return "company";
}

function getEntityLabel(doc: Document): string {
  if (doc.vehicle) return doc.vehicle.registrationNumber;
  if (doc.trailer) return doc.trailer.registrationNumber;
  if (doc.driver) return `${doc.driver.firstName} ${doc.driver.lastName}`;
  if (doc.order) return doc.order.orderNumber;
  return "Firma";
}

function getEntityLink(doc: Document): string | null {
  if (doc.vehicle) return `/vehicles/${doc.vehicle.id}`;
  if (doc.trailer) return `/trailers/${doc.trailer.id}`;
  if (doc.driver) return `/drivers/${doc.driver.id}`;
  if (doc.order) return `/orders/${doc.order.id}`;
  return null;
}

function getEntityIcon(entityType: EntityType) {
  switch (entityType) {
    case "vehicle":
    case "trailer":
      return Truck;
    case "driver":
      return Users;
    case "order":
      return FileText;
    case "company":
      return Building2;
  }
}

// Stats calculation
function calculateStats(documents: Document[]) {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return {
    total: documents.length,
    expiringSoon: documents.filter((d) => {
      if (!d.expiryDate) return false;
      const expiry = new Date(d.expiryDate);
      return expiry >= now && expiry <= thirtyDaysFromNow;
    }).length,
    expired: documents.filter((d) => {
      if (!d.expiryDate) return false;
      return new Date(d.expiryDate) < now;
    }).length,
    byEntity: {
      vehicle: documents.filter((d) => d.vehicle !== null).length,
      driver: documents.filter((d) => d.driver !== null).length,
      company: documents.filter((d) => !d.vehicle && !d.trailer && !d.driver && !d.order).length,
    },
  };
}

// Group documents by entity
function groupDocumentsByEntity(documents: Document[]): Record<EntityType, Document[]> {
  const grouped: Record<EntityType, Document[]> = {
    vehicle: [],
    trailer: [],
    driver: [],
    order: [],
    company: [],
  };

  documents.forEach((doc) => {
    const entityType = getEntityType(doc);
    grouped[entityType].push(doc);
  });

  return grouped;
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Filter documents
  const filteredDocuments = mockDocuments.filter((doc) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = doc.name.toLowerCase().includes(query);
      const matchesDescription = doc.description?.toLowerCase().includes(query);
      const matchesEntity = getEntityLabel(doc).toLowerCase().includes(query);
      if (!matchesName && !matchesDescription && !matchesEntity) return false;
    }

    // Type filter
    if (typeFilter !== "all" && doc.type !== typeFilter) return false;

    // Entity filter
    if (entityFilter !== "all") {
      const docEntityType = getEntityType(doc);
      if (docEntityType !== entityFilter) return false;
    }

    // Expiry filter
    if (expiryFilter !== "all") {
      const status = getExpiryStatus(doc.expiryDate);
      if (expiryFilter === "expiring" && status !== "warning") return false;
      if (expiryFilter === "expired" && status !== "expired") return false;
    }

    return true;
  });

  const stats = calculateStats(mockDocuments);
  const groupedDocuments = groupDocumentsByEntity(filteredDocuments);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  // Handle edit document
  const handleEditDocument = (doc: Document) => {
    // TODO: Implement edit functionality when API is ready
    alert(`Edycja dokumentu: ${doc.name}\n\nFunkcja bedzie dostepna po podlaczeniu do bazy danych.`);
  };

  // Handle delete document
  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Czy na pewno chcesz usunac dokument "${doc.name}"?`)) return;

    try {
      // TODO: Implement API call when backend is ready
      // const response = await fetch(`/api/documents/${doc.id}`, {
      //   method: "DELETE",
      // });
      alert(`Usunieto dokument: ${doc.name}\n\nFunkcja bedzie w pelni dostepna po podlaczeniu do bazy danych.`);
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Wystapil blad podczas usuwania dokumentu");
    }
  };

  // Handle upload document
  const handleUploadDocument = async () => {
    if (!selectedFile) {
      alert("Wybierz plik do przeslania");
      return;
    }

    try {
      // TODO: Implement file upload when API is ready
      // const formData = new FormData();
      // formData.append("file", selectedFile);
      // const response = await fetch("/api/documents", {
      //   method: "POST",
      //   body: formData,
      // });
      alert(`Plik "${selectedFile.name}" zostal wybrany.\n\nFunkcja przesylania bedzie dostepna po podlaczeniu do bazy danych.`);
      setIsUploadOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Wystapil blad podczas przesylania dokumentu");
    }
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
            Zarzadzanie dokumentami floty i firmy
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj dokument
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Dodaj nowy dokument</DialogTitle>
              <DialogDescription>
                Przeciagnij plik lub wybierz z dysku. Wypelnij wymagane dane.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Przeciagnij plik tutaj lub
                    </p>
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>Wybierz plik</span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      PDF, JPG, PNG, DOC do 10MB
                    </p>
                  </>
                )}
              </div>

              {/* Document details */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="doc-name">Nazwa dokumentu</Label>
                  <Input id="doc-name" placeholder="np. Polisa OC WGM1068L" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="doc-type">Typ dokumentu</Label>
                  <Select>
                    <SelectTrigger id="doc-type">
                      <SelectValue placeholder="Wybierz typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeConfig).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="doc-entity">Powiazanie</Label>
                  <Select>
                    <SelectTrigger id="doc-entity">
                      <SelectValue placeholder="Wybierz podmiot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Firma</SelectItem>
                      <SelectItem value="vehicle-1">Pojazd: WGM1068L</SelectItem>
                      <SelectItem value="vehicle-2">Pojazd: DSR50038</SelectItem>
                      <SelectItem value="driver-1">Kierowca: Adam Kowalski</SelectItem>
                      <SelectItem value="driver-2">Kierowca: Piotr Nowak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="doc-expiry">Data waznosci (opcjonalnie)</Label>
                  <Input id="doc-expiry" type="date" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleUploadDocument}>
                <Upload className="mr-2 h-4 w-4" />
                Dodaj dokument
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              Wygasajace (&lt;30 dni)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              Przeterminowane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pojazdy / Kierowcy / Firma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.byEntity.vehicle} / {stats.byEntity.driver} / {stats.byEntity.company}
            </p>
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
                  placeholder="Szukaj po nazwie, opisie, podmiocie..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Typ dokumentu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                {Object.entries(documentTypeConfig).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Podmiot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie podmioty</SelectItem>
                {Object.entries(entityTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="w-[180px]">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Waznosc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="expiring">Wygasajace</SelectItem>
                <SelectItem value="expired">Przeterminowane</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("list")}
              >
                Lista
              </Button>
              <Button
                variant={viewMode === "grouped" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("grouped")}
              >
                Grupuj
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List or Grouped View */}
      {viewMode === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>Lista dokumentow ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dokument</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Powiazanie</TableHead>
                  <TableHead>Data waznosci</TableHead>
                  <TableHead>Rozmiar</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const expiryStatus = getExpiryStatus(doc.expiryDate);
                  const daysUntil = getDaysUntilExpiry(doc.expiryDate);
                  const entityType = getEntityType(doc);
                  const EntityIcon = getEntityIcon(entityType);
                  const entityLink = getEntityLink(doc);

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {documentTypeConfig[doc.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EntityIcon className="h-4 w-4 text-muted-foreground" />
                          {entityLink ? (
                            <Link
                              href={entityLink}
                              className="hover:underline text-sm"
                            >
                              {getEntityLabel(doc)}
                            </Link>
                          ) : (
                            <span className="text-sm">{getEntityLabel(doc)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.expiryDate ? (
                          <div className="flex items-center gap-2">
                            {expiryStatus === "expired" && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            {expiryStatus === "warning" && (
                              <Calendar className="h-4 w-4 text-amber-500" />
                            )}
                            <span
                              className={
                                expiryStatus === "expired"
                                  ? "text-red-600 font-medium"
                                  : expiryStatus === "warning"
                                  ? "text-amber-600 font-medium"
                                  : ""
                              }
                            >
                              {formatDate(doc.expiryDate)}
                            </span>
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 30 && (
                              <span className="text-xs text-muted-foreground">
                                ({daysUntil} dni)
                              </span>
                            )}
                            {daysUntil !== null && daysUntil < 0 && (
                              <span className="text-xs text-red-500">
                                (przeterminowany)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.fileUrl} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDocument(doc)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Nie znaleziono dokumentow
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedDocuments) as [EntityType, Document[]][])
            .filter(([, docs]) => docs.length > 0)
            .map(([entityType, docs]) => {
              const EntityIcon = getEntityIcon(entityType);
              return (
                <Card key={entityType}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <EntityIcon className="h-5 w-5" />
                      {entityTypeLabels[entityType]} ({docs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {docs.map((doc) => {
                        const expiryStatus = getExpiryStatus(doc.expiryDate);
                        const daysUntil = getDaysUntilExpiry(doc.expiryDate);

                        return (
                          <div
                            key={doc.id}
                            className={`rounded-lg border p-4 ${
                              expiryStatus === "expired"
                                ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                                : expiryStatus === "warning"
                                ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{doc.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {documentTypeConfig[doc.type].label}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" asChild>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                            {doc.expiryDate && (
                              <div className="mt-3 flex items-center gap-2 text-sm">
                                {expiryStatus === "expired" ? (
                                  <>
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <span className="text-red-600 font-medium">
                                      Przeterminowany od {formatDate(doc.expiryDate)}
                                    </span>
                                  </>
                                ) : expiryStatus === "warning" ? (
                                  <>
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                    <span className="text-amber-600 font-medium">
                                      Wygasa za {daysUntil} dni ({formatDate(doc.expiryDate)})
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                      Wazny do {formatDate(doc.expiryDate)}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
