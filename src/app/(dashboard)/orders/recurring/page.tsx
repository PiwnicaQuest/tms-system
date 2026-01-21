"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/ui/page-loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarClock,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Play,
  Pause,
  Loader2,
  ArrowRight,
  Building2,
  Calendar,
} from "lucide-react";

// Types
type FrequencyType = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

const frequencyLabels: Record<FrequencyType, string> = {
  DAILY: "Codziennie",
  WEEKLY: "Co tydzień",
  BIWEEKLY: "Co 2 tygodnie",
  MONTHLY: "Co miesiąc",
};

const dayOfWeekLabels = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

interface RecurringOrder {
  id: string;
  name: string;
  frequency: FrequencyType;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  nextGenerationDate: string | null;
  generatedCount: number;
  lastGeneratedAt: string | null;
  // Order template fields
  origin: string;
  originCity: string | null;
  destination: string;
  destinationCity: string | null;
  contractor: {
    id: string;
    name: string;
    shortName: string | null;
  } | null;
  priceNet: number | null;
  currency: string;
  cargoDescription: string | null;
  cargoWeight: number | null;
  cargoPallets: number | null;
  notes: string | null;
}

interface RecurringOrdersResponse {
  data: RecurringOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Contractor {
  id: string;
  name: string;
  shortName: string | null;
  type: "CLIENT" | "CARRIER" | "BOTH";
}

// Initial form state
const initialFormData = {
  name: "",
  frequency: "WEEKLY" as FrequencyType,
  dayOfWeek: 1,
  dayOfMonth: 1,
  startDate: "",
  endDate: "",
  // Order fields
  contractorId: "none",
  origin: "",
  originCity: "",
  originPostalCode: "",
  originCountry: "PL",
  destination: "",
  destinationCity: "",
  destinationPostalCode: "",
  destinationCountry: "PL",
  distanceKm: "",
  cargoDescription: "",
  cargoWeight: "",
  cargoVolume: "",
  cargoPallets: "",
  cargoValue: "",
  priceNet: "",
  currency: "PLN",
  notes: "",
};

const countries = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "CZ", name: "Czechy" },
  { code: "SK", name: "Słowacja" },
  { code: "AT", name: "Austria" },
  { code: "NL", name: "Holandia" },
  { code: "BE", name: "Belgia" },
  { code: "FR", name: "Francja" },
  { code: "IT", name: "Włochy" },
  { code: "ES", name: "Hiszpania" },
  { code: "HU", name: "Węgry" },
  { code: "RO", name: "Rumunia" },
  { code: "LT", name: "Litwa" },
  { code: "LV", name: "Łotwa" },
  { code: "EE", name: "Estonia" },
];

const currencies = ["PLN", "EUR", "USD", "GBP", "CZK", "CHF"];

function RecurringOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [templates, setTemplates] = useState<RecurringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [frequencyFilter, setFrequencyFilter] = useState(searchParams.get("frequency") || "all");

  // Modal state
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringOrder | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Resources
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  // Fetch resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch("/api/contractors?limit=200");
        if (response.ok) {
          const data = await response.json();
          setContractors(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, []);

  // Fetch recurring orders
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") {
        params.set("isActive", statusFilter === "active" ? "true" : "false");
      }
      if (frequencyFilter && frequencyFilter !== "all") {
        params.set("frequency", frequencyFilter);
      }

      const response = await fetch("/api/recurring-orders?" + params.toString());
      if (!response.ok) throw new Error("Failed to fetch recurring orders");

      const data: RecurringOrdersResponse = await response.json();
      setTemplates(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching recurring orders:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, frequencyFilter]);

  // Fetch on mount and filter change
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFrequencyFilter("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (!formData.startDate) {
      errors.startDate = "Data rozpoczęcia jest wymagana";
    }
    if (!formData.origin.trim()) {
      errors.origin = "Miejsce załadunku jest wymagane";
    }
    if (!formData.destination.trim()) {
      errors.destination = "Miejsce rozładunku jest wymagane";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const payload = {
        name: formData.name,
        frequency: formData.frequency,
        dayOfWeek: ["WEEKLY", "BIWEEKLY"].includes(formData.frequency) ? formData.dayOfWeek : null,
        dayOfMonth: formData.frequency === "MONTHLY" ? formData.dayOfMonth : null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        contractorId: formData.contractorId !== "none" ? formData.contractorId : null,
        origin: formData.origin,
        originCity: formData.originCity || null,
        originPostalCode: formData.originPostalCode || null,
        originCountry: formData.originCountry,
        destination: formData.destination,
        destinationCity: formData.destinationCity || null,
        destinationPostalCode: formData.destinationPostalCode || null,
        destinationCountry: formData.destinationCountry,
        distanceKm: formData.distanceKm ? parseInt(formData.distanceKm) : null,
        cargoDescription: formData.cargoDescription || null,
        cargoWeight: formData.cargoWeight ? parseFloat(formData.cargoWeight) : null,
        cargoVolume: formData.cargoVolume ? parseFloat(formData.cargoVolume) : null,
        cargoPallets: formData.cargoPallets ? parseInt(formData.cargoPallets) : null,
        cargoValue: formData.cargoValue ? parseFloat(formData.cargoValue) : null,
        priceNet: formData.priceNet ? parseFloat(formData.priceNet) : null,
        currency: formData.currency,
        notes: formData.notes || null,
      };

      const response = await fetch("/api/recurring-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas tworzenia szablonu");
        return;
      }

      setShowNewDialog(false);
      setFormData(initialFormData);
      fetchTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Wystąpił błąd podczas tworzenia szablonu");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle update
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !editingTemplate) return;

    setFormLoading(true);
    try {
      const payload = {
        name: formData.name,
        frequency: formData.frequency,
        dayOfWeek: ["WEEKLY", "BIWEEKLY"].includes(formData.frequency) ? formData.dayOfWeek : null,
        dayOfMonth: formData.frequency === "MONTHLY" ? formData.dayOfMonth : null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        contractorId: formData.contractorId !== "none" ? formData.contractorId : null,
        origin: formData.origin,
        originCity: formData.originCity || null,
        originPostalCode: formData.originPostalCode || null,
        originCountry: formData.originCountry,
        destination: formData.destination,
        destinationCity: formData.destinationCity || null,
        destinationPostalCode: formData.destinationPostalCode || null,
        destinationCountry: formData.destinationCountry,
        distanceKm: formData.distanceKm ? parseInt(formData.distanceKm) : null,
        cargoDescription: formData.cargoDescription || null,
        cargoWeight: formData.cargoWeight ? parseFloat(formData.cargoWeight) : null,
        cargoVolume: formData.cargoVolume ? parseFloat(formData.cargoVolume) : null,
        cargoPallets: formData.cargoPallets ? parseInt(formData.cargoPallets) : null,
        cargoValue: formData.cargoValue ? parseFloat(formData.cargoValue) : null,
        priceNet: formData.priceNet ? parseFloat(formData.priceNet) : null,
        currency: formData.currency,
        notes: formData.notes || null,
      };

      const response = await fetch("/api/recurring-orders/" + editingTemplate.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas aktualizacji szablonu");
        return;
      }

      setShowEditDialog(false);
      setEditingTemplate(null);
      setFormData(initialFormData);
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      alert("Wystąpił błąd podczas aktualizacji szablonu");
    } finally {
      setFormLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (template: RecurringOrder) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      frequency: template.frequency,
      dayOfWeek: template.dayOfWeek || 1,
      dayOfMonth: template.dayOfMonth || 1,
      startDate: template.startDate.split("T")[0],
      endDate: template.endDate ? template.endDate.split("T")[0] : "",
      contractorId: template.contractor?.id || "none",
      origin: template.origin,
      originCity: template.originCity || "",
      originPostalCode: "",
      originCountry: "PL",
      destination: template.destination,
      destinationCity: template.destinationCity || "",
      destinationPostalCode: "",
      destinationCountry: "PL",
      distanceKm: "",
      cargoDescription: template.cargoDescription || "",
      cargoWeight: template.cargoWeight?.toString() || "",
      cargoVolume: "",
      cargoPallets: template.cargoPallets?.toString() || "",
      cargoValue: "",
      priceNet: template.priceNet?.toString() || "",
      currency: template.currency,
      notes: template.notes || "",
    });
    setShowEditDialog(true);
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/recurring-orders/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd");
        return;
      }

      fetchTemplates();
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("Wystąpił błąd");
    }
  };

  // Generate now
  const handleGenerateNow = async (id: string) => {
    try {
      const response = await fetch("/api/recurring-orders/" + id + "/generate", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas generowania zlecenia");
        return;
      }

      const result = await response.json();
      alert("Zlecenie zostało wygenerowane: " + result.orderNumber);
      fetchTemplates();
    } catch (error) {
      console.error("Error generating order:", error);
      alert("Wystąpił błąd podczas generowania zlecenia");
    }
  };

  // Delete template
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten szablon?")) return;

    try {
      const response = await fetch("/api/recurring-orders/" + id, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystąpił błąd podczas usuwania szablonu");
        return;
      }

      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Wystąpił błąd podczas usuwania szablonu");
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format price
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return "-";
    return price.toLocaleString("pl-PL") + " " + currency;
  };

  // Check if filters are active
  const hasActiveFilters =
    search || (statusFilter && statusFilter !== "all") || (frequencyFilter && frequencyFilter !== "all");

  // Form content (shared between new and edit dialogs)
  const renderFormContent = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Podstawowe informacje</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Nazwa szablonu *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="np. Codzienna trasa Warszawa-Kraków"
              className={formErrors.name ? "border-destructive" : ""}
            />
            {formErrors.name && (
              <p className="text-sm text-destructive">{formErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Częstotliwość *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => handleFormSelectChange("frequency", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(frequencyLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {["WEEKLY", "BIWEEKLY"].includes(formData.frequency) && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Dzień tygodnia</Label>
              <Select
                value={formData.dayOfWeek.toString()}
                onValueChange={(value) => handleFormSelectChange("dayOfWeek", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOfWeekLabels.map((label, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.frequency === "MONTHLY" && (
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Dzień miesiąca</Label>
              <Select
                value={formData.dayOfMonth.toString()}
                onValueChange={(value) => handleFormSelectChange("dayOfMonth", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="startDate">Data rozpoczęcia *</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleFormChange}
              className={formErrors.startDate ? "border-destructive" : ""}
            />
            {formErrors.startDate && (
              <p className="text-sm text-destructive">{formErrors.startDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Data zakończenia (opcjonalnie)</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleFormChange}
            />
          </div>
        </div>
      </div>

      {/* Contractor */}
      <div className="space-y-4">
        <h3 className="font-semibold">Kontrahent</h3>
        <div className="space-y-2">
          <Label htmlFor="contractorId">Kontrahent</Label>
          <Select
            value={formData.contractorId}
            onValueChange={(value) => handleFormSelectChange("contractorId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz kontrahenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Brak</SelectItem>
              {contractors
                .filter((c) => c.type === "CLIENT" || c.type === "BOTH")
                .map((contractor) => (
                  <SelectItem key={contractor.id} value={contractor.id}>
                    {contractor.shortName || contractor.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Route */}
      <div className="space-y-4">
        <h3 className="font-semibold">Trasa</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Miejsce załadunku</h4>
            <div className="space-y-2">
              <Label htmlFor="origin">Adres *</Label>
              <Input
                id="origin"
                name="origin"
                value={formData.origin}
                onChange={handleFormChange}
                placeholder="ul. Przykładowa 1"
                className={formErrors.origin ? "border-destructive" : ""}
              />
              {formErrors.origin && (
                <p className="text-sm text-destructive">{formErrors.origin}</p>
              )}
            </div>
            <div className="grid gap-2 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="originCity">Miasto</Label>
                <Input
                  id="originCity"
                  name="originCity"
                  value={formData.originCity}
                  onChange={handleFormChange}
                  placeholder="Warszawa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originCountry">Kraj</Label>
                <Select
                  value={formData.originCountry}
                  onValueChange={(value) => handleFormSelectChange("originCountry", value)}
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
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Miejsce rozładunku</h4>
            <div className="space-y-2">
              <Label htmlFor="destination">Adres *</Label>
              <Input
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleFormChange}
                placeholder="ul. Przykładowa 2"
                className={formErrors.destination ? "border-destructive" : ""}
              />
              {formErrors.destination && (
                <p className="text-sm text-destructive">{formErrors.destination}</p>
              )}
            </div>
            <div className="grid gap-2 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="destinationCity">Miasto</Label>
                <Input
                  id="destinationCity"
                  name="destinationCity"
                  value={formData.destinationCity}
                  onChange={handleFormChange}
                  placeholder="Kraków"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Kraj</Label>
                <Select
                  value={formData.destinationCountry}
                  onValueChange={(value) => handleFormSelectChange("destinationCountry", value)}
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
          </div>
        </div>
      </div>

      {/* Cargo */}
      <div className="space-y-4">
        <h3 className="font-semibold">Ładunek</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="cargoDescription">Opis ładunku</Label>
            <Textarea
              id="cargoDescription"
              name="cargoDescription"
              value={formData.cargoDescription}
              onChange={handleFormChange}
              placeholder="Opis towaru..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoWeight">Waga (kg)</Label>
            <Input
              id="cargoWeight"
              name="cargoWeight"
              type="number"
              value={formData.cargoWeight}
              onChange={handleFormChange}
              placeholder="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoVolume">Objętość (m³)</Label>
            <Input
              id="cargoVolume"
              name="cargoVolume"
              type="number"
              value={formData.cargoVolume}
              onChange={handleFormChange}
              placeholder="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoPallets">Ilość palet</Label>
            <Input
              id="cargoPallets"
              name="cargoPallets"
              type="number"
              value={formData.cargoPallets}
              onChange={handleFormChange}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="space-y-4">
        <h3 className="font-semibold">Cena</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="priceNet">Cena netto</Label>
            <Input
              id="priceNet"
              name="priceNet"
              type="number"
              value={formData.priceNet}
              onChange={handleFormChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Waluta</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleFormSelectChange("currency", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Uwagi</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleFormChange}
          placeholder="Dodatkowe informacje..."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarClock className="h-8 w-8" />
            Zlecenia cykliczne
          </h1>
          <p className="text-muted-foreground">
            Zarządzanie szablonami zleceń cyklicznych
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchTemplates()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odśwież
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nowy szablon
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po nazwie lub trasie..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtry
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Aktywne
                  </Badge>
                )}
              </Button>
              <Button type="submit">Szukaj</Button>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="active">Aktywne</SelectItem>
                      <SelectItem value="inactive">Nieaktywne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Częstotliwość</Label>
                  <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      {Object.entries(frequencyLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <div className="md:col-span-2 flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Wyczyść filtry
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista szablonów</CardTitle>
          <CardDescription>
            Znaleziono {pagination.total} szablonów
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nie znaleziono szablonów zleceń cyklicznych</p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Wyczyść filtry
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Częstotliwość</TableHead>
                    <TableHead>Trasa</TableHead>
                    <TableHead>Kontrahent</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Następna generacja</TableHead>
                    <TableHead className="text-center">Wygenerowano</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <p className="font-medium">{template.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {frequencyLabels[template.frequency]}
                        </Badge>
                        {template.dayOfWeek !== null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({dayOfWeekLabels[template.dayOfWeek]})
                          </span>
                        )}
                        {template.dayOfMonth !== null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({template.dayOfMonth}. dnia)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{template.originCity || template.origin}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span>{template.destinationCity || template.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.contractor ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {template.contractor.shortName || template.contractor.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(template.priceNet, template.currency)}
                      </TableCell>
                      <TableCell>
                        {template.isActive ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            Aktywny
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Nieaktywny
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.nextGenerationDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(template.nextGenerationDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{template.generatedCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(template)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateNow(template.id)}>
                              <Play className="mr-2 h-4 w-4" />
                              Generuj teraz
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(template.id, template.isActive)}
                            >
                              {template.isActive ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Wstrzymaj
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Wznów
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Strona {pagination.page} z {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Poprzednia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Następna
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nowy szablon zlecenia cyklicznego</DialogTitle>
            <DialogDescription>
              Wprowadź dane szablonu zlecenia cyklicznego
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit}>
            {renderFormContent()}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewDialog(false);
                  setFormData(initialFormData);
                  setFormErrors({});
                }}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Utwórz szablon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj szablon</DialogTitle>
            <DialogDescription>
              Zmodyfikuj dane szablonu zlecenia cyklicznego
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            {renderFormContent()}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingTemplate(null);
                  setFormData(initialFormData);
                  setFormErrors({});
                }}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="mr-2 h-4 w-4" />
                )}
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RecurringOrdersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RecurringOrdersPageContent />
    </Suspense>
  );
}
