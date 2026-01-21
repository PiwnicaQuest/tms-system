"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  Receipt,
  Calculator,
  PieChart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

type ExportType = "invoices" | "costs" | "settlements";
type ExportFormat = "csv" | "xml" | "json";

interface PreviewResult {
  success: boolean;
  filename: string;
  recordCount: number;
  error?: string;
}

const exportTypes: {
  value: ExportType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "invoices",
    label: "Faktury",
    icon: Receipt,
    description: "Eksport faktur sprzedażowych z danymi kontrahentów",
  },
  {
    value: "costs",
    label: "Koszty",
    icon: Calculator,
    description: "Eksport kosztów operacyjnych (paliwo, opłaty, serwis)",
  },
  {
    value: "settlements",
    label: "Rozliczenie okresowe",
    icon: PieChart,
    description: "Podsumowanie przychodów i kosztów za wybrany okres",
  },
];

const exportFormats: {
  value: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "csv",
    label: "CSV",
    icon: FileSpreadsheet,
    description: "Format arkusza kalkulacyjnego (Excel, Libre Office)",
  },
  {
    value: "xml",
    label: "XML",
    icon: FileText,
    description: "Format XML dla systemów FK (Symfonia, Optima, etc.)",
  },
  {
    value: "json",
    label: "JSON",
    icon: FileJson,
    description: "Format JSON dla integracji API",
  },
];

const quickPeriods = [
  { label: "Bieżący miesiąc", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Poprzedni miesiąc", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Ostatnie 3 miesiące", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: "Ostatnie 6 miesięcy", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: "Bieżący rok", getValue: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date(new Date().getFullYear(), 11, 31) }) },
];

export default function ExportPage() {
  const [exportType, setExportType] = useState<ExportType | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const handleQuickPeriod = (getValue: () => { from: Date; to: Date }) => {
    const { from, to } = getValue();
    setDateFrom(format(from, "yyyy-MM-dd"));
    setDateTo(format(to, "yyyy-MM-dd"));
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!exportType) {
      toast.error("Wybierz typ eksportu");
      return;
    }

    setPreviewing(true);
    setPreview(null);

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: exportType,
          format: exportFormat,
          dateFrom,
          dateTo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Błąd podglądu");
        setPreview({ success: false, filename: "", recordCount: 0, error: data.error });
        return;
      }

      setPreview(data);
      if (data.recordCount === 0) {
        toast.warning("Brak danych do eksportu w wybranym okresie");
      }
    } catch {
      toast.error("Błąd połączenia z serwerem");
    } finally {
      setPreviewing(false);
    }
  };

  const handleExport = async () => {
    if (!exportType) {
      toast.error("Wybierz typ eksportu");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        type: exportType,
        format: exportFormat,
        dateFrom,
        dateTo,
      });

      const res = await fetch(`/api/export?${params}`);

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Błąd eksportu");
        return;
      }

      // Download file
      const blob = await res.blob();
      const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `export.${exportFormat}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const recordCount = res.headers.get("X-Record-Count");
      toast.success(`Wyeksportowano ${recordCount || ""} rekordów`);
    } catch {
      toast.error("Błąd eksportu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Download className="h-8 w-8" />
          Eksport FK
        </h1>
        <p className="text-muted-foreground">
          Eksportuj dane do systemów finansowo-księgowych
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Export Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Konfiguracja eksportu</CardTitle>
            <CardDescription>
              Wybierz typ danych, format i zakres dat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Export Type */}
            <div className="space-y-3">
              <Label>Typ eksportu</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {exportTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      exportType === type.value
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setExportType(type.value);
                      setPreview(null);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <type.icon className="h-5 w-5" />
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-3">
              <Label>Format pliku</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {exportFormats.map((fmt) => (
                  <div
                    key={fmt.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      exportFormat === fmt.value
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setExportFormat(fmt.value);
                      setPreview(null);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <fmt.icon className="h-5 w-5" />
                      <span className="font-medium">{fmt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmt.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label>Zakres dat</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {quickPeriods.map((period) => (
                  <Button
                    key={period.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPeriod(period.getValue)}
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom" className="text-sm text-muted-foreground">
                    Od
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPreview(null);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo" className="text-sm text-muted-foreground">
                    Do
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPreview(null);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!exportType || previewing}
              >
                {previewing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sprawdzanie...
                  </>
                ) : (
                  "Sprawdź dane"
                )}
              </Button>
              <Button
                onClick={handleExport}
                disabled={!exportType || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Eksportowanie...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Eksportuj
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview / Info */}
        <Card>
          <CardHeader>
            <CardTitle>Podgląd eksportu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview ? (
              preview.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Dane gotowe do eksportu</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plik:</span>
                      <span className="font-medium">{preview.filename}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rekordów:</span>
                      <Badge variant="secondary">{preview.recordCount}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>{preview.error || "Brak danych do eksportu"}</span>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Wybierz typ eksportu i kliknij "Sprawdź dane"</p>
              </div>
            )}

            {/* Format Info */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Informacje o formacie</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                {exportFormat === "csv" && (
                  <>
                    <p>• Separator: średnik (;)</p>
                    <p>• Kodowanie: UTF-8 z BOM</p>
                    <p>• Zgodny z Excel, LibreOffice</p>
                  </>
                )}
                {exportFormat === "xml" && (
                  <>
                    <p>• Kodowanie: UTF-8</p>
                    <p>• Struktura polska (FK)</p>
                    <p>• Zgodny z Symfonia, Optima</p>
                  </>
                )}
                {exportFormat === "json" && (
                  <>
                    <p>• Format: JSON z wcięciami</p>
                    <p>• Kodowanie: UTF-8</p>
                    <p>• Dla integracji API</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pomoc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Faktury
              </h4>
              <p className="text-sm text-muted-foreground">
                Eksportuje wszystkie faktury sprzedażowe z danymi kontrahentów,
                kwotami w PLN i EUR, statusami płatności oraz powiązanymi zleceniami.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Koszty
              </h4>
              <p className="text-sm text-muted-foreground">
                Eksportuje koszty operacyjne z podziałem na kategorie (paliwo, opłaty,
                serwis, ubezpieczenia, wynagrodzenia, delegacje) z przypisaniem do pojazdów i kierowców.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Rozliczenie
              </h4>
              <p className="text-sm text-muted-foreground">
                Generuje zestawienie zbiorcze z podsumowaniem przychodów z faktur,
                kosztów wg kategorii oraz wyliczonym zyskiem za okres.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
