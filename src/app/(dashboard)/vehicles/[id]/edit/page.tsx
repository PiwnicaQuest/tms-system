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
  Truck,
  ArrowLeft,
  Save,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

type VehicleStatus = "ACTIVE" | "INACTIVE" | "IN_SERVICE" | "SOLD";
type VehicleType = "TRUCK" | "BUS" | "SOLO" | "TRAILER" | "CAR";
type FuelType = "DIESEL" | "PETROL" | "LPG" | "ELECTRIC" | "HYBRID";

const statusLabels: Record<VehicleStatus, string> = {
  ACTIVE: "Aktywny",
  IN_SERVICE: "W serwisie",
  INACTIVE: "Nieaktywny",
  SOLD: "Sprzedany",
};

const typeLabels: Record<VehicleType, string> = {
  TRUCK: "Ciągnik",
  BUS: "Bus",
  SOLO: "Solówka",
  TRAILER: "Naczepa",
  CAR: "Osobówka",
};

const fuelLabels: Record<FuelType, string> = {
  DIESEL: "Diesel",
  PETROL: "Benzyna",
  LPG: "LPG",
  ELECTRIC: "Elektryczny",
  HYBRID: "Hybryda",
};

interface Vehicle {
  id: string;
  registrationNumber: string;
  type: VehicleType;
  brand: string | null;
  model: string | null;
  vin: string | null;
  year: number | null;
  status: VehicleStatus;
  loadCapacity: number | null;
  volume: number | null;
  euroClass: string | null;
  fuelType: FuelType | null;
  notes: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VehicleEditPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    registrationNumber: "",
    type: "TRUCK" as VehicleType,
    brand: "",
    model: "",
    vin: "",
    year: new Date().getFullYear(),
    status: "ACTIVE" as VehicleStatus,
    loadCapacity: "",
    volume: "",
    euroClass: "",
    fuelType: "DIESEL" as FuelType,
    notes: "",
    imageUrl: null as string | null,
  });

  // Fetch vehicle data
  useEffect(() => {
    const fetchVehicle = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/vehicles/${resolvedParams.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Pojazd nie został znaleziony");
          } else {
            throw new Error("Failed to fetch vehicle");
          }
          return;
        }

        const data = await response.json();
        const vehicle: Vehicle = data.data;

        setFormData({
          registrationNumber: vehicle.registrationNumber,
          type: vehicle.type,
          brand: vehicle.brand || "",
          model: vehicle.model || "",
          vin: vehicle.vin || "",
          year: vehicle.year || new Date().getFullYear(),
          status: vehicle.status,
          loadCapacity: vehicle.loadCapacity?.toString() || "",
          volume: vehicle.volume?.toString() || "",
          euroClass: vehicle.euroClass || "",
          fuelType: vehicle.fuelType || "DIESEL",
          notes: vehicle.notes || "",
          imageUrl: vehicle.imageUrl || null,
        });
      } catch (err) {
        console.error("Error fetching vehicle:", err);
        setError("Wystąpił błąd podczas pobierania danych pojazdu");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [resolvedParams.id]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    try {
      const payload = {
        registrationNumber: formData.registrationNumber,
        type: formData.type,
        brand: formData.brand || null,
        model: formData.model || null,
        vin: formData.vin || null,
        year: formData.year || null,
        status: formData.status,
        loadCapacity: formData.loadCapacity ? parseFloat(formData.loadCapacity) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        euroClass: formData.euroClass || null,
        fuelType: formData.fuelType,
        notes: formData.notes || null,
        imageUrl: formData.imageUrl || null,
      };

      const response = await fetch(`/api/vehicles/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setFormErrors({ registrationNumber: data.error });
        } else {
          throw new Error(data.error || "Failed to save vehicle");
        }
        return;
      }

      router.push(`/vehicles/${resolvedParams.id}`);
    } catch (err) {
      console.error("Error saving vehicle:", err);
      alert("Wystąpił błąd podczas zapisywania pojazdu");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vehicles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edycja pojazdu</h1>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg">{error}</p>
            <Button className="mt-4" asChild>
              <Link href="/vehicles">Powrót do listy</Link>
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
            <Link href={`/vehicles/${resolvedParams.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Truck className="h-8 w-8" />
              Edycja pojazdu
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
                Podstawowe informacje o pojeździe
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
                    placeholder="np. WGM1068L"
                    required
                  />
                  {formErrors.registrationNumber && (
                    <p className="text-sm text-red-600">{formErrors.registrationNumber}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Typ pojazdu *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: VehicleType) =>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marka</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="np. MAN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="np. TGX 18.480"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                    onValueChange={(value: VehicleStatus) =>
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
                <div className="space-y-2">
                  <Label htmlFor="fuelType">Rodzaj paliwa</Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value: FuelType) =>
                      setFormData({ ...formData, fuelType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fuelLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) =>
                    setFormData({ ...formData, vin: e.target.value.toUpperCase() })
                  }
                  placeholder="Numer VIN"
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Dane techniczne</CardTitle>
              <CardDescription>
                Parametry techniczne pojazdu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="euroClass">Klasa Euro</Label>
                <Input
                  id="euroClass"
                  value={formData.euroClass}
                  onChange={(e) =>
                    setFormData({ ...formData, euroClass: e.target.value })
                  }
                  placeholder="np. Euro 6"
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
                  placeholder="Dodatkowe informacje o pojeździe..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Zdjęcie pojazdu</CardTitle>
              <CardDescription>
                Dodaj lub zmień zdjęcie pojazdu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                entityType="vehicle"
                entityId={resolvedParams.id}
                disabled={saving}
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href={`/vehicles/${resolvedParams.id}`}>
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
