"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, UserPlus, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AutocompleteInput,
  AutocompleteOption,
  fetchDrivers,
  fetchVehicles,
  fetchTrailers,
} from "@/components/ui/autocomplete-input";

// Types
type AssignmentReason =
  | "INITIAL"
  | "DRIVER_ILLNESS"
  | "DRIVER_VACATION"
  | "VEHICLE_BREAKDOWN"
  | "VEHICLE_SERVICE"
  | "SCHEDULE_CONFLICT"
  | "CLIENT_REQUEST"
  | "OPTIMIZATION"
  | "OTHER";

const reasonLabels: Record<AssignmentReason, string> = {
  INITIAL: "Pierwsze przypisanie",
  DRIVER_ILLNESS: "Choroba kierowcy",
  DRIVER_VACATION: "Urlop kierowcy",
  VEHICLE_BREAKDOWN: "Awaria pojazdu",
  VEHICLE_SERVICE: "Serwis pojazdu",
  SCHEDULE_CONFLICT: "Konflikt harmonogramu",
  CLIENT_REQUEST: "Na zyczenie klienta",
  OPTIMIZATION: "Optymalizacja trasy",
  OTHER: "Inne",
};

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  brand?: string | null;
  model?: string | null;
}

interface Trailer {
  id: string;
  registrationNumber: string;
  type?: string | null;
}

interface OrderAssignment {
  id: string;
  driverId: string;
  vehicleId: string | null;
  trailerId: string | null;
  startDate: string;
  endDate: string | null;
  revenueShare: number;
  allocatedAmount: number | null;
  distanceKm: number | null;
  reason: AssignmentReason;
  reasonNote: string | null;
  isPrimary: boolean;
  isActive: boolean;
  driver: Driver;
  vehicle: Vehicle | null;
  trailer: Trailer | null;
}

interface FormData {
  driverId: string;
  vehicleId: string;
  trailerId: string;
  startDate: string;
  endDate: string;
  revenueShare: number;
  allocatedAmount: string;
  distanceKm: string;
  reason: AssignmentReason;
  reasonNote: string;
  isPrimary: boolean;
}

interface OrderAssignmentDialogProps {
  orderId: string;
  orderLoadingDate: string;
  orderUnloadingDate: string;
  orderPrice: number | null;
  remainingShare?: number;
  assignment?: OrderAssignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const initialFormData: FormData = {
  driverId: "",
  vehicleId: "",
  trailerId: "",
  startDate: "",
  endDate: "",
  revenueShare: 1.0,
  allocatedAmount: "",
  distanceKm: "",
  reason: "INITIAL",
  reasonNote: "",
  isPrimary: false,
};

export function OrderAssignmentDialog({
  orderId,
  orderLoadingDate,
  orderUnloadingDate,
  orderPrice,
  remainingShare = 1.0,
  assignment,
  open,
  onOpenChange,
  onSuccess,
}: OrderAssignmentDialogProps) {
  const isEditing = !!assignment;

  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Selected options for autocomplete inputs
  const [selectedDriver, setSelectedDriver] = useState<AutocompleteOption | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<AutocompleteOption | null>(null);
  const [selectedTrailer, setSelectedTrailer] = useState<AutocompleteOption | null>(null);

  // Input values for autocomplete inputs
  const [driverInputValue, setDriverInputValue] = useState("");
  const [vehicleInputValue, setVehicleInputValue] = useState("");
  const [trailerInputValue, setTrailerInputValue] = useState("");

  // Calculated amount
  const calculatedAmount = orderPrice
    ? Math.round(orderPrice * formData.revenueShare * 100) / 100
    : null;

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (assignment) {
        // Populate form with existing assignment data
        setFormData({
          driverId: assignment.driverId,
          vehicleId: assignment.vehicleId || "",
          trailerId: assignment.trailerId || "",
          startDate: format(new Date(assignment.startDate), "yyyy-MM-dd"),
          endDate: assignment.endDate
            ? format(new Date(assignment.endDate), "yyyy-MM-dd")
            : "",
          revenueShare: assignment.revenueShare,
          allocatedAmount: assignment.allocatedAmount?.toString() || "",
          distanceKm: assignment.distanceKm?.toString() || "",
          reason: assignment.reason,
          reasonNote: assignment.reasonNote || "",
          isPrimary: assignment.isPrimary,
        });

        // Set selected options from existing assignment
        if (assignment.driver) {
          const driverLabel = `${assignment.driver.firstName} ${assignment.driver.lastName}`;
          setSelectedDriver({
            value: assignment.driverId,
            label: driverLabel,
            description: assignment.driver.phone || undefined,
          });
          setDriverInputValue(driverLabel);
        }

        if (assignment.vehicle) {
          const vehicleLabel = assignment.vehicle.registrationNumber;
          const vehicleDesc = `${assignment.vehicle.brand || ""} ${assignment.vehicle.model || ""}`.trim() || undefined;
          setSelectedVehicle({
            value: assignment.vehicleId!,
            label: vehicleLabel,
            description: vehicleDesc,
          });
          setVehicleInputValue(vehicleLabel);
        } else {
          setSelectedVehicle(null);
          setVehicleInputValue("");
        }

        if (assignment.trailer) {
          const trailerLabel = assignment.trailer.registrationNumber;
          setSelectedTrailer({
            value: assignment.trailerId!,
            label: trailerLabel,
            description: assignment.trailer.type || undefined,
          });
          setTrailerInputValue(trailerLabel);
        } else {
          setSelectedTrailer(null);
          setTrailerInputValue("");
        }
      } else {
        // Reset form for new assignment
        setFormData({
          ...initialFormData,
          startDate: format(new Date(orderLoadingDate), "yyyy-MM-dd"),
          revenueShare: Math.min(remainingShare, 1.0),
        });
        setSelectedDriver(null);
        setSelectedVehicle(null);
        setSelectedTrailer(null);
        setDriverInputValue("");
        setVehicleInputValue("");
        setTrailerInputValue("");
      }
      setErrors({});
    }
  }, [open, assignment, orderLoadingDate, remainingShare]);

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSliderChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, revenueShare: value[0] }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPrimary: checked }));
  };

  // Autocomplete handlers
  const handleDriverSelect = (option: AutocompleteOption | null) => {
    setSelectedDriver(option);
    setFormData((prev) => ({ ...prev, driverId: option?.value || "" }));
    if (errors.driverId && option) {
      setErrors((prev) => ({ ...prev, driverId: "" }));
    }
  };

  const handleVehicleSelect = (option: AutocompleteOption | null) => {
    setSelectedVehicle(option);
    setFormData((prev) => ({ ...prev, vehicleId: option?.value || "" }));
  };

  const handleTrailerSelect = (option: AutocompleteOption | null) => {
    setSelectedTrailer(option);
    setFormData((prev) => ({ ...prev, trailerId: option?.value || "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.driverId) {
      newErrors.driverId = "Kierowca jest wymagany";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Data rozpoczecia jest wymagana";
    }

    if (formData.revenueShare <= 0 || formData.revenueShare > 1) {
      newErrors.revenueShare = "Udzial musi byc miedzy 0% a 100%";
    }

    if (!isEditing && formData.revenueShare > remainingShare + 0.001) {
      newErrors.revenueShare = `Maksymalny dostepny udzial: ${Math.round(remainingShare * 100)}%`;
    }

    if (formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = "Data zakonczenia nie moze byc wczesniejsza niz data rozpoczecia";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        driverId: formData.driverId,
        vehicleId: formData.vehicleId || null,
        trailerId: formData.trailerId || null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        revenueShare: formData.revenueShare,
        allocatedAmount: formData.allocatedAmount
          ? parseFloat(formData.allocatedAmount)
          : null,
        distanceKm: formData.distanceKm ? parseFloat(formData.distanceKm) : null,
        reason: formData.reason,
        reasonNote: formData.reasonNote || null,
        isPrimary: formData.isPrimary,
      };

      const url = isEditing
        ? `/api/orders/${orderId}/assignments/${assignment.id}`
        : `/api/orders/${orderId}/assignments`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Wystapil blad");
        return;
      }

      toast.success(
        isEditing
          ? "Przypisanie zostalo zaktualizowane"
          : "Przypisanie zostalo dodane"
      );

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast.error("Wystapil blad podczas zapisywania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5" />
                Edytuj przypisanie
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Dodaj przypisanie
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Zaktualizuj dane przypisania kierowcy i pojazdu do zlecenia."
              : "Przypisz kierowce i pojazd do realizacji zlecenia."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Driver */}
          <div className="space-y-2">
            <Label htmlFor="driverId">Kierowca *</Label>
            <AutocompleteInput
              value={driverInputValue}
              onChange={setDriverInputValue}
              onSelect={handleDriverSelect}
              fetchOptions={fetchDrivers}
              placeholder="Wyszukaj kierowce..."
              disabled={loading}
              selectedOption={selectedDriver}
              error={!!errors.driverId}
            />
            {errors.driverId && (
              <p className="text-sm text-destructive">{errors.driverId}</p>
            )}
          </div>

          {/* Vehicle and Trailer */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Pojazd</Label>
              <AutocompleteInput
                value={vehicleInputValue}
                onChange={setVehicleInputValue}
                onSelect={handleVehicleSelect}
                fetchOptions={fetchVehicles}
                placeholder="Wyszukaj pojazd..."
                disabled={loading}
                selectedOption={selectedVehicle}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trailerId">Naczepa</Label>
              <AutocompleteInput
                value={trailerInputValue}
                onChange={setTrailerInputValue}
                onSelect={handleTrailerSelect}
                fetchOptions={fetchTrailers}
                placeholder="Wyszukaj naczpe..."
                disabled={loading}
                selectedOption={selectedTrailer}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data rozpoczecia *</Label>
              <Input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                min={format(new Date(orderLoadingDate), "yyyy-MM-dd")}
                max={format(new Date(orderUnloadingDate), "yyyy-MM-dd")}
                className={errors.startDate ? "border-destructive" : ""}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data zakonczenia</Label>
              <Input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate}
                max={format(new Date(orderUnloadingDate), "yyyy-MM-dd")}
                className={errors.endDate ? "border-destructive" : ""}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Pozostaw puste dla aktywnego przypisania
              </p>
            </div>
          </div>

          {/* Revenue Share */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Udzial w przychodzie</Label>
              <span className="text-sm font-medium">
                {Math.round(formData.revenueShare * 100)}%
              </span>
            </div>
            <Slider
              value={[formData.revenueShare]}
              onValueChange={handleSliderChange}
              min={0}
              max={1}
              step={0.05}
              className="py-2"
            />
            {calculatedAmount !== null && (
              <p className="text-sm text-muted-foreground">
                Obliczona kwota: <strong>{calculatedAmount.toLocaleString("pl-PL")} PLN</strong>
                {orderPrice && (
                  <span className="ml-1">
                    (z {orderPrice.toLocaleString("pl-PL")} PLN)
                  </span>
                )}
              </p>
            )}
            {!isEditing && remainingShare < 1 && (
              <p className="text-xs text-amber-600">
                Dostepny udzial: {Math.round(remainingShare * 100)}%
              </p>
            )}
            {errors.revenueShare && (
              <p className="text-sm text-destructive">{errors.revenueShare}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Powod przypisania</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) =>
                handleSelectChange("reason", value as AssignmentReason)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Note */}
          {formData.reason === "OTHER" && (
            <div className="space-y-2">
              <Label htmlFor="reasonNote">Opis powodu</Label>
              <Textarea
                id="reasonNote"
                name="reasonNote"
                value={formData.reasonNote}
                onChange={handleInputChange}
                placeholder="Opisz powod zmiany..."
                rows={2}
              />
            </div>
          )}

          {/* Is Primary */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="isPrimary">Glowne przypisanie</Label>
              <p className="text-xs text-muted-foreground">
                Glowne przypisanie bedzie wyswietlane na liscie zlecen
              </p>
            </div>
            <Switch
              id="isPrimary"
              checked={formData.isPrimary}
              onCheckedChange={handleSwitchChange}
            />
          </div>

          {/* Distance (optional) */}
          <div className="space-y-2">
            <Label htmlFor="distanceKm">Przejechane km (opcjonalnie)</Label>
            <Input
              type="number"
              id="distanceKm"
              name="distanceKm"
              value={formData.distanceKm}
              onChange={handleInputChange}
              placeholder="np. 450"
              min={0}
              step={1}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isEditing ? (
                <Edit className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Zapisz zmiany" : "Dodaj przypisanie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
