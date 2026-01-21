"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FileText,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  Calculator,
  Building2,
  Calendar,
  CreditCard,
} from "lucide-react";

// VAT rates
const VAT_RATES = [
  { value: 23, label: "23%" },
  { value: 8, label: "8%" },
  { value: 5, label: "5%" },
  { value: 0, label: "0%" },
  { value: -1, label: "zw." },
];

// Units
const UNITS = [
  { value: "szt.", label: "szt." },
  { value: "godz.", label: "godz." },
  { value: "km", label: "km" },
  { value: "t", label: "t" },
  { value: "m3", label: "m3" },
  { value: "usluga", label: "usluga" },
];

// Payment methods
const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "Przelew" },
  { value: "CASH", label: "Gotowka" },
  { value: "CARD", label: "Karta" },
];

// Zod schema for invoice item
const invoiceItemSchema = z.object({
  description: z.string().min(1, "Opis jest wymagany"),
  quantity: z.number().min(0.01, "Ilosc musi byc wieksza od 0"),
  unit: z.string().min(1, "Jednostka jest wymagana"),
  unitPriceNet: z.number().min(0, "Cena musi byc wieksza lub rowna 0"),
  vatRate: z.number(),
});

// Zod schema for invoice
const invoiceFormSchema = z.object({
  type: z.enum(["SINGLE", "COLLECTIVE", "PROFORMA", "CORRECTION"]),
  contractorId: z.string().min(1, "Kontrahent jest wymagany"),
  issueDate: z.string().min(1, "Data wystawienia jest wymagana"),
  saleDate: z.string().optional(),
  dueDate: z.string().min(1, "Termin platnosci jest wymagany"),
  paymentMethod: z.enum(["TRANSFER", "CASH", "CARD"]),
  bankAccount: z.string().optional(),
  currency: z.string(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Faktura musi zawierac co najmniej jedna pozycje"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface Contractor {
  id: string;
  name: string;
  shortName: string | null;
  nip: string | null;
  address: string | null;
  city: string | null;
  paymentDays: number;
}

// Initial item
const defaultItem = {
  description: "",
  quantity: 1,
  unit: "szt.",
  unitPriceNet: 0,
  vatRate: 23,
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loadingContractors, setLoadingContractors] = useState(true);

  // Get today's date and default due date (14 days)
  const today = new Date().toISOString().split("T")[0];
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Form setup
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      type: "SINGLE",
      contractorId: "",
      issueDate: today,
      saleDate: today,
      dueDate: defaultDueDate,
      paymentMethod: "TRANSFER",
      bankAccount: "",
      currency: "PLN",
      notes: "",
      items: [{ ...defaultItem }],
    },
  });

  // Field array for invoice items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch items for totals calculation
  const watchedItems = form.watch("items");
  const watchedContractorId = form.watch("contractorId");

  // Fetch contractors
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const response = await fetch("/api/contractors?limit=200&type=CLIENT");
        if (response.ok) {
          const data = await response.json();
          setContractors(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching contractors:", error);
      } finally {
        setLoadingContractors(false);
      }
    };

    fetchContractors();
  }, []);

  // Update due date when contractor changes
  useEffect(() => {
    if (watchedContractorId) {
      const contractor = contractors.find((c) => c.id === watchedContractorId);
      if (contractor) {
        const issueDate = form.getValues("issueDate");
        if (issueDate) {
          const dueDate = new Date(issueDate);
          dueDate.setDate(dueDate.getDate() + contractor.paymentDays);
          form.setValue("dueDate", dueDate.toISOString().split("T")[0]);
        }
      }
    }
  }, [watchedContractorId, contractors, form]);

  // Calculate item totals
  const calculateItemTotals = (item: typeof defaultItem) => {
    const netAmount = item.quantity * item.unitPriceNet;
    const vatAmount = item.vatRate >= 0 ? netAmount * (item.vatRate / 100) : 0;
    const grossAmount = netAmount + vatAmount;
    return { netAmount, vatAmount, grossAmount };
  };

  // Calculate invoice totals
  const calculateTotals = () => {
    let totalNet = 0;
    let totalVat = 0;
    let totalGross = 0;

    watchedItems.forEach((item) => {
      const { netAmount, vatAmount, grossAmount } = calculateItemTotals(item);
      totalNet += netAmount;
      totalVat += vatAmount;
      totalGross += grossAmount;
    });

    return { totalNet, totalVat, totalGross };
  };

  const totals = calculateTotals();

  // Format amount
  const formatAmount = (amount: number) => {
    return amount.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Handle form submit
  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          issueDate: new Date(data.issueDate),
          saleDate: data.saleDate ? new Date(data.saleDate) : null,
          dueDate: new Date(data.dueDate),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || "Wystapil blad podczas tworzenia faktury");
        return;
      }

      const invoice = await response.json();
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Wystapil blad podczas tworzenia faktury");
    } finally {
      setLoading(false);
    }
  };

  // Get selected contractor
  const selectedContractor = contractors.find((c) => c.id === watchedContractorId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/invoices">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Nowa faktura
            </h1>
            <p className="text-muted-foreground">
              Utworz nowa fakture sprzedazowa
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/invoices">Anuluj</Link>
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Zapisz fakture
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contractor Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Kontrahent
                  </CardTitle>
                  <CardDescription>
                    Wybierz kontrahenta dla faktury
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contractorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kontrahent *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={loadingContractors}
                        >
                          <FormControl>
                            <SelectTrigger className={form.formState.errors.contractorId ? "border-destructive" : ""}>
                              <SelectValue placeholder="Wybierz kontrahenta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contractors.map((contractor) => (
                              <SelectItem key={contractor.id} value={contractor.id}>
                                {contractor.shortName || contractor.name}
                                {contractor.nip && ` (NIP: ${contractor.nip})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedContractor && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">{selectedContractor.name}</p>
                      {selectedContractor.nip && (
                        <p className="text-sm text-muted-foreground">NIP: {selectedContractor.nip}</p>
                      )}
                      {selectedContractor.address && (
                        <p className="text-sm text-muted-foreground">
                          {selectedContractor.address}
                          {selectedContractor.city && `, ${selectedContractor.city}`}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Termin platnosci: {selectedContractor.paymentDays} dni
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Pozycje faktury
                  </CardTitle>
                  <CardDescription>
                    Dodaj pozycje do faktury
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Opis</TableHead>
                        <TableHead className="w-[80px]">Ilosc</TableHead>
                        <TableHead className="w-[100px]">Jm.</TableHead>
                        <TableHead className="w-[120px]">Cena netto</TableHead>
                        <TableHead className="w-[100px]">VAT</TableHead>
                        <TableHead className="text-right w-[120px]">Wartosc netto</TableHead>
                        <TableHead className="text-right w-[120px]">Wartosc brutto</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const itemTotals = calculateItemTotals(watchedItems[index] || defaultItem);
                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Opis uslugi/produktu"
                                        className={form.formState.errors.items?.[index]?.description ? "border-destructive" : ""}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-20"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.unit`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {UNITS.map((unit) => (
                                          <SelectItem key={unit.value} value={unit.value}>
                                            {unit.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.unitPriceNet`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-28"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.vatRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select
                                      onValueChange={(value) => field.onChange(parseFloat(value))}
                                      defaultValue={field.value.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="w-20">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {VAT_RATES.map((rate) => (
                                          <SelectItem key={rate.value} value={rate.value.toString()}>
                                            {rate.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(itemTotals.netAmount)} PLN
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(itemTotals.grossAmount)} PLN
                            </TableCell>
                            <TableCell>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-medium">
                          Razem netto:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatAmount(totals.totalNet)} PLN
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-medium">
                          Razem VAT:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatAmount(totals.totalVat)} PLN
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow className="bg-primary/5">
                        <TableCell colSpan={5} className="text-right font-bold text-lg">
                          Do zaplaty:
                        </TableCell>
                        <TableCell colSpan={2} className="text-right font-bold text-lg">
                          {formatAmount(totals.totalGross)} PLN
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>

                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => append({ ...defaultItem })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj pozycje
                    </Button>
                  </div>

                  {form.formState.errors.items && (
                    <p className="text-sm text-destructive mt-2">
                      {form.formState.errors.items.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Uwagi</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <textarea
                            {...field}
                            className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring dark:bg-input/30"
                            placeholder="Dodatkowe uwagi do faktury..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Invoice Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Typ faktury</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SINGLE">Pojedyncza</SelectItem>
                            <SelectItem value="COLLECTIVE">Zbiorcza</SelectItem>
                            <SelectItem value="PROFORMA">Pro forma</SelectItem>
                            <SelectItem value="CORRECTION">Korekta</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daty
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data wystawienia *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="saleDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data sprzedazy</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termin platnosci *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Platnosc
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metoda platnosci</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numer konta</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00 0000 0000 0000 0000 0000 0000" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waluta</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLN">PLN</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-primary/5">
                <CardHeader>
                  <CardTitle>Podsumowanie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Netto:</span>
                    <span className="font-medium">{formatAmount(totals.totalNet)} PLN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT:</span>
                    <span className="font-medium">{formatAmount(totals.totalVat)} PLN</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Brutto:</span>
                    <span className="font-bold">{formatAmount(totals.totalGross)} PLN</span>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Zapisz fakture
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
