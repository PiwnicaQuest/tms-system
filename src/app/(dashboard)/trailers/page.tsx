"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Camera,
  X,
  Star,
  Upload,
  ImageIcon,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  File,
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

const documentTypeLabels: Record<string, string> = {
  VEHICLE_REGISTRATION: "Dowód rejestracyjny",
  VEHICLE_INSURANCE_OC: "Ubezpieczenie OC",
  VEHICLE_INSURANCE_AC: "Ubezpieczenie AC",
  VEHICLE_INSPECTION: "Przegląd techniczny",
  TACHOGRAPH_CALIBRATION: "Kalibracja tachografu",
};

interface TrailerPhoto {
  id: string;
  trailerId: string;
  url: string;
  description: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface TrailerDocument {
  id: string;
  type: string;
  name: string;
  description: string | null;
  fileUrl: string;
  expiryDate: string | null;
  createdAt: string;
}

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
  photos?: TrailerPhoto[];
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

const initialDocumentFormData = {
  type: "VEHICLE_REGISTRATION",
  name: "",
  description: "",
  expiryDate: "",
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("basic");

  // Photos state
  const [photos, setPhotos] = useState<TrailerPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Documents state
  const [documents, setDocuments] = useState<TrailerDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentFormData, setDocumentFormData] = useState(initialDocumentFormData);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const fetchTrailers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
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
  }, [pagination.page, pagination.limit, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchTrailers();
  }, [fetchTrailers]);

  // Open dialog for new trailer
  const handleNew = () => {
    setEditingTrailer(null);
    setFormData(initialFormData);
    setFormErrors({});
    setActiveTab("basic");
    setPhotos([]);
    setDocuments([]);
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
    setActiveTab("basic");
    setShowDialog(true);
    // Fetch photos and documents when editing
    fetchPhotos(trailer.id);
    fetchDocuments(trailer.id);
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
    } catch (error) {
      console.error("Error deleting trailer:", error);
      alert("Wystąpił błąd podczas usuwania naczepy");
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

      const result = await response.json();

      // If creating new trailer, switch to edit mode to allow adding photos/documents
      if (!editingTrailer && result.data) {
        setEditingTrailer(result.data);
        setActiveTab("photos");
        fetchTrailers();
        return; // Don't close dialog - allow adding photos
      }

      setShowDialog(false);
      fetchTrailers();
    } catch (error) {
      console.error("Error saving trailer:", error);
      alert("Wystąpił błąd podczas zapisywania naczepy");
    } finally {
      setFormLoading(false);
    }
  };

  // Photos management functions
  const fetchPhotos = async (trailerId: string) => {
    setPhotosLoading(true);
    try {
      const response = await fetch(`/api/trailers/${trailerId}/photos`);
      if (!response.ok) throw new Error("Failed to fetch photos");
      const data = await response.json();
      setPhotos(data.data);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingTrailer) return;

    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("photos", files[i]);
      }

      const response = await fetch(`/api/trailers/${editingTrailer.id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas przesyłania zdjęć");
        return;
      }

      fetchPhotos(editingTrailer.id);
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert("Wystąpił błąd podczas przesyłania zdjęć");
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!editingTrailer) return;
    if (!confirm("Czy na pewno chcesz usunąć to zdjęcie?")) return;

    try {
      const response = await fetch(
        `/api/trailers/${editingTrailer.id}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        alert("Wystąpił błąd podczas usuwania zdjęcia");
        return;
      }

      fetchPhotos(editingTrailer.id);
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Wystąpił błąd podczas usuwania zdjęcia");
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    if (!editingTrailer) return;

    try {
      const response = await fetch(`/api/trailers/${editingTrailer.id}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      if (!response.ok) {
        alert("Wystąpił błąd podczas ustawiania głównego zdjęcia");
        return;
      }

      fetchPhotos(editingTrailer.id);
    } catch (error) {
      console.error("Error setting primary photo:", error);
    }
  };

  // Documents management functions
  const fetchDocuments = async (trailerId: string) => {
    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/documents?trailerId=${trailerId}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(data.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentTypeChange = (type: string) => {
    setDocumentFormData({
      ...documentFormData,
      type,
      name: documentTypeLabels[type] || "",
    });
  };

  const handleUploadDocument = async () => {
    if (!editingTrailer || !documentFile) {
      alert("Wybierz plik dokumentu");
      return;
    }

    setUploadingDocument(true);
    try {
      // First upload the file
      const uploadFormData = new FormData();
      uploadFormData.append("file", documentFile);
      uploadFormData.append("entityType", "trailer");
      uploadFormData.append("entityId", editingTrailer.id);

      const uploadResponse = await fetch("/api/documents/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        alert(data.error || "Wystąpił błąd podczas przesyłania pliku");
        return;
      }

      const uploadResult = await uploadResponse.json();

      // Then create the document record
      const documentPayload = {
        type: documentFormData.type,
        name: documentFormData.name || documentTypeLabels[documentFormData.type],
        description: documentFormData.description || null,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        expiryDate: documentFormData.expiryDate || null,
        trailerId: editingTrailer.id,
      };

      const docResponse = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentPayload),
      });

      if (!docResponse.ok) {
        const data = await docResponse.json();
        alert(data.error || "Wystąpił błąd podczas zapisywania dokumentu");
        return;
      }

      // Reset form and refresh documents
      setDocumentFormData(initialDocumentFormData);
      setDocumentFile(null);
      setShowDocumentForm(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }
      fetchDocuments(editingTrailer.id);
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Wystąpił błąd podczas dodawania dokumentu");
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten dokument?")) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Wystąpił błąd podczas usuwania dokumentu");
        return;
      }

      if (editingTrailer) {
        fetchDocuments(editingTrailer.id);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Wystąpił błąd podczas usuwania dokumentu");
    }
  };

  // Get document status based on expiry date
  const getDocumentStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "ok", label: "Bezterminowy", color: "text-gray-500" };

    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: "expired", label: "Wygasły", color: "text-red-600", icon: AlertTriangle };
    } else if (daysUntilExpiry <= 30) {
      return { status: "warning", label: `Wygasa za ${daysUntilExpiry} dni`, color: "text-amber-600", icon: Clock };
    } else {
      return { status: "ok", label: "Ważny", color: "text-emerald-600", icon: CheckCircle };
    }
  };

  // Get primary photo for a trailer
  const getPrimaryPhoto = (trailer: Trailer): TrailerPhoto | undefined => {
    return trailer.photos?.find((p) => p.isPrimary) || trailer.photos?.[0];
  };

  const stats = {
    total: pagination.total,
    active: trailers.filter((t) => t.status === "ACTIVE").length,
    inService: trailers.filter((t) => t.status === "IN_SERVICE").length,
  };

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Wszystkie naczepy
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
              Aktywne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.active}</p>
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
      </div>

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
          <CardTitle>Lista naczep</CardTitle>
          <CardDescription>
            Znaleziono {pagination.total} naczep
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trailers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Container className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nie znaleziono naczep</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Zdjęcie</TableHead>
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
                {trailers.map((trailer) => {
                  const primaryPhoto = getPrimaryPhoto(trailer);
                  return (
                    <TableRow key={trailer.id}>
                      <TableCell>
                        <div
                          className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80"
                          onClick={() => handleEdit(trailer)}
                        >
                          {primaryPhoto ? (
                            <Image
                              src={primaryPhoto.url}
                              alt={trailer.registrationNumber}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
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
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(trailer.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog with Tabs */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTrailer ? `Edytuj naczepę: ${editingTrailer.registrationNumber}` : "Dodaj nową naczepę"}
            </DialogTitle>
            <DialogDescription>
              {editingTrailer
                ? "Zaktualizuj dane naczepy, dodaj zdjęcia lub dokumenty"
                : "Wypełnij dane podstawowe. Po zapisaniu będziesz mógł dodać zdjęcia i dokumenty."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Dane podstawowe</TabsTrigger>
              <TabsTrigger value="photos" disabled={!editingTrailer}>
                Zdjęcia {editingTrailer && photos.length > 0 && `(${photos.length})`}
              </TabsTrigger>
              <TabsTrigger value="documents" disabled={!editingTrailer}>
                Dokumenty {editingTrailer && documents.length > 0 && `(${documents.length})`}
              </TabsTrigger>
            </TabsList>

            {/* Basic Data Tab */}
            <TabsContent value="basic" className="space-y-4">
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

                  {!editingTrailer && (
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      Po zapisaniu naczepy będziesz mógł dodać zdjęcia i dokumenty.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                  >
                    {editingTrailer ? "Zamknij" : "Anuluj"}
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
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-4">
              {/* Upload section */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handleUploadPhotos}
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {uploadingPhotos ? (
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploadingPhotos
                      ? "Przesyłanie..."
                      : "Kliknij lub przeciągnij zdjęcia tutaj"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG, JPG do 10MB (max 10 zdjęć)
                  </span>
                </label>
              </div>

              {/* Photos grid */}
              {photosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Brak zdjęć</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-lg overflow-hidden border"
                    >
                      <div
                        className="aspect-square cursor-pointer"
                        onClick={() => setPreviewPhoto(photo.url)}
                      >
                        <Image
                          src={photo.url}
                          alt="Zdjęcie naczepy"
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {photo.isPrimary && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-0.5 rounded text-xs font-medium">
                          Główne
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!photo.isPrimary && (
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7"
                            onClick={() => handleSetPrimary(photo.id)}
                            title="Ustaw jako główne"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          onClick={() => handleDeletePhoto(photo.id)}
                          title="Usuń"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Zamknij
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              {/* Add document button */}
              {!showDocumentForm && (
                <Button onClick={() => setShowDocumentForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj dokument
                </Button>
              )}

              {/* Document form */}
              {showDocumentForm && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Nowy dokument</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Typ dokumentu *</Label>
                        <Select
                          value={documentFormData.type}
                          onValueChange={handleDocumentTypeChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(documentTypeLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nazwa</Label>
                        <Input
                          value={documentFormData.name}
                          onChange={(e) =>
                            setDocumentFormData({ ...documentFormData, name: e.target.value })
                          }
                          placeholder="Nazwa dokumentu"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data ważności</Label>
                        <Input
                          type="date"
                          value={documentFormData.expiryDate}
                          onChange={(e) =>
                            setDocumentFormData({ ...documentFormData, expiryDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Plik *</Label>
                        <Input
                          ref={documentInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Opis (opcjonalny)</Label>
                      <Textarea
                        value={documentFormData.description}
                        onChange={(e) =>
                          setDocumentFormData({ ...documentFormData, description: e.target.value })
                        }
                        placeholder="Dodatkowe informacje o dokumencie..."
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDocumentForm(false);
                          setDocumentFormData(initialDocumentFormData);
                          setDocumentFile(null);
                        }}
                      >
                        Anuluj
                      </Button>
                      <Button
                        onClick={handleUploadDocument}
                        disabled={uploadingDocument || !documentFile}
                      >
                        {uploadingDocument ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Przesyłanie...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Dodaj dokument
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents list */}
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Brak dokumentów</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Nazwa</TableHead>
                      <TableHead>Data ważności</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const status = getDocumentStatus(doc.expiryDate);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {documentTypeLabels[doc.type] || doc.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground">{doc.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.expiryDate
                              ? new Date(doc.expiryDate).toLocaleDateString("pl-PL")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 ${status.color}`}>
                              {StatusIcon && <StatusIcon className="h-4 w-4" />}
                              <span className="text-sm">{status.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => window.open(doc.fileUrl, "_blank")}
                                title="Pobierz"
                              >
                                <File className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600"
                                onClick={() => handleDeleteDocument(doc.id)}
                                title="Usuń"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Zamknij
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Photo preview modal */}
      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative">
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setPreviewPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Image
                src={previewPhoto}
                alt="Podgląd zdjęcia"
                width={1200}
                height={800}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
