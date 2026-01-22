"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Upload, X } from "lucide-react";

// Cost categories with Polish labels
export const costCategoryLabels: Record<string, string> = {
  FUEL: "Paliwo",
  SERVICE: "Serwis / Naprawa",
  TOLL: "Opłaty drogowe",
  INSURANCE: "Ubezpieczenie",
  PARKING: "Parking",
  FINE: "Mandaty",
  SALARY: "Wynagrodzenie",
  TAX: "Podatki",
  OFFICE: "Koszty biurowe",
  OTHER: "Inne",
};

interface CostAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType?: "vehicle" | "driver";
  entityId?: string;
  entityName?: string;
  onSuccess?: () => void;
}

export function CostAddDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  onSuccess,
}: CostAddDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    currency: "PLN",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        category: "",
        description: "",
        amount: "",
        currency: "PLN",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setSelectedFile(null);
      setError(null);
    }
  }, [open]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Plik jest za duży. Maksymalny rozmiar to 10MB.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let attachmentUrl: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          throw new Error("Nie udało się przesłać załącznika");
        }

        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.url;
      }

      // Create cost record
      const costData: Record<string, unknown> = {
        category: formData.category,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        date: formData.date,
        notes: formData.notes || undefined,
        attachmentUrl,
      };

      // Add entity reference
      if (entityType === "vehicle" && entityId) {
        costData.vehicleId = entityId;
      } else if (entityType === "driver" && entityId) {
        costData.driverId = entityId;
      }

      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(costData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Nie udało się dodać kosztu");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj koszt</DialogTitle>
          <DialogDescription>
            {entityName
              ? `Dodaj nowy koszt dla: ${entityName}`
              : "Wprowadź dane nowego kosztu"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Kategoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
                required
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(costCategoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Kwota *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Waluta</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLN">PLN</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="np. Tankowanie na stacji Shell"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Uwagi</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Dodatkowe informacje..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Załącznik (faktura/paragon)</Label>
            {selectedFile ? (
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                <span className="text-sm truncate">{selectedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("file")?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Wybierz plik
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG lub WebP (maks. 10MB)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading || !formData.category || !formData.amount}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Dodaj koszt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
