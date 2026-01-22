"use client";

import { useState, useEffect } from "react";
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
  FileText,
  DollarSign,
  Loader2,
  Plus,
  Users,
  Trash2,
  Percent,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  ContractorQuickAddDialog,
  Contractor as ContractorFull,
} from "@/components/contractors/ContractorQuickAddDialog";
import { AddressAutocomplete } from "@/components/addresses/AddressAutocomplete";
import {
  AutocompleteInput,
  AutocompleteOption,
  fetchContractors,
  fetchDrivers,
  fetchVehicles,
  fetchTrailers,
} from "@/components/ui/autocomplete-input";

// Types
interface PlannedAssignment {
  id: string; // Tymczasowe ID dla UI
  driverId: string;
  vehicleId: string;
  trailerId: string;
  revenueShare: number; // 0-100 (procent)
  distanceKm: string;
  notes: string;
}


interface Waypoint {
  id?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}
interface FormData {
  orderNumber: string;
  externalNumber: string;
  type: "OWN" | "FORWARDING";
  contractorId: string;
  subcontractorId: string;
  driverId: string;
  vehicleId: string;
  trailerId: string;
  origin: string;
  originCity: string;
  originCountry: string;
  originPostalCode: string;
  destination: string;
  destinationCity: string;
  destinationCountry: string;
  destinationPostalCode: string;
  distanceKm: string;
  loadingDate: string;
  loadingTimeFrom: string;
  loadingTimeTo: string;
  unloadingDate: string;
  unloadingTimeFrom: string;
  unloadingTimeTo: string;
  cargoDescription: string;
  cargoWeight: string;
  cargoVolume: string;
  cargoPallets: string;
  cargoValue: string;
  requiresAdr: boolean;
  priceNet: string;
  currency: string;
  costNet: string;
  flatRateKm: string;
  flatRateOverage: string;
  kmLimit: string;
  kmOverageRate: string;
  notes: string;
  internalNotes: string;
}

const initialFormData: FormData = {
  orderNumber: "",
  externalNumber: "",
  type: "OWN",
  contractorId: "none",
  subcontractorId: "none",
  driverId: "none",
  vehicleId: "none",
  trailerId: "none",
  origin: "",
  originCity: "",
  originCountry: "PL",
  originPostalCode: "",
  destination: "",
  destinationCity: "",
  destinationCountry: "PL",
  destinationPostalCode: "",
  distanceKm: "",
  loadingDate: "",
  loadingTimeFrom: "",
  loadingTimeTo: "",
  unloadingDate: "",
  unloadingTimeFrom: "",
  unloadingTimeTo: "",
  cargoDescription: "",
  cargoWeight: "",
  cargoVolume: "",
  cargoPallets: "",
  cargoValue: "",
  requiresAdr: false,
  priceNet: "",
  currency: "PLN",
  costNet: "",
  flatRateKm: "",
  flatRateOverage: "",
  kmLimit: "",
  kmOverageRate: "",
  notes: "",
  internalNotes: "",
};

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

export default function NewOrderPage() {
  const router = useRouter();

  // State
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<PlannedAssignment[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  // Selected autocomplete options state
  const [selectedContractor, setSelectedContractor] = useState<AutocompleteOption | null>(null);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<AutocompleteOption | null>(null);

  // Assignment selected options - map by assignment id
  const [assignmentSelectedOptions, setAssignmentSelectedOptions] = useState<Record<string, {
    driver: AutocompleteOption | null;
    vehicle: AutocompleteOption | null;
    trailer: AutocompleteOption | null;
  }>>({});

  // Handle contractor added from quick add dialog
  const handleContractorAdded = (
    contractor: ContractorFull,
    field: "contractorId" | "subcontractorId"
  ) => {
    const option: AutocompleteOption = {
      value: contractor.id,
      label: contractor.shortName || contractor.name,
      description: contractor.nip ? `NIP: ${contractor.nip}` : undefined,
    };

    if (field === "contractorId") {
      setSelectedContractor(option);
    } else {
      setSelectedSubcontractor(option);
    }
    setFormData((prev) => ({ ...prev, [field]: contractor.id }));
  };

  // Generate order number
  useEffect(() => {
    const generateOrderNumber = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      return `ZL/${year}${month}${day}/${random}`;
    };

    if (!formData.orderNumber) {
      setFormData((prev) => ({ ...prev, orderNumber: generateOrderNumber() }));
    }
  }, [formData.orderNumber]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Assignment management functions
  const addAssignment = () => {
    const newId = `temp-${Date.now()}`;
    const newAssignment: PlannedAssignment = {
      id: newId,
      driverId: "none",
      vehicleId: "none",
      trailerId: "none",
      revenueShare: assignments.length === 0 ? 100 : 0,
      distanceKm: "",
      notes: "",
    };
    setAssignments((prev) => [...prev, newAssignment]);
    setAssignmentSelectedOptions((prev) => ({
      ...prev,
      [newId]: { driver: null, vehicle: null, trailer: null },
    }));
  };

  const removeAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setAssignmentSelectedOptions((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const updateAssignment = (id: string, field: keyof PlannedAssignment, value: string | number) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const updateAssignmentSelectedOption = (
    id: string,
    field: "driver" | "vehicle" | "trailer",
    option: AutocompleteOption | null
  ) => {
    setAssignmentSelectedOptions((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { driver: null, vehicle: null, trailer: null }),
        [field]: option,
      },
    }));
  };


  // Waypoint management functions
  const addWaypoint = () => {
    setWaypoints(prev => [...prev, { address: "", city: "", postalCode: "", country: "PL" }]);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index: number, field: keyof Waypoint, value: string) => {
    setWaypoints(prev => prev.map((wp, i) => i === index ? { ...wp, [field]: value } : wp));
  };
  const getTotalRevenueShare = () => {
    return assignments.reduce((sum, a) => sum + a.revenueShare, 0);
  };

  const autoDistributeRevenueShare = () => {
    if (assignments.length === 0) return;
    const sharePerAssignment = Math.floor(100 / assignments.length);
    const remainder = 100 - sharePerAssignment * assignments.length;

    setAssignments((prev) =>
      prev.map((a, index) => ({
        ...a,
        revenueShare: sharePerAssignment + (index === 0 ? remainder : 0),
      }))
    );
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.orderNumber.trim()) {
      newErrors.orderNumber = "Numer zlecenia jest wymagany";
    }

    if (!formData.origin.trim()) {
      newErrors.origin = "Miejsce zaladunku jest wymagane";
    }

    if (!formData.destination.trim()) {
      newErrors.destination = "Miejsce rozladunku jest wymagane";
    }

    if (!formData.loadingDate) {
      newErrors.loadingDate = "Data zaladunku jest wymagana";
    }

    if (!formData.unloadingDate) {
      newErrors.unloadingDate = "Data rozladunku jest wymagana";
    }

    if (
      formData.loadingDate &&
      formData.unloadingDate &&
      new Date(formData.loadingDate) > new Date(formData.unloadingDate)
    ) {
      newErrors.unloadingDate =
        "Data rozladunku nie moze byc wczesniejsza niz data zaladunku";
    }

    // Validate assignments revenue share
    if (assignments.length > 0) {
      const totalShare = getTotalRevenueShare();
      if (totalShare !== 100) {
        newErrors.assignments = `Suma udzialow w przychodzie musi wynosic 100% (obecnie: ${totalShare}%)`;
      }

      // Validate each assignment has a driver
      const assignmentWithoutDriver = assignments.find((a) => !a.driverId || a.driverId === "none");
      if (assignmentWithoutDriver) {
        newErrors.assignments = "Kazde przypisanie musi miec kierowce";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      // Prepare assignments for API - convert from percentage to decimal
      const apiAssignments = assignments
        .filter((a) => a.driverId && a.driverId !== "none")
        .map((a) => ({
          driverId: a.driverId,
          vehicleId: a.vehicleId !== "none" ? a.vehicleId : null,
          trailerId: a.trailerId !== "none" ? a.trailerId : null,
          revenueShare: a.revenueShare / 100, // Convert to decimal
          distanceKm: a.distanceKm ? parseFloat(a.distanceKm) : null,
          notes: a.notes || null,
        }));

      // Get primary assignment (first one) for backwards compatibility
      const primaryAssignment = apiAssignments[0];

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contractorId: formData.contractorId && formData.contractorId !== "none" ? formData.contractorId : null,
          subcontractorId: formData.subcontractorId && formData.subcontractorId !== "none" ? formData.subcontractorId : null,
          // Primary assignment for backwards compatibility
          driverId: primaryAssignment?.driverId || (formData.driverId && formData.driverId !== "none" ? formData.driverId : null),
          vehicleId: primaryAssignment?.vehicleId || (formData.vehicleId && formData.vehicleId !== "none" ? formData.vehicleId : null),
          trailerId: primaryAssignment?.trailerId || (formData.trailerId && formData.trailerId !== "none" ? formData.trailerId : null),
          // Multi-assignment array
          assignments: apiAssignments.length > 0 ? apiAssignments : undefined,
          waypoints: waypoints.filter(wp => wp.address || wp.city).map((wp, index) => ({
            sequence: index + 1,
            type: "STOP",
            address: wp.address,
            city: wp.city,
            postalCode: wp.postalCode,
            country: wp.country,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setErrors({ orderNumber: data.error });
        } else {
          throw new Error(data.error || "Failed to create order");
        }
        return;
      }

      const order = await response.json();
      router.push(`/orders/${order.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Wystapil blad podczas tworzenia zlecenia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              Nowe zlecenie
            </h1>
            <p className="text-muted-foreground">
              Utworz nowe zlecenie transportowe
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/orders">Anuluj</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Zapisz zlecenie
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">
              <FileText className="mr-2 h-4 w-4" />
              Podstawowe
            </TabsTrigger>
            <TabsTrigger value="route">
              <MapPin className="mr-2 h-4 w-4" />
              Trasa
            </TabsTrigger>
            <TabsTrigger value="cargo">
              <Package className="mr-2 h-4 w-4" />
              Ladunek
            </TabsTrigger>
            <TabsTrigger value="assignment">
              <Truck className="mr-2 h-4 w-4" />
              Przypisanie
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="mr-2 h-4 w-4" />
              Ceny
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informacje podstawowe
                </CardTitle>
                <CardDescription>
                  Podstawowe dane zlecenia transportowego
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Numer zlecenia *</Label>
                    <Input
                      id="orderNumber"
                      name="orderNumber"
                      value={formData.orderNumber}
                      onChange={handleChange}
                      placeholder="ZL/20260115/001"
                      className={errors.orderNumber ? "border-destructive" : ""}
                    />
                    {errors.orderNumber && (
                      <p className="text-sm text-destructive">
                        {errors.orderNumber}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="externalNumber">Numer zewnetrzny</Label>
                    <Input
                      id="externalNumber"
                      name="externalNumber"
                      value={formData.externalNumber}
                      onChange={handleChange}
                      placeholder="Nr referencyjny klienta"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Typ zlecenia</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        handleSelectChange("type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                    <Label
                      htmlFor="contractorId"
                      className="flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      Klient / Zleceniodawca
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <AutocompleteInput
                          value={formData.contractorId}
                          onChange={(val) => handleSelectChange("contractorId", val)}
                          onSelect={(option) => {
                            setSelectedContractor(option);
                            handleSelectChange("contractorId", option?.value || "none");
                          }}
                          fetchOptions={fetchContractors}
                          placeholder="Wyszukaj klienta..."
                          selectedOption={selectedContractor}
                        />
                      </div>
                      <ContractorQuickAddDialog
                        defaultType="CLIENT"
                        onSuccess={(contractor) =>
                          handleContractorAdded(contractor, "contractorId")
                        }
                      />
                    </div>
                  </div>

                  {formData.type === "FORWARDING" && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="subcontractorId"
                        className="flex items-center gap-2"
                      >
                        <Truck className="h-4 w-4" />
                        Przewoznik / Podwykonawca
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <AutocompleteInput
                            value={formData.subcontractorId}
                            onChange={(val) => handleSelectChange("subcontractorId", val)}
                            onSelect={(option) => {
                              setSelectedSubcontractor(option);
                              handleSelectChange("subcontractorId", option?.value || "none");
                            }}
                            fetchOptions={fetchContractors}
                            placeholder="Wyszukaj przewoznika..."
                            selectedOption={selectedSubcontractor}
                          />
                        </div>
                        <ContractorQuickAddDialog
                          defaultType="CARRIER"
                          onSuccess={(contractor) =>
                            handleContractorAdded(contractor, "subcontractorId")
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="notes">Uwagi</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                    placeholder="Uwagi widoczne dla klienta"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Uwagi wewnetrzne</Label>
                  <textarea
                    id="internalNotes"
                    name="internalNotes"
                    value={formData.internalNotes}
                    onChange={handleChange}
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                    placeholder="Notatki wewnetrzne (niewidoczne dla klienta)"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Route Tab */}
          <TabsContent value="route">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Trasa
                </CardTitle>
                <CardDescription>
                  Miejsca zaladunku i rozladunku
                </CardDescription>
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
                      <AddressAutocomplete
                        id="origin"
                        name="origin"
                        value={formData.origin}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, origin: value }))
                        }
                        onSelect={(suggestion) => {
                          setFormData((prev) => ({
                            ...prev,
                            origin: suggestion.address,
                            originCity: suggestion.city || prev.originCity,
                            originCountry: suggestion.country || prev.originCountry,
                          }));
                        }}
                        type="loading"
                        placeholder="Ulica, numer"
                        className={errors.origin ? "border-destructive" : ""}
                      />
                      {errors.origin && (
                        <p className="text-sm text-destructive">
                          {errors.origin}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="originCity">Miasto</Label>
                      <Input
                        id="originCity"
                        name="originCity"
                        value={formData.originCity}
                        onChange={handleChange}
                        placeholder="Miasto"
                      />
                    </div>
<div className="space-y-2">                      <Label htmlFor="originPostalCode">Kod pocztowy</Label>                      <Input                        id="originPostalCode"                        name="originPostalCode"                        value={formData.originPostalCode}                        onChange={handleChange}                        placeholder="00-000"                      />                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="originCountry">Kraj</Label>
                      <Select
                        value={formData.originCountry}
                        onValueChange={(value) =>
                          handleSelectChange("originCountry", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loadingDate">Data zaladunku *</Label>
                      <Input
                        id="loadingDate"
                        name="loadingDate"
                        type="date"
                        value={formData.loadingDate}
                        onChange={handleChange}
                        className={
                          errors.loadingDate ? "border-destructive" : ""
                        }
                      />
                      {errors.loadingDate && (
                        <p className="text-sm text-destructive">
                          {errors.loadingDate}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loadingTimeFrom">Godzina od</Label>
                      <Input
                        id="loadingTimeFrom"
                        name="loadingTimeFrom"
                        type="time"
                        value={formData.loadingTimeFrom}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loadingTimeTo">Godzina do</Label>
                      <Input
                        id="loadingTimeTo"
                        name="loadingTimeTo"
                        type="time"
                        value={formData.loadingTimeTo}
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
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      Punkty posrednie
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addWaypoint}>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj punkt
                    </Button>
                  </div>

                  {waypoints.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Brak punktow posrednich. Kliknij przycisk powyzej, aby dodac.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {waypoints.map((waypoint, index) => (
                        <Card key={index} className="border-blue-200">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-4">
                              <span className="text-sm font-medium text-blue-600">
                                Punkt {index + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWaypoint(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-4">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Adres</Label>
                                <Input
                                  value={waypoint.address}
                                  onChange={(e) => updateWaypoint(index, "address", e.target.value)}
                                  placeholder="Ulica, numer"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Miasto</Label>
                                <Input
                                  value={waypoint.city}
                                  onChange={(e) => updateWaypoint(index, "city", e.target.value)}
                                  placeholder="Miasto"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Kod pocztowy</Label>
                                <Input
                                  value={waypoint.postalCode}
                                  onChange={(e) => updateWaypoint(index, "postalCode", e.target.value)}
                                  placeholder="00-000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Kraj</Label>
                                <Select
                                  value={waypoint.country}
                                  onValueChange={(value) => updateWaypoint(index, "country", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {countries.map((country) => (
                                      <SelectItem key={country.code} value={country.code}>
                                        {country.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
                      <AddressAutocomplete
                        id="destination"
                        name="destination"
                        value={formData.destination}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, destination: value }))
                        }
                        onSelect={(suggestion) => {
                          setFormData((prev) => ({
                            ...prev,
                            destination: suggestion.address,
                            destinationCity: suggestion.city || prev.destinationCity,
                            destinationCountry: suggestion.country || prev.destinationCountry,
                          }));
                        }}
                        type="unloading"
                        placeholder="Ulica, numer"
                        className={
                          errors.destination ? "border-destructive" : ""
                        }
                      />
                      {errors.destination && (
                        <p className="text-sm text-destructive">
                          {errors.destination}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="destinationCity">Miasto</Label>
                      <Input
                        id="destinationCity"
                        name="destinationCity"
                        value={formData.destinationCity}
                        onChange={handleChange}
                        placeholder="Miasto"
                      />
                    </div>
<div className="space-y-2">                      <Label htmlFor="destinationPostalCode">Kod pocztowy</Label>                      <Input                        id="destinationPostalCode"                        name="destinationPostalCode"                        value={formData.destinationPostalCode}                        onChange={handleChange}                        placeholder="00-000"                      />                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="destinationCountry">Kraj</Label>
                      <Select
                        value={formData.destinationCountry}
                        onValueChange={(value) =>
                          handleSelectChange("destinationCountry", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unloadingDate">Data rozladunku *</Label>
                      <Input
                        id="unloadingDate"
                        name="unloadingDate"
                        type="date"
                        value={formData.unloadingDate}
                        onChange={handleChange}
                        className={
                          errors.unloadingDate ? "border-destructive" : ""
                        }
                      />
                      {errors.unloadingDate && (
                        <p className="text-sm text-destructive">
                          {errors.unloadingDate}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unloadingTimeFrom">Godzina od</Label>
                      <Input
                        id="unloadingTimeFrom"
                        name="unloadingTimeFrom"
                        type="time"
                        value={formData.unloadingTimeFrom}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unloadingTimeTo">Godzina do</Label>
                      <Input
                        id="unloadingTimeTo"
                        name="unloadingTimeTo"
                        type="time"
                        value={formData.unloadingTimeTo}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="distanceKm">Dystans (km)</Label>
                  <Input
                    id="distanceKm"
                    name="distanceKm"
                    type="number"
                    value={formData.distanceKm}
                    onChange={handleChange}
                    placeholder="0"
                    className="max-w-[200px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cargo Tab */}
          <TabsContent value="cargo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Ladunek
                </CardTitle>
                <CardDescription>
                  Informacje o przewozonym towarze
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cargoDescription">Opis ladunku</Label>
                  <textarea
                    id="cargoDescription"
                    name="cargoDescription"
                    value={formData.cargoDescription}
                    onChange={handleChange}
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                    placeholder="Opis towaru"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="cargoWeight">Waga (kg)</Label>
                    <Input
                      id="cargoWeight"
                      name="cargoWeight"
                      type="number"
                      value={formData.cargoWeight}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargoVolume">Objetosc (m3)</Label>
                    <Input
                      id="cargoVolume"
                      name="cargoVolume"
                      type="number"
                      step="0.1"
                      value={formData.cargoVolume}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargoPallets">Palety (szt.)</Label>
                    <Input
                      id="cargoPallets"
                      name="cargoPallets"
                      type="number"
                      value={formData.cargoPallets}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargoValue">Wartosc towaru</Label>
                    <Input
                      id="cargoValue"
                      name="cargoValue"
                      type="number"
                      step="0.01"
                      value={formData.cargoValue}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresAdr"
                    name="requiresAdr"
                    checked={formData.requiresAdr}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="requiresAdr" className="cursor-pointer">
                    Wymagane ADR (towary niebezpieczne)
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignment Tab */}
          <TabsContent value="assignment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Przypisania
                </CardTitle>
                <CardDescription>
                  Przypisz kierowcow i pojazdy do zlecenia. Mozesz przypisac wielu kierowcow z podzialem przychodu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.type === "OWN" ? (
                  <div className="space-y-4">
                    {/* Assignments List */}
                    {assignments.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground mb-4">
                          Brak przypisan. Dodaj kierowce i pojazd do zlecenia.
                        </p>
                        <Button type="button" onClick={addAssignment} variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Dodaj przypisanie
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Revenue Share Summary */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Suma udzialow: {getTotalRevenueShare()}%
                            </span>
                            {getTotalRevenueShare() !== 100 && (
                              <span className="text-sm text-destructive">
                                (powinno byc 100%)
                              </span>
                            )}
                          </div>
                          {assignments.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={autoDistributeRevenueShare}
                            >
                              Rozdziel rowno
                            </Button>
                          )}
                        </div>

                        {errors.assignments && (
                          <p className="text-sm text-destructive">{errors.assignments}</p>
                        )}

                        {/* Assignment Cards */}
                        <div className="space-y-4">
                          {assignments.map((assignment, index) => (
                            <div
                              key={assignment.id}
                              className="border rounded-lg p-4 space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Przypisanie {index + 1}
                                  {index === 0 && (
                                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                      Glowne
                                    </span>
                                  )}
                                </h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAssignment(assignment.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                  <Label>Kierowca *</Label>
                                  <AutocompleteInput
                                    value={assignment.driverId}
                                    onChange={(val) => updateAssignment(assignment.id, "driverId", val)}
                                    onSelect={(option) => {
                                      updateAssignmentSelectedOption(assignment.id, "driver", option);
                                      updateAssignment(assignment.id, "driverId", option?.value || "none");
                                    }}
                                    fetchOptions={fetchDrivers}
                                    placeholder="Wyszukaj kierowce..."
                                    selectedOption={assignmentSelectedOptions[assignment.id]?.driver || null}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Pojazd</Label>
                                  <AutocompleteInput
                                    value={assignment.vehicleId}
                                    onChange={(val) => updateAssignment(assignment.id, "vehicleId", val)}
                                    onSelect={(option) => {
                                      updateAssignmentSelectedOption(assignment.id, "vehicle", option);
                                      updateAssignment(assignment.id, "vehicleId", option?.value || "none");
                                    }}
                                    fetchOptions={fetchVehicles}
                                    placeholder="Wyszukaj pojazd..."
                                    selectedOption={assignmentSelectedOptions[assignment.id]?.vehicle || null}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Naczepa</Label>
                                  <AutocompleteInput
                                    value={assignment.trailerId}
                                    onChange={(val) => updateAssignment(assignment.id, "trailerId", val)}
                                    onSelect={(option) => {
                                      updateAssignmentSelectedOption(assignment.id, "trailer", option);
                                      updateAssignment(assignment.id, "trailerId", option?.value || "none");
                                    }}
                                    fetchOptions={fetchTrailers}
                                    placeholder="Wyszukaj naczepę..."
                                    selectedOption={assignmentSelectedOptions[assignment.id]?.trailer || null}
                                  />
                                </div>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Udzial w przychodzie</Label>
                                    <span className="text-sm font-medium">
                                      {assignment.revenueShare}%
                                    </span>
                                  </div>
                                  <Slider
                                    value={[assignment.revenueShare]}
                                    onValueChange={(value) =>
                                      updateAssignment(assignment.id, "revenueShare", value[0])
                                    }
                                    max={100}
                                    step={1}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Dystans (km)</Label>
                                  <Input
                                    type="number"
                                    value={assignment.distanceKm}
                                    onChange={(e) =>
                                      updateAssignment(assignment.id, "distanceKm", e.target.value)
                                    }
                                    placeholder="0"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Uwagi</Label>
                                <Input
                                  value={assignment.notes}
                                  onChange={(e) =>
                                    updateAssignment(assignment.id, "notes", e.target.value)
                                  }
                                  placeholder="Dodatkowe uwagi do przypisania"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Assignment Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addAssignment}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Dodaj kolejne przypisanie
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      Dla zlecen spedycyjnych przypisanie odbywa sie przez
                      podwykonawce
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Ceny i rozliczenie
                </CardTitle>
                <CardDescription>
                  Warunki finansowe zlecenia
                </CardDescription>
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
                      value={formData.priceNet}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Waluta</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        handleSelectChange("currency", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type === "FORWARDING" && (
                    <div className="space-y-2">
                      <Label htmlFor="costNet">Koszt netto (przewoznik)</Label>
                      <Input
                        id="costNet"
                        name="costNet"
                        type="number"
                        step="0.01"
                        value={formData.costNet}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <h3 className="font-semibold">Rozliczenie kilometrowe</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="flatRateKm">Stawka ryczaltowa</Label>
                    <Input
                      id="flatRateKm"
                      name="flatRateKm"
                      type="number"
                      step="0.01"
                      value={formData.flatRateKm}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kmLimit">Limit km</Label>
                    <Input
                      id="kmLimit"
                      name="kmLimit"
                      type="number"
                      value={formData.kmLimit}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kmOverageRate">Stawka powyzej limitu</Label>
                    <Input
                      id="kmOverageRate"
                      name="kmOverageRate"
                      type="number"
                      step="0.01"
                      value={formData.kmOverageRate}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="flatRateOverage">Doplata</Label>
                    <Input
                      id="flatRateOverage"
                      name="flatRateOverage"
                      type="number"
                      step="0.01"
                      value={formData.flatRateOverage}
                      onChange={handleChange}
                      placeholder="0.00"
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
