"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Download,
  CheckCircle,
} from "lucide-react";

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

// Status colors
const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-500 hover:bg-gray-600",
  ISSUED: "bg-blue-500 hover:bg-blue-600",
  SENT: "bg-yellow-500 hover:bg-yellow-600",
  PAID: "bg-green-500 hover:bg-green-600",
  OVERDUE: "bg-red-500 hover:bg-red-600",
  CANCELLED: "bg-slate-400 hover:bg-slate-500",
};

// Badge variants for status
const statusBadgeVariants: Record<InvoiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ISSUED: "default",
  SENT: "outline",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

interface Contractor {
  id: string;
  name: string;
  shortName: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "SINGLE" | "COLLECTIVE" | "PROFORMA" | "CORRECTION";
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  contractor: Contractor | null;
  _count: {
    orders: number;
  };
}

interface InvoicesResponse {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function InvoicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [contractorId, setContractorId] = useState(searchParams.get("contractorId") || "all");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  // Resources for filters
  const [contractors, setContractors] = useState<Contractor[]>([]);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (status && status !== "all") params.set("status", status);
      if (contractorId && contractorId !== "all") params.set("contractorId", contractorId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/invoices?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch invoices");

      const data: InvoicesResponse = await response.json();
      setInvoices(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, status, contractorId, startDate, endDate]);

  // Fetch contractors for filters
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const response = await fetch("/api/contractors?limit=200");
        if (response.ok) {
          const data = await response.json();
          setContractors(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching contractors:", error);
      }
    };

    fetchContractors();
  }, []);

  // Fetch invoices on mount and filter change
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Clear filters
  const clearFilters = () => {
    setStatus("all");
    setContractorId("all");
    setStartDate("");
    setEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Delete invoice
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunac te fakture?")) return;

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas usuwania faktury");
        return;
      }

      fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Wystapil blad podczas usuwania faktury");
    }
  };

  // Update invoice status
  const handleStatusChange = async (id: string, newStatus: InvoiceStatus) => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas zmiany statusu");
        return;
      }

      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice status:", error);
      alert("Wystapil blad podczas zmiany statusu");
    }
  };

  // Download invoice as PDF
  const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}/pdf`);

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Wystapil blad podczas generowania PDF");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Wystapil blad podczas pobierania PDF");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format amount
  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  // Check if filters are active
  const hasActiveFilters = (status && status !== "all") || (contractorId && contractorId !== "all") || startDate || endDate;

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Faktury
          </h1>
          <p className="text-muted-foreground">
            Zarzadzanie fakturami sprzedazowymi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchInvoices()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odswiez
          </Button>
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Nowa faktura
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full md:w-auto"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtry
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Aktywne
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  Wyczysc filtry
                </Button>
              )}
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kontrahent</Label>
                  <Select value={contractorId} onValueChange={setContractorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wszyscy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszyscy</SelectItem>
                      {contractors.map((contractor) => (
                        <SelectItem key={contractor.id} value={contractor.id}>
                          {contractor.shortName || contractor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data od</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data do</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista faktur</CardTitle>
          <CardDescription>
            Znaleziono {pagination.total} faktur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nie znaleziono faktur</p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Wyczysc filtry
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numer faktury</TableHead>
                    <TableHead>Kontrahent</TableHead>
                    <TableHead>Data wystawienia</TableHead>
                    <TableHead>Termin platnosci</TableHead>
                    <TableHead className="text-right">Kwota brutto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {invoice.contractor ? (
                          <span>{invoice.contractor.shortName || invoice.contractor.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAmount(invoice.grossAmount, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(invoice.status)}>
                          {statusLabels[invoice.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/invoices/${invoice.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Szczegoly
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {invoice.status === "DRAFT" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(invoice.id, "SENT")}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Wyslij
                              </DropdownMenuItem>
                            )}
                            {(invoice.status === "ISSUED" || invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(invoice.id, "PAID")}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Oznacz jako oplacona
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Pobierz PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(invoice.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usun
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
                      Nastepna
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <InvoicesPageContent />
    </Suspense>
  );
}
