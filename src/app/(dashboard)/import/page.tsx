"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Truck,
  Users,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

type ImportType = "drivers" | "vehicles" | "contractors";

interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, string>;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  message: string;
}

const importTypes: { value: ImportType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: "drivers",
    label: "Kierowcy",
    icon: Users,
    description: "Import danych kierowców (imię, nazwisko, PESEL, licencje, ADR)",
  },
  {
    value: "vehicles",
    label: "Pojazdy",
    icon: Truck,
    description: "Import danych pojazdów (numer rejestracyjny, typ, marka, model)",
  },
  {
    value: "contractors",
    label: "Kontrahenci",
    icon: Building2,
    description: "Import danych kontrahentów (nazwa, NIP, adres, kontakt)",
  },
];

export default function ImportPage() {
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv") && selectedFile.type !== "text/csv") {
        toast.error("Wybierz plik CSV");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith(".csv") && droppedFile.type !== "text/csv") {
        toast.error("Wybierz plik CSV");
        return;
      }
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const downloadTemplate = async (type: ImportType) => {
    try {
      const res = await fetch(`/api/import?type=${type}&action=template`);
      if (!res.ok) throw new Error("Błąd pobierania szablonu");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `szablon-${type}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Szablon pobrany");
    } catch {
      toast.error("Błąd pobierania szablonu");
    }
  };

  const handleImport = async () => {
    if (!file || !selectedType) {
      toast.error("Wybierz typ importu i plik CSV");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", selectedType);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Błąd importu");
        return;
      }

      setResult(data);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
    } catch {
      toast.error("Błąd importu");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-8 w-8" />
          Import danych
        </h1>
        <p className="text-muted-foreground">
          Importuj dane kierowców, pojazdów lub kontrahentów z pliku CSV
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import Form */}
        <Card>
          <CardHeader>
            <CardTitle>Importuj plik CSV</CardTitle>
            <CardDescription>
              Wybierz typ danych i załaduj plik CSV zgodny z szablonem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Typ importu</Label>
              <Select
                value={selectedType || ""}
                onValueChange={(value) => {
                  setSelectedType(value as ImportType);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ danych" />
                </SelectTrigger>
                <SelectContent>
                  {importTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-sm text-muted-foreground">
                  {importTypes.find((t) => t.value === selectedType)?.description}
                </p>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Plik CSV</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetForm();
                      }}
                    >
                      Zmień plik
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="font-medium">
                      Przeciągnij plik CSV lub kliknij, aby wybrać
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Obsługiwane formaty: CSV (rozdzielany średnikiem)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!file || !selectedType || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importowanie...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importuj dane
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Szablony CSV</CardTitle>
            <CardDescription>
              Pobierz szablon dla wybranego typu danych
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importTypes.map((type) => (
              <div
                key={type.value}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <type.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">
                      szablon-{type.value}.csv
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate(type.value)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Pobierz
                </Button>
              </div>
            ))}

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Ważne informacje
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Plik CSV musi używać średnika (;) jako separatora</li>
                <li>• Pierwszy wiersz musi zawierać nazwy kolumn</li>
                <li>• Daty w formacie YYYY-MM-DD (np. 2025-12-31)</li>
                <li>• Duplikaty (po PESEL, NIP lub nazwie) są pomijane</li>
                <li>• Kodowanie pliku: UTF-8</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              Wynik importu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Zaimportowano: {result.imported}
              </Badge>
              {result.skipped > 0 && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Pominięto: {result.skipped}
                </Badge>
              )}
            </div>

            {/* Errors Table */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Błędy ({result.errors.length})
                </h4>
                <ScrollArea className="h-64 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Wiersz</TableHead>
                        <TableHead className="w-32">Pole</TableHead>
                        <TableHead>Komunikat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{error.row}</TableCell>
                          <TableCell>
                            {error.field ? (
                              <Badge variant="outline">{error.field}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* New Import Button */}
            <Button variant="outline" onClick={resetForm}>
              Nowy import
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
