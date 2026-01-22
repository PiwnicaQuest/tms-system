"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Container,
  ArrowLeft,
  Save,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

type TrailerStatus = "ACTIVE" | "IN_SERVICE" | "INACTIVE" | "SOLD";
type TrailerType = "CURTAIN" | "REFRIGERATOR" | "TANKER" | "FLATBED" | "MEGA" | "BOX" | "TIPPER" | "OTHER";

const statusLabels: Record<TrailerStatus, string> = {
  ACTIVE: "Aktywna",
  IN_SERVICE: "W serwisie",
  INACTIVE: "Nieaktywna",
  SOLD: "Sprzedana",
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
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TrailerEditPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
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
    imageUrl: null as string | null,
  });

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
        const trailer: Trailer = data.data;

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
          imageUrl: trailer.imageUrl || null,
        });
      } catch (err) {
        console.error("Error fetching trailer:", err);
        setError("Wystąpił błąd podczas pobierania danych naczepy");
      } finally {
        setLoading(false);
      }
    };

    fetchTrailer();
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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
        imageUrl: formData.imageUrl || null,
      };

      const response = await fetch(`/api/trailers/${resolvedParams.id}`, {
        method: "PUT",
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

      router.push(`/trailers/${resolvedParams.id}`);
    } catch (err) {
      console.error("Error saving trailer:", err);
      alert("Wystąpił błąd podczas zapisywania naczepy");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trailers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edycja naczepy</h1>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg">{error}</p>
            <Button className="mt-4" asChild>
              <Link href="/trailers">Powrót do listy</Link>
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
            <Link href={`/trailers/${resolvedParams.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Container className="h-8 w-8" />
              Edycja naczepy
            </h1>
            <p className="text-muted-foreground">
              {formData.registrationNumber}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Dane podstawowe</CardTitle>
              <CardDescription>
                Podstawowe informacje o naczepie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Technical Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Dane techniczne</CardTitle>
              <CardDescription>
                Parametry techniczne naczepy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Dodatkowe informacje o naczepie..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Zdjęcie naczepy</CardTitle>
              <CardDescription>
                Dodaj lub zmień zdjęcie naczepy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                entityType="trailer"
                entityId={resolvedParams.id}
                disabled={saving}
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href={`/trailers/${resolvedParams.id}`}>
              Anuluj
            </Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Zapisz zmiany
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
