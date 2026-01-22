"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, X, RefreshCw, AlertCircle } from "lucide-react";

// Document types for vehicles
const vehicleDocumentTypes = [
  { value: "VEHICLE_REGISTRATION", label: "Dowód rejestracyjny" },
  { value: "VEHICLE_INSURANCE_OC", label: "Ubezpieczenie OC" },
  { value: "VEHICLE_INSURANCE_AC", label: "Ubezpieczenie AC" },
  { value: "VEHICLE_INSPECTION", label: "Przegląd techniczny" },
  { value: "TACHOGRAPH_CALIBRATION", label: "Kalibracja tachografu" },
  { value: "OTHER", label: "Inny dokument" },
];

// Document types for trailers
const trailerDocumentTypes = [
  { value: "VEHICLE_REGISTRATION", label: "Dowód rejestracyjny" },
  { value: "VEHICLE_INSURANCE_OC", label: "Ubezpieczenie OC" },
  { value: "VEHICLE_INSURANCE_AC", label: "Ubezpieczenie AC" },
  { value: "VEHICLE_INSPECTION", label: "Przegląd techniczny" },
  { value: "OTHER", label: "Inny dokument" },
];

// Document types for drivers
const driverDocumentTypes = [
  { value: "DRIVER_LICENSE", label: "Prawo jazdy" },
  { value: "DRIVER_ADR", label: "Zaświadczenie ADR" },
  { value: "DRIVER_MEDICAL", label: "Badania lekarskie" },
  { value: "DRIVER_PSYCHO", label: "Badania psychologiczne" },
  { value: "DRIVER_QUALIFICATION", label: "Kwalifikacja zawodowa" },
  { value: "OTHER", label: "Inny dokument" },
];

type EntityType = "vehicle" | "trailer" | "driver";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  onSuccess,
}: DocumentUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    type: "",
    name: "",
    description: "",
    expiryDate: "",
  });

  const documentTypes = 
    entityType === "vehicle" ? vehicleDocumentTypes :
    entityType === "trailer" ? trailerDocumentTypes :
    driverDocumentTypes;

  const entityLabel = 
    entityType === "vehicle" ? "pojazdu" :
    entityType === "trailer" ? "naczepy" :
    "kierowcy";

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError("Dozwolone formaty: JPG, PNG, WebP, PDF");
      return;
    }

    if (file.size > maxSize) {
      setError("Maksymalny rozmiar pliku to 10MB");
      return;
    }

    setError(null);
    setFile(file);

    // Auto-fill name if empty
    if (!formData.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, name: nameWithoutExt }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Wybierz plik do przesłania");
      return;
    }

    if (!formData.type) {
      setError("Wybierz typ dokumentu");
      return;
    }

    if (!formData.name) {
      setError("Podaj nazwę dokumentu");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload file
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("entityType", entityType);
      uploadFormData.append("entityId", entityId);

      const uploadResponse = await fetch("/api/documents/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || "Błąd podczas przesyłania pliku");
      }

      const uploadResult = await uploadResponse.json();

      // Step 2: Create document record
      const documentPayload: Record<string, unknown> = {
        type: formData.type,
        name: formData.name,
        description: formData.description || null,
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        expiryDate: formData.expiryDate || null,
      };

      // Add entity reference
      if (entityType === "vehicle") {
        documentPayload.vehicleId = entityId;
      } else if (entityType === "trailer") {
        documentPayload.trailerId = entityId;
      } else if (entityType === "driver") {
        documentPayload.driverId = entityId;
      }

      const createResponse = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentPayload),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || "Błąd podczas tworzenia dokumentu");
      }

      // Reset form and close dialog
      setFile(null);
      setFormData({ type: "", name: "", description: "", expiryDate: "" });
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error uploading document:", err);
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas dodawania dokumentu");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setFormData({ type: "", name: "", description: "", expiryDate: "" });
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj dokument</DialogTitle>
          <DialogDescription>
            Dodaj dokument do {entityLabel}: {entityName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* File Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              
              <div className="text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">
                      Przeciągnij plik lub kliknij aby wybrać
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG, WebP • max 10MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Typ dokumentu *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ dokumentu" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa dokumentu *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. Polisa OC 2024"
                disabled={uploading}
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Data ważności</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Pozostaw puste jeśli dokument nie ma daty ważności
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Opis (opcjonalnie)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Dodatkowe informacje..."
                disabled={uploading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? (
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Export document type labels for use in other components
export const documentTypeLabels: Record<string, string> = {
  VEHICLE_REGISTRATION: "Dowód rejestracyjny",
  VEHICLE_INSURANCE_OC: "Ubezpieczenie OC",
  VEHICLE_INSURANCE_AC: "Ubezpieczenie AC",
  VEHICLE_INSPECTION: "Przegląd techniczny",
  TACHOGRAPH_CALIBRATION: "Kalibracja tachografu",
  DRIVER_LICENSE: "Prawo jazdy",
  DRIVER_ADR: "Zaświadczenie ADR",
  DRIVER_MEDICAL: "Badania lekarskie",
  DRIVER_PSYCHO: "Badania psychologiczne",
  DRIVER_QUALIFICATION: "Kwalifikacja zawodowa",
  COMPANY_LICENSE: "Licencja transportowa",
  COMPANY_INSURANCE: "Ubezpieczenie firmowe",
  COMPANY_CERTIFICATE: "Certyfikat firmowy",
  CMR: "List przewozowy CMR",
  DELIVERY_NOTE: "Dokument dostawy",
  OTHER: "Inny",
};
