"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  ArrowLeft,
  Save,
  MapPin,
  Truck,
  Building2,
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  Route,
} from "lucide-react";

// Types
interface Contractor {
  id: string;
  name: string;
  shortName: string | null;
  type: "CLIENT" | "CARRIER" | "BOTH";
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  type: string;
  status: string;
}

interface Trailer {
  id: string;
  registrationNumber: string;
  type: string;
  status: string;
}

interface Waypoint {
  id?: string;
  address: string;
  city: string;
  country: string;
}

interface Order {
  id: string;
  orderNumber: string;
  externalNumber: string | null;
  type: "OWN" | "FORWARDING";
  status: string;
  contractorId: string | null;
  subcontractorId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  trailerId: string | null;
  origin: string;
  originCity: string | null;
  originPostalCode: string | null;
  originCountry: string;
  destination: string;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  destinationCountry: string;
  distanceKm: number | null;
  loadingDate: string;
  loadingTimeFrom: string | null;
  loadingTimeTo: string | null;
  unloadingDate: string;
  unloadingTimeFrom: string | null;
  unloadingTimeTo: string | null;
  cargoDescription: string | null;
  cargoWeight: number | null;
  cargoVolume: number | null;
  cargoPallets: number | null;
  cargoValue: number | null;
  requiresAdr: boolean;
  priceNet: number | null;
  currency: string;
  costNet: number | null;
  notes: string | null;
  internalNotes: string | null;
  waypoints?: Array<{
    id: string;
    type: string;
    address: string;
    city: string | null;
    country: string;
  }>;
}

const countries = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "CZ", name: "Czechy" },
  { code: "SK", name: "Slowacja" },
  { code: "AT", name: "Austria" },
  { code: "NL", name: "Holandia" },
  { code: "BE", name: "Belgia" },
  { code: "FR", name: "Francja" },
  { code: "IT", name: "Wlochy" },
  { code: "ES", name: "Hiszpania" },
  { code: "GB", name: "Wielka Brytania" },
  { code: "DK", name: "Dania" },
  { code: "SE", name: "Szwecja" },
  { code: "HU", name: "Wegry" },
  { code: "RO", name: "Rumunia" },
  { code: "BG", name: "Bulgaria" },
  { code: "LT", name: "Litwa" },
  { code: "LV", name: "Lotwa" },
  { code: "EE", name: "Estonia" },
];

const currencies = ["PLN", "EUR", "USD", "GBP", "CZK", "CHF"];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditOrderPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // Resources
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);

  // Fetch order and resources
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderRes, contractorsRes, driversRes, vehiclesRes, trailersRes] = await Promise.all([
          fetch(`/api/orders/${id}`),
          fetch("/api/contractors?limit=200"),
          fetch("/api/drivers?limit=200"),
          fetch("/api/vehicles?limit=200"),
          fetch("/api/trailers?limit=200"),
        ]);

        if (!orderRes.ok) {
          throw new Error("Nie znaleziono zlecenia");
        }

        const orderData = await orderRes.json();
        setOrder(orderData);

        // Initialize waypoints from order data (STOP type only)
        if (orderData.waypoints) {
          const stopWaypoints = orderData.waypoints
            .filter((wp: { type: string }) => wp.type === "STOP")
            .map((wp: { id: string; address: string; city: string | null; country: string }) => ({
              id: wp.id,
              address: wp.address,
              city: wp.city || "",
              country: wp.country || "PL",
            }));
          setWaypoints(stopWaypoints);
        }

        if (contractorsRes.ok) {
          const data = await contractorsRes.json();
          setContractors(data.data || []);
        }

        if (driversRes.ok) {
          const data = await driversRes.json();
          setDrivers((data.data || []).filter((d: Driver) => d.status === "ACTIVE"));
        }

        if (vehiclesRes.ok) {
          const data = await vehiclesRes.json();
          setVehicles((data.data || []).filter((v: Vehicle) => v.status === "ACTIVE"));
        }

        if (trailersRes.ok) {
          const data = await trailersRes.json();
          setTrailers((data.data || []).filter((t: Trailer) => t.status === "ACTIVE"));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrors({ general: "Wystapil blad podczas ladowania danych" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setOrder(prev => prev ? {
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    } : null);

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setOrder(prev => prev ? { ...prev, [name]: value === "none" ? null : value } : null);
  };

  // Waypoint management
  const addWaypoint = () => {
    setWaypoints(prev => [...prev, { address: "", city: "", country: "PL" }]);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index: number, field: "address" | "city" | "country", value: string) => {
    setWaypoints(prev => prev.map((wp, i) => i === index ? { ...wp, [field]: value } : wp));
  };

  // Calculate distance
  const calculateDistance = async () => {
    if (!order?.origin || !order?.destination) {
      setErrors(prev => ({ ...prev, distance: "Wprowadz adresy zaladunku i rozladunku" }));
      return;
    }

    setCalculatingDistance(true);
    setErrors(prev => ({ ...prev, distance: "" }));

    try {
      const response = await fetch("/api/routes/calculate-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: `${order.origin}, ${order.originPostalCode || ""} ${order.originCity || ""}, ${order.originCountry}`.trim(),
          destination: `${order.destination}, ${order.destinationPostalCode || ""} ${order.destinationCity || ""}, ${order.destinationCountry}`.trim(),
          originCountry: order.originCountry,
          destinationCountry: order.destinationCountry,
          waypoints: waypoints.filter(wp => wp.address.trim()).map(wp => ({
            address: `${wp.address}, ${wp.city || ""}, ${wp.country}`.trim(),
            country: wp.country || "PL",
          })),
          profile: "driving-hgv",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Blad obliczania dystansu");
      }

      const data = await response.json();
      setOrder(prev => prev ? { ...prev, distanceKm: data.distanceKm } : null);
    } catch (error) {
      console.error("Error calculating distance:", error);
      setErrors(prev => ({
        ...prev,
        distance: error instanceof Error ? error.message : "Blad obliczania dystansu",
      }));
    } finally {
      setCalculatingDistance(false);
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!order?.origin?.trim()) {
      newErrors.origin = "Miejsce zaladunku jest wymagane";
    }

    if (!order?.destination?.trim()) {
      newErrors.destination = "Miejsce rozladunku jest wymagane";
    }

    if (!order?.loadingDate) {
      newErrors.loadingDate = "Data zaladunku jest wymagana";
    }

    if (!order?.unloadingDate) {
      newErrors.unloadingDate = "Data rozladunku jest wymagana";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !order) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...order,
          waypoints: waypoints.filter(wp => wp.address.trim()).map((wp, index) => ({
            id: wp.id,
            sequence: index + 1,
            type: "STOP",
            address: wp.address,
            city: wp.city || null,
            country: wp.country || "PL",
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Blad podczas zapisywania");
      }

      router.push(`/orders/${id}`);
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Wystapil blad podczas zapisywania zlecenia");
    } finally {
      setSaving(false);
    }
  };

  // Filter contractors
  const clientContractors = contractors.filter(c => c.type === "CLIENT" || c.type === "BOTH");
  const carrierContractors = contractors.filter(c => c.type === "CARRIER" || c.type === "BOTH");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">Nie znaleziono zlecenia</p>
        <Button asChild>
          <Link href="/orders">Powrot do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/orders/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edytuj zlecenie</h1>
            <p className="text-muted-foreground">{order.orderNumber}</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Zapisz zmiany
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="route" className="space-y-4">
          <TabsList>
            <TabsTrigger value="route">
              <MapPin className="h-4 w-4 mr-2" />
              Trasa
            </TabsTrigger>
            <TabsTrigger value="basic">
              <Package className="h-4 w-4 mr-2" />
              Podstawowe
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Finanse
            </TabsTrigger>
          </TabsList>

          {/* Route Tab */}
          <TabsContent value="route">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Trasa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Loading */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-600 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600" />
                    Zaladunek
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="origin">Adres zaladunku *</Label>
                      <Input
                        id="origin"
                        name="origin"
                        value={order.origin}
                        onChange={handleChange}
                        placeholder="Ulica, numer"
                        className={errors.origin ? "border-destructive" : ""}
                      />
                      {errors.origin && <p className="text-sm text-destructive">{errors.origin}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originCity">Miasto</Label>
                      <Input
                        id="originCity"
                        name="originCity"
                        value={order.originCity || ""}
                        onChange={handleChange}
                        placeholder="Miasto"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originPostalCode">Kod pocztowy</Label>
                      <Input
                        id="originPostalCode"
                        name="originPostalCode"
                        value={order.originPostalCode || ""}
                        onChange={handleChange}
                        placeholder="00-000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originCountry">Kraj</Label>
                      <Select value={order.originCountry} onValueChange={(v) => handleSelectChange("originCountry", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loadingDate">Data zaladunku *</Label>
                      <Input
                        id="loadingDate"
                        name="loadingDate"
                        type="date"
                        value={order.loadingDate?.split("T")[0] || ""}
                        onChange={handleChange}
                        className={errors.loadingDate ? "border-destructive" : ""}
                      />
                      {errors.loadingDate && <p className="text-sm text-destructive">{errors.loadingDate}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loadingTimeFrom">Godzina od</Label>
                      <Input
                        id="loadingTimeFrom"
                        name="loadingTimeFrom"
                        type="time"
                        value={order.loadingTimeFrom || ""}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loadingTimeTo">Godzina do</Label>
                      <Input
                        id="loadingTimeTo"
                        name="loadingTimeTo"
                        type="time"
                        value={order.loadingTimeTo || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Waypoints */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-600 flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      Punkty posrednie (opcjonalne)
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addWaypoint}>
                      <Plus className="h-4 w-4 mr-1" />
                      Dodaj punkt
                    </Button>
                  </div>
                  
                  {waypoints.length > 0 && (
                    <div className="space-y-3">
                      {waypoints.map((wp, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 grid gap-3 md:grid-cols-4">
                            <div className="md:col-span-2">
                              <Input
                                placeholder="Adres"
                                value={wp.address}
                                onChange={(e) => updateWaypoint(index, "address", e.target.value)}
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Miasto"
                                value={wp.city}
                                onChange={(e) => updateWaypoint(index, "city", e.target.value)}
                              />
                            </div>
                            <div>
                              <Select value={wp.country} onValueChange={(v) => updateWaypoint(index, "country", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeWaypoint(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {waypoints.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Mozesz dodac punkty posrednie trasy, ktore zostana uwzglednione w obliczeniu dystansu.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Unloading */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-red-600 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    Rozladunek
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="destination">Adres rozladunku *</Label>
                      <Input
                        id="destination"
                        name="destination"
                        value={order.destination}
                        onChange={handleChange}
                        placeholder="Ulica, numer"
                        className={errors.destination ? "border-destructive" : ""}
                      />
                      {errors.destination && <p className="text-sm text-destructive">{errors.destination}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationCity">Miasto</Label>
                      <Input
                        id="destinationCity"
                        name="destinationCity"
                        value={order.destinationCity || ""}
                        onChange={handleChange}
                        placeholder="Miasto"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationPostalCode">Kod pocztowy</Label>
                      <Input
                        id="destinationPostalCode"
                        name="destinationPostalCode"
                        value={order.destinationPostalCode || ""}
                        onChange={handleChange}
                        placeholder="00-000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationCountry">Kraj</Label>
                      <Select value={order.destinationCountry} onValueChange={(v) => handleSelectChange("destinationCountry", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unloadingDate">Data rozladunku *</Label>
                      <Input
                        id="unloadingDate"
                        name="unloadingDate"
                        type="date"
                        value={order.unloadingDate?.split("T")[0] || ""}
                        onChange={handleChange}
                        className={errors.unloadingDate ? "border-destructive" : ""}
                      />
                      {errors.unloadingDate && <p className="text-sm text-destructive">{errors.unloadingDate}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unloadingTimeFrom">Godzina od</Label>
                      <Input
                        id="unloadingTimeFrom"
                        name="unloadingTimeFrom"
                        type="time"
                        value={order.unloadingTimeFrom || ""}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unloadingTimeTo">Godzina do</Label>
                      <Input
                        id="unloadingTimeTo"
                        name="unloadingTimeTo"
                        type="time"
                        value={order.unloadingTimeTo || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Distance */}
                <div className="flex items-end gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distanceKm">Dystans (km)</Label>
                    <Input
                      id="distanceKm"
                      name="distanceKm"
                      type="number"
                      value={order.distanceKm || ""}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-[200px]"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={calculateDistance} disabled={calculatingDistance}>
                    {calculatingDistance ? <Loader2 className="h-4 w-4 animate-spin" /> : "Oblicz dystans"}
                  </Button>
                </div>
                {errors.distance && <p className="text-sm text-destructive">{errors.distance}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Basic Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Podstawowe informacje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="externalNumber">Numer zewnetrzny</Label>
                    <Input
                      id="externalNumber"
                      name="externalNumber"
                      value={order.externalNumber || ""}
                      onChange={handleChange}
                      placeholder="Numer zlecenia klienta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Typ zlecenia</Label>
                    <Select value={order.type} onValueChange={(v) => handleSelectChange("type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWN">Wlasny transport</SelectItem>
                        <SelectItem value="FORWARDING">Spedycja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contractorId" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Klient / Zleceniodawca
                    </Label>
                    <Select value={order.contractorId || "none"} onValueChange={(v) => handleSelectChange("contractorId", v)}>
                      <SelectTrigger><SelectValue placeholder="Wybierz klienta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
                        {clientContractors.map(c => <SelectItem key={c.id} value={c.id}>{c.shortName || c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {order.type === "FORWARDING" && (
                    <div className="space-y-2">
                      <Label htmlFor="subcontractorId" className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Przewoznik / Podwykonawca
                      </Label>
                      <Select value={order.subcontractorId || "none"} onValueChange={(v) => handleSelectChange("subcontractorId", v)}>
                        <SelectTrigger><SelectValue placeholder="Wybierz przewoznika" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Brak</SelectItem>
                          {carrierContractors.map(c => <SelectItem key={c.id} value={c.id}>{c.shortName || c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Cargo */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Ladunek</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="cargoDescription">Opis ladunku</Label>
                      <Input
                        id="cargoDescription"
                        name="cargoDescription"
                        value={order.cargoDescription || ""}
                        onChange={handleChange}
                        placeholder="np. Palety z elektroniką"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargoWeight">Waga (kg)</Label>
                      <Input
                        id="cargoWeight"
                        name="cargoWeight"
                        type="number"
                        value={order.cargoWeight || ""}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargoPallets">Ilosc palet</Label>
                      <Input
                        id="cargoPallets"
                        name="cargoPallets"
                        type="number"
                        value={order.cargoPallets || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="notes">Uwagi</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={order.notes || ""}
                    onChange={handleChange}
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    placeholder="Uwagi widoczne dla klienta"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Uwagi wewnetrzne</Label>
                  <textarea
                    id="internalNotes"
                    name="internalNotes"
                    value={order.internalNotes || ""}
                    onChange={handleChange}
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    placeholder="Notatki wewnetrzne"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Finanse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="priceNet">Cena netto</Label>
                    <Input
                      id="priceNet"
                      name="priceNet"
                      type="number"
                      step="0.01"
                      value={order.priceNet || ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Waluta</Label>
                    <Select value={order.currency} onValueChange={(v) => handleSelectChange("currency", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costNet">Koszt netto</Label>
                    <Input
                      id="costNet"
                      name="costNet"
                      type="number"
                      step="0.01"
                      value={order.costNet || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
