"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, Building2, Search, MapPin, Mail } from "lucide-react";
import { toast } from "sonner";

// Contractor types
type ContractorType = "CLIENT" | "CARRIER" | "BOTH";

const typeLabels: Record<ContractorType, string> = {
  CLIENT: "Klient",
  CARRIER: "Przewoznik",
  BOTH: "Klient i przewoznik",
};

// Form data interface
interface FormData {
  type: ContractorType;
  name: string;
  shortName: string;
  nip: string;
  regon: string;
  // Adres siedziby
  address: string;
  city: string;
  postalCode: string;
  // Adres korespondencyjny
  hasDifferentCorrAddress: boolean;
  corrAddress: string;
  corrCity: string;
  corrPostalCode: string;
  // Kontakt
  phone: string;
  email: string;
}

// Contractor interface (returned from API)
export interface Contractor {
  id: string;
  type: ContractorType;
  name: string;
  shortName: string | null;
  nip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
}

// Full contractor interface for callbacks
export interface ContractorFull extends Contractor {
  address: string | null;
  postalCode: string | null;
  corrAddress: string | null;
  corrCity: string | null;
  corrPostalCode: string | null;
}

interface ContractorQuickAddDialogProps {
  defaultType?: ContractorType;
  onSuccess?: (contractor: ContractorFull) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const initialFormData: FormData = {
  type: "CLIENT",
  name: "",
  shortName: "",
  nip: "",
  regon: "",
  address: "",
  city: "",
  postalCode: "",
  hasDifferentCorrAddress: false,
  corrAddress: "",
  corrCity: "",
  corrPostalCode: "",
  phone: "",
  email: "",
};

export function ContractorQuickAddDialog({
  defaultType = "CLIENT",
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ContractorQuickAddDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    type: defaultType,
  });
  const [loading, setLoading] = useState(false);
  const [gusLoading, setGusLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData({ ...initialFormData, type: defaultType });
      setErrors({});
    }
    setOpen(newOpen);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      hasDifferentCorrAddress: checked,
      // Clear correspondence address fields when unchecked
      ...(checked ? {} : { corrAddress: "", corrCity: "", corrPostalCode: "" }),
    }));
  };

  const handleGusSearch = async () => {
    if (!formData.nip) {
      toast.error("Wprowadz NIP aby wyszukac firme w GUS");
      return;
    }

    setGusLoading(true);
    try {
      const response = await fetch("/api/gus/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip: formData.nip }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Nie znaleziono firmy");
        return;
      }

      if (result.found && result.data) {
        const data = result.data;
        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          regon: data.regon || prev.regon,
          address: data.address || prev.address,
          city: data.city || prev.city,
          postalCode: data.postalCode || prev.postalCode,
          nip: data.nip || prev.nip,
        }));
        toast.success("Dane pobrane z GUS");
      }
    } catch (error) {
      console.error("GUS search error:", error);
      toast.error("Blad podczas wyszukiwania w GUS");
    } finally {
      setGusLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nazwa jest wymagana";
    }

    if (!formData.type) {
      newErrors.type = "Typ jest wymagany";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Nieprawidlowy format email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        type: formData.type,
        name: formData.name,
      };
      
      // Basic info
      if (formData.shortName) payload.shortName = formData.shortName;
      if (formData.nip) payload.nip = formData.nip;
      if (formData.regon) payload.regon = formData.regon;
      
      // Registered address
      if (formData.address) payload.address = formData.address;
      if (formData.city) payload.city = formData.city;
      if (formData.postalCode) payload.postalCode = formData.postalCode;
      
      // Correspondence address (only if different)
      if (formData.hasDifferentCorrAddress) {
        if (formData.corrAddress) payload.corrAddress = formData.corrAddress;
        if (formData.corrCity) payload.corrCity = formData.corrCity;
        if (formData.corrPostalCode) payload.corrPostalCode = formData.corrPostalCode;
      }
      
      // Contact
      if (formData.phone) payload.phone = formData.phone;
      if (formData.email) payload.email = formData.email;

      const response = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          throw new Error("Failed to create contractor");
        }
        return;
      }

      const result = await response.json();
      const contractor = result.data || result;

      toast.success(`Kontrahent "${contractor.name}" zostal utworzony`);

      setOpen(false);
      setFormData({ ...initialFormData, type: defaultType });

      if (onSuccess) {
        onSuccess(contractor);
      }
    } catch (error) {
      console.error("Error creating contractor:", error);
      toast.error("Wystapil blad podczas tworzenia kontrahenta");
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0"
      title="Dodaj nowego kontrahenta"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Szybkie dodawanie kontrahenta
          </DialogTitle>
          <DialogDescription>
            Wprowadz NIP i kliknij &quot;Szukaj w GUS&quot; aby automatycznie pobrac dane
            firmy, lub wypelnij formularz recznie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NIP with GUS search */}
          <div className="space-y-2">
            <Label htmlFor="quick-nip">NIP</Label>
            <div className="flex gap-2">
              <Input
                id="quick-nip"
                name="nip"
                value={formData.nip}
                onChange={handleChange}
                placeholder="1234567890"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleGusSearch}
                disabled={gusLoading || !formData.nip}
              >
                {gusLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Szukaj w GUS
              </Button>
            </div>
          </div>

          {/* Name and Short Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-name">Nazwa firmy *</Label>
              <Input
                id="quick-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nazwa firmy"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-shortName">Nazwa skrocona</Label>
              <Input
                id="quick-shortName"
                name="shortName"
                value={formData.shortName}
                onChange={handleChange}
                placeholder="Skrot (wyswietlany w listach)"
              />
            </div>
          </div>

          {/* Type and REGON */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-type">Typ kontrahenta *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange("type", value)}
              >
                <SelectTrigger
                  className={errors.type ? "border-destructive" : ""}
                >
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
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-regon">REGON</Label>
              <Input
                id="quick-regon"
                name="regon"
                value={formData.regon}
                onChange={handleChange}
                placeholder="123456789"
              />
            </div>
          </div>

          {/* Registered Address Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Adres siedziby
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quick-address">Ulica i numer</Label>
              <Input
                id="quick-address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="ul. Przykladowa 1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-postalCode">Kod pocztowy</Label>
                <Input
                  id="quick-postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="00-000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-city">Miasto</Label>
                <Input
                  id="quick-city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Miasto"
                />
              </div>
            </div>
          </div>

          {/* Correspondence Address Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="different-corr-address"
              checked={formData.hasDifferentCorrAddress}
              onCheckedChange={handleCheckboxChange}
            />
            <Label
              htmlFor="different-corr-address"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Inny adres korespondencyjny
            </Label>
          </div>

          {/* Correspondence Address Section (conditional) */}
          {formData.hasDifferentCorrAddress && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-md border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Adres korespondencyjny
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quick-corrAddress">Ulica i numer</Label>
                <Input
                  id="quick-corrAddress"
                  name="corrAddress"
                  value={formData.corrAddress}
                  onChange={handleChange}
                  placeholder="ul. Korespondencyjna 2"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-corrPostalCode">Kod pocztowy</Label>
                  <Input
                    id="quick-corrPostalCode"
                    name="corrPostalCode"
                    value={formData.corrPostalCode}
                    onChange={handleChange}
                    placeholder="00-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-corrCity">Miasto</Label>
                  <Input
                    id="quick-corrCity"
                    name="corrCity"
                    value={formData.corrCity}
                    onChange={handleChange}
                    placeholder="Miasto"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Section */}
          <div className="space-y-3">
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-phone">Telefon</Label>
                <Input
                  id="quick-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+48 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-email">Email</Label>
                <Input
                  id="quick-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="firma@example.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Dodaj kontrahenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
