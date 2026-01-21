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

  // Resources
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Calculated amount
  const calculatedAmount = orderPrice
    ? Math.round(orderPrice * formData.revenueShare * 100) / 100
    : null;

  // Load resources when dialog opens
  useEffect(() => {
    if (open) {
      loadResources();
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
      } else {
        // Reset form for new assignment
        setFormData({
          ...initialFormData,
          startDate: format(new Date(orderLoadingDate), "yyyy-MM-dd"),
          revenueShare: Math.min(remainingShare, 1.0),
        });
      }
      setErrors({});
    }
  }, [open, assignment, orderLoadingDate, remainingShare]);

  const loadResources = async () => {
    setResourcesLoading(true);
    try {
      const [driversRes, vehiclesRes, trailersRes] = await Promise.all([
        fetch("/api/drivers?limit=200&status=ACTIVE"),
        fetch("/api/vehicles?limit=200&status=ACTIVE"),
        fetch("/api/trailers?limit=200"),
      ]);

      if (driversRes.ok) {
        const data = await driversRes.json();
        setDrivers(data.data || []);
      }
      if (vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        setVehicles(data.data || []);
      }
      if (trailersRes.ok) {
        const data = await trailersRes.json();
        setTrailers(data.data || []);
      }
    } catch (error) {
      console.error("Error loading resources:", error);
      toast.error("Blad ladowania zasobow");
    } finally {
      setResourcesLoading(false);
    }
  };

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
            <Select
              value={formData.driverId}
              onValueChange={(value) => handleSelectChange("driverId", value)}
              disabled={resourcesLoading}
            >
              <SelectTrigger
                className={errors.driverId ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Wybierz kierowce..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.firstName} {driver.lastName}
                    {driver.phone && (
                      <span className="text-muted-foreground ml-2">
                        ({driver.phone})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.driverId && (
              <p className="text-sm text-destructive">{errors.driverId}</p>
            )}
          </div>

          {/* Vehicle and Trailer */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Pojazd</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => handleSelectChange("vehicleId", value)}
                disabled={resourcesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz pojazd..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Brak</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber}
                      {vehicle.brand && (
                        <span className="text-muted-foreground ml-2">
                          ({vehicle.brand} {vehicle.model})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trailerId">Naczepa</Label>
              <Select
                value={formData.trailerId}
                onValueChange={(value) => handleSelectChange("trailerId", value)}
                disabled={resourcesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz naczpe..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Brak</SelectItem>
                  {trailers.map((trailer) => (
                    <SelectItem key={trailer.id} value={trailer.id}>
                      {trailer.registrationNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={loading || resourcesLoading}>
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
