"use client";

import { useEffect, useState, use } from "react";
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
import {
  Building2,
  ArrowLeft,
  Save,
  Loader2,
} from "lucide-react";

// Contractor type
type ContractorType = "CLIENT" | "CARRIER" | "BOTH";

// Type labels in Polish
const typeLabels: Record<ContractorType, string> = {
  CLIENT: "Klient",
  CARRIER: "Przewoznik",
  BOTH: "Klient i przewoznik",
};

interface ContractorFormData {
  type: ContractorType;
  name: string;
  shortName: string;
  nip: string;
  regon: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  // Adres korespondencyjny
  corrAddress: string;
  corrCity: string;
  corrPostalCode: string;
  corrCountry: string;
  phone: string;
  email: string;
  website: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  paymentDays: number;
  creditLimit: string;
  notes: string;
  isActive: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ContractorEditPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ContractorFormData>({
    type: "CLIENT",
    name: "",
    shortName: "",
    nip: "",
    regon: "",
    address: "",
    city: "",
    postalCode: "",
    country: "PL",
    corrAddress: "",
    corrCity: "",
    corrPostalCode: "",
    corrCountry: "",
    phone: "",
    email: "",
    website: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    paymentDays: 14,
    creditLimit: "",
    notes: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch contractor data
  useEffect(() => {
    const fetchContractor = async () => {
      try {
        const response = await fetch(`/api/contractors/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch contractor");
        }
        const data = await response.json();
        setFormData({
          type: data.type,
          name: data.name || "",
          shortName: data.shortName || "",
          nip: data.nip || "",
          regon: data.regon || "",
          address: data.address || "",
          city: data.city || "",
          postalCode: data.postalCode || "",
          country: data.country || "PL",
          corrAddress: data.corrAddress || "",
          corrCity: data.corrCity || "",
          corrPostalCode: data.corrPostalCode || "",
          corrCountry: data.corrCountry || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          contactPerson: data.contactPerson || "",
          contactPhone: data.contactPhone || "",
          contactEmail: data.contactEmail || "",
          paymentDays: data.paymentDays || 14,
          creditLimit: data.creditLimit?.toString() || "",
          notes: data.notes || "",
          isActive: data.isActive ?? true,
        });
      } catch (error) {
        console.error("Error fetching contractor:", error);
        alert("Nie udalo sie pobrac danych kontrahenta");
        router.push("/contractors");
      } finally {
        setLoading(false);
      }
    };

    fetchContractor();
  }, [id, router]);

  // Handle form input change
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle form select change
  const handleFormSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Nazwa jest wymagana";
    }
    if (!formData.type) {
      errors.type = "Typ jest wymagany";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/contractors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          paymentDays: parseInt(formData.paymentDays.toString()) || 14,
          creditLimit: formData.creditLimit
            ? parseFloat(formData.creditLimit)
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas zapisywania kontrahenta");
        return;
      }

      router.push("/contractors");
    } catch (error) {
      console.error("Error updating contractor:", error);
      alert("Wystapil blad podczas zapisywania kontrahenta");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contractors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Edycja kontrahenta
            </h1>
            <p className="text-muted-foreground">{formData.name}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dane kontrahenta</CardTitle>
          <CardDescription>Edytuj informacje o kontrahencie</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Nazwa firmy"
                  className={formErrors.name ? "border-destructive" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortName">Nazwa skrocona</Label>
                <Input
                  id="shortName"
                  name="shortName"
                  value={formData.shortName}
                  onChange={handleFormChange}
                  placeholder="Skrot"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Typ *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    handleFormSelectChange("type", value)
                  }
                >
                  <SelectTrigger
                    className={formErrors.type ? "border-destructive" : ""}
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
                {formErrors.type && (
                  <p className="text-sm text-destructive">{formErrors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nip">NIP</Label>
                <Input
                  id="nip"
                  name="nip"
                  value={formData.nip}
                  onChange={handleFormChange}
                  placeholder="1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regon">REGON</Label>
                <Input
                  id="regon"
                  name="regon"
                  value={formData.regon}
                  onChange={handleFormChange}
                  placeholder="123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Strona WWW</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleFormChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Adres</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Ulica i numer</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    placeholder="ul. Przykladowa 123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Kod pocztowy</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleFormChange}
                    placeholder="00-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Miasto</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="Warszawa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Kraj</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleFormChange}
                    placeholder="PL"
                  />
                </div>
              </div>
            </div>

            {/* Correspondence Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Adres korespondencyjny</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="corrAddress">Ulica i numer</Label>
                  <Input
                    id="corrAddress"
                    name="corrAddress"
                    value={formData.corrAddress}
                    onChange={handleFormChange}
                    placeholder="ul. Przykladowa 123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corrPostalCode">Kod pocztowy</Label>
                  <Input
                    id="corrPostalCode"
                    name="corrPostalCode"
                    value={formData.corrPostalCode}
                    onChange={handleFormChange}
                    placeholder="00-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corrCity">Miasto</Label>
                  <Input
                    id="corrCity"
                    name="corrCity"
                    value={formData.corrCity}
                    onChange={handleFormChange}
                    placeholder="Warszawa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corrCountry">Kraj</Label>
                  <Input
                    id="corrCountry"
                    name="corrCountry"
                    value={formData.corrCountry}
                    onChange={handleFormChange}
                    placeholder="PL"
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold">Kontakt</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="firma@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="+48 123 456 789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Osoba kontaktowa</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleFormChange}
                    placeholder="Jan Kowalski"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefon kontaktowy</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleFormChange}
                    placeholder="+48 987 654 321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email kontaktowy</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleFormChange}
                    placeholder="kontakt@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-4">
              <h3 className="font-semibold">Warunki platnosci</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paymentDays">Termin platnosci (dni)</Label>
                  <Input
                    id="paymentDays"
                    name="paymentDays"
                    type="number"
                    value={formData.paymentDays}
                    onChange={handleFormChange}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Limit kredytowy</Label>
                  <Input
                    id="creditLimit"
                    name="creditLimit"
                    type="number"
                    value={formData.creditLimit}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Uwagi</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring dark:bg-input/30"
                placeholder="Dodatkowe informacje..."
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive">Aktywny kontrahent</Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/contractors">
                <Button type="button" variant="outline">
                  Anuluj
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Zapisz zmiany
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
