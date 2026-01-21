"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  ArrowLeft,
  Pencil,
  Send,
  CheckCircle,
  Download,
  XCircle,
  RefreshCw,
  Building2,
  Calendar,
  CreditCard,
  MoreHorizontal,
  Printer,
  Mail,
  Copy,
  Upload,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

// Invoice status type
type InvoiceStatus = "DRAFT" | "ISSUED" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

// Status labels in Polish
const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Szkic",
  ISSUED: "Wystawiona",
  SENT: "Wyslana",
  PAID: "Oplacona",
  OVERDUE: "Przeterminowana",
  CANCELLED: "Anulowana",
};

// Payment method labels
const paymentMethodLabels: Record<string, string> = {
  TRANSFER: "Przelew",
  CASH: "Gotowka",
  CARD: "Karta",
};

// KSeF status type
type KsefStatus = "NOT_SENT" | "PENDING" | "SENT" | "ACCEPTED" | "REJECTED" | "ERROR";

// KSeF status labels in Polish
const ksefStatusLabels: Record<KsefStatus, string> = {
  NOT_SENT: "Nie wyslano",
  PENDING: "Oczekuje",
  SENT: "Wyslano",
  ACCEPTED: "Przyjeto",
  REJECTED: "Odrzucono",
  ERROR: "Blad",
};

interface Contractor {
  id: string;
  name: string;
  shortName: string | null;
  nip: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  email: string | null;
  phone: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceNet: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

interface Order {
  id: string;
  orderNumber: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "SINGLE" | "COLLECTIVE" | "PROFORMA" | "CORRECTION";
  status: InvoiceStatus;
  issueDate: string;
  saleDate: string | null;
  dueDate: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  paymentMethod: string;
  bankAccount: string | null;
  isPaid: boolean;
  paidDate: string | null;
  paidAmount: number | null;
  notes: string | null;
  contractor: Contractor | null;
  items: InvoiceItem[];
  orders: Order[];
  // KSeF fields
  ksefNumber: string | null;
  ksefStatus: KsefStatus | null;
  ksefSentAt: string | null;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingToKsef, setSendingToKsef] = useState(false);
  const [downloadingUpo, setDownloadingUpo] = useState(false);

  // Fetch invoice
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push("/invoices");
            return;
          }
          throw new Error("Failed to fetch invoice");
        }
        const data = await response.json();
        setInvoice(data);
      } catch (error) {
        console.error("Error fetching invoice:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, router]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format amount
  const formatAmount = (amount: number, currency: string = "PLN") => {
    return `${amount.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  // Get status badge style
  const getStatusBadgeClass = (invoiceStatus: InvoiceStatus) => {
    const baseClasses = "text-xs font-medium";
    switch (invoiceStatus) {
      case "DRAFT":
        return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
      case "ISSUED":
        return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`;
      case "SENT":
        return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300`;
      case "PAID":
        return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`;
      case "OVERDUE":
        return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`;
      case "CANCELLED":
        return `${baseClasses} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`;
      default:
        return baseClasses;
    }
  };

  // Get KSeF status badge style
  const getKsefStatusBadgeClass = (ksefStatus: KsefStatus | null) => {
    const baseClasses = "text-xs font-medium";
    switch (ksefStatus) {
      case "NOT_SENT":
        return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
      case "PENDING":
        return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300`;
      case "SENT":
        return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`;
      case "ACCEPTED":
        return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`;
      case "REJECTED":
        return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`;
      case "ERROR":
        return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
    }
  };

  // Get KSeF status icon
  const getKsefStatusIcon = (ksefStatus: KsefStatus | null) => {
    switch (ksefStatus) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "SENT":
        return <Upload className="h-4 w-4" />;
      case "ACCEPTED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "REJECTED":
      case "ERROR":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas zmiany statusu");
        return;
      }

      const updatedInvoice = await response.json();
      setInvoice(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      alert("Wystapil blad podczas zmiany statusu");
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          isPaid: true,
          paidDate: new Date().toISOString(),
          paidAmount: invoice?.grossAmount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas oznaczania faktury jako oplaconej");
        return;
      }

      const updatedInvoice = await response.json();
      setInvoice(updatedInvoice);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      alert("Wystapil blad podczas oznaczania faktury jako oplaconej");
    }
  };

  // Handle download PDF
  const handleDownloadPdf = async () => {
    if (!invoice) return;
    
    setDownloadingPdf(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas generowania PDF");
        return;
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `faktura-${invoice.invoiceNumber.replace(/[/\\]/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Wystapil blad podczas pobierania PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm("Czy na pewno chcesz usunac te fakture?")) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas usuwania faktury");
        return;
      }

      router.push("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Wystapil blad podczas usuwania faktury");
    }
  };

  // Handle send to KSeF
  const handleSendToKsef = async () => {
    if (!invoice) return;

    setSendingToKsef(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/ksef`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Wystapil blad podczas wysylania do KSeF");
        return;
      }

      toast.success("Faktura zostala wyslana do KSeF");

      // Refresh invoice data
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
      if (invoiceResponse.ok) {
        const updatedInvoice = await invoiceResponse.json();
        setInvoice(updatedInvoice);
      }
    } catch (error) {
      console.error("Error sending to KSeF:", error);
      toast.error("Wystapil blad podczas wysylania do KSeF");
    } finally {
      setSendingToKsef(false);
    }
  };

  // Handle download UPO
  const handleDownloadUpo = async () => {
    if (!invoice?.ksefNumber) return;

    setDownloadingUpo(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/ksef/upo`);

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Wystapil blad podczas pobierania UPO");
        return;
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `UPO-${invoice.ksefNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("UPO zostalo pobrane");
    } catch (error) {
      console.error("Error downloading UPO:", error);
      toast.error("Wystapil blad podczas pobierania UPO");
    } finally {
      setDownloadingUpo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Faktura nie zostala znaleziona</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/invoices">Powrot do listy faktur</Link>
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
            <Link href="/invoices">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8" />
                {invoice.invoiceNumber}
              </h1>
              <Badge className={getStatusBadgeClass(invoice.status)}>
                {statusLabels[invoice.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Szczegoly faktury
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Akcje
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplikuj
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {invoice.status === "DRAFT" && (
                <DropdownMenuItem onClick={() => handleStatusChange("ISSUED")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Wystaw fakture
                </DropdownMenuItem>
              )}
              {invoice.status === "ISSUED" && (
                <DropdownMenuItem onClick={() => handleStatusChange("SENT")}>
                  <Send className="mr-2 h-4 w-4" />
                  Oznacz jako wyslana
                </DropdownMenuItem>
              )}
              {(invoice.status === "ISSUED" || invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                <DropdownMenuItem onClick={handleMarkAsPaid}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Oznacz jako oplacona
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Mail className="mr-2 h-4 w-4" />
                Wyslij emailem
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer className="mr-2 h-4 w-4" />
                Drukuj
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <Download className="mr-2 h-4 w-4" />
                {downloadingPdf ? "Generowanie..." : "Pobierz PDF"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* KSeF Actions */}
              {!invoice.ksefNumber && invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && (
                <DropdownMenuItem onClick={handleSendToKsef} disabled={sendingToKsef}>
                  <Upload className="mr-2 h-4 w-4" />
                  {sendingToKsef ? "Wysylanie..." : "Wyslij do KSeF"}
                </DropdownMenuItem>
              )}
              {invoice.ksefStatus === "ACCEPTED" && invoice.ksefNumber && (
                <DropdownMenuItem onClick={handleDownloadUpo} disabled={downloadingUpo}>
                  <FileCheck className="mr-2 h-4 w-4" />
                  {downloadingUpo ? "Pobieranie..." : "Pobierz UPO"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
                <DropdownMenuItem onClick={() => handleStatusChange("CANCELLED")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Anuluj fakture
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contractor Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dane kontrahenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.contractor ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Nazwa</p>
                    <p className="font-medium">{invoice.contractor.name}</p>
                    {invoice.contractor.shortName && (
                      <p className="text-sm text-muted-foreground">({invoice.contractor.shortName})</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NIP</p>
                    <p className="font-medium">{invoice.contractor.nip || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adres</p>
                    <p className="font-medium">
                      {invoice.contractor.address || "-"}
                      {invoice.contractor.postalCode && invoice.contractor.city && (
                        <span className="block">
                          {invoice.contractor.postalCode} {invoice.contractor.city}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kontakt</p>
                    <p className="font-medium">{invoice.contractor.email || "-"}</p>
                    {invoice.contractor.phone && (
                      <p className="text-sm">{invoice.contractor.phone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Brak danych kontrahenta</p>
              )}
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>Pozycje faktury</CardTitle>
              <CardDescription>
                {invoice.items.length} {invoice.items.length === 1 ? "pozycja" : invoice.items.length > 1 && invoice.items.length < 5 ? "pozycje" : "pozycji"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Lp.</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead className="text-right">Ilosc</TableHead>
                    <TableHead>Jm.</TableHead>
                    <TableHead className="text-right">Cena netto</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Wartosc netto</TableHead>
                    <TableHead className="text-right">Wartosc brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {formatAmount(item.unitPriceNet, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">{item.vatRate}%</TableCell>
                      <TableCell className="text-right">
                        {formatAmount(item.netAmount, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAmount(item.grossAmount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-medium">
                      Razem netto:
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(invoice.netAmount, invoice.currency)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-medium">
                      Razem VAT:
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(invoice.vatAmount, invoice.currency)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={6} className="text-right font-bold text-lg">
                      Do zaplaty:
                    </TableCell>
                    <TableCell colSpan={2} className="text-right font-bold text-lg">
                      {formatAmount(invoice.grossAmount, invoice.currency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Linked Orders */}
          {invoice.orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Powiazane zlecenia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {invoice.orders.map((order) => (
                    <Link key={order.id} href={`/orders/${order.id}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                        {order.orderNumber}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Data wystawienia</p>
                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              {invoice.saleDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Data sprzedazy</p>
                  <p className="font-medium">{formatDate(invoice.saleDate)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Termin platnosci</p>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
              {invoice.isPaid && invoice.paidDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Data zaplaty</p>
                  <p className="font-medium text-green-600">{formatDate(invoice.paidDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Platnosc
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Metoda platnosci</p>
                <p className="font-medium">{paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}</p>
              </div>
              {invoice.bankAccount && (
                <div>
                  <p className="text-sm text-muted-foreground">Numer konta</p>
                  <p className="font-mono text-sm">{invoice.bankAccount}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Status platnosci</p>
                <p className={`font-medium ${invoice.isPaid ? "text-green-600" : "text-yellow-600"}`}>
                  {invoice.isPaid ? "Oplacona" : "Nieoplacona"}
                </p>
                {invoice.isPaid && invoice.paidAmount && (
                  <p className="text-sm text-muted-foreground">
                    Zaplacono: {formatAmount(invoice.paidAmount, invoice.currency)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KSeF Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                KSeF
              </CardTitle>
              <CardDescription>
                Krajowy System e-Faktur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={getKsefStatusBadgeClass(invoice.ksefStatus)}>
                  <span className="flex items-center gap-1">
                    {getKsefStatusIcon(invoice.ksefStatus)}
                    {ksefStatusLabels[invoice.ksefStatus || "NOT_SENT"]}
                  </span>
                </Badge>
              </div>
              {invoice.ksefNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Numer KSeF</p>
                  <p className="font-mono text-xs break-all">{invoice.ksefNumber}</p>
                </div>
              )}
              {invoice.ksefSentAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Data wyslania</p>
                  <p className="font-medium">{formatDate(invoice.ksefSentAt)}</p>
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                {/* Show "Wyslij do KSeF" button if not sent yet and invoice is not draft/cancelled */}
                {!invoice.ksefNumber && invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && (
                  <Button
                    className="w-full"
                    onClick={handleSendToKsef}
                    disabled={sendingToKsef}
                  >
                    {sendingToKsef ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {sendingToKsef ? "Wysylanie..." : "Wyslij do KSeF"}
                  </Button>
                )}
                {/* Show "Pobierz UPO" button if invoice was accepted */}
                {invoice.ksefStatus === "ACCEPTED" && invoice.ksefNumber && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadUpo}
                    disabled={downloadingUpo}
                  >
                    {downloadingUpo ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {downloadingUpo ? "Pobieranie..." : "Pobierz UPO"}
                  </Button>
                )}
                {/* Info message for draft invoices */}
                {invoice.status === "DRAFT" && (
                  <p className="text-xs text-muted-foreground text-center">
                    Wystaw fakture aby moc wyslac do KSeF
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Uwagi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle>Podsumowanie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Netto:</span>
                <span className="font-medium">{formatAmount(invoice.netAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT:</span>
                <span className="font-medium">{formatAmount(invoice.vatAmount, invoice.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Brutto:</span>
                <span className="font-bold">{formatAmount(invoice.grossAmount, invoice.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Szybkie akcje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.status === "DRAFT" && (
                <Button className="w-full" onClick={() => handleStatusChange("ISSUED")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Wystaw fakture
                </Button>
              )}
              {invoice.status === "ISSUED" && (
                <Button className="w-full" onClick={() => handleStatusChange("SENT")}>
                  <Send className="mr-2 h-4 w-4" />
                  Wyslij do klienta
                </Button>
              )}
              {(invoice.status === "ISSUED" || invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                <Button className="w-full" variant="outline" onClick={handleMarkAsPaid}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Oznacz jako oplacona
                </Button>
              )}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadingPdf ? "Generowanie..." : "Pobierz PDF"}
              </Button>
              {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
                <Button variant="outline" className="w-full text-destructive" onClick={() => handleStatusChange("CANCELLED")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Anuluj fakture
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
