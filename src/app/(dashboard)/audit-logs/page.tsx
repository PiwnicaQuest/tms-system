"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
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
import { AutocompleteInput, AutocompleteOption, fetchUsers } from "@/components/ui/autocomplete-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield,
  Filter,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Calendar,
} from "lucide-react";

// Types
type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"
  | "VIEW"
  | "STATUS_CHANGE";

type AuditEntityType =
  | "Order"
  | "Invoice"
  | "Vehicle"
  | "Driver"
  | "Trailer"
  | "Contractor"
  | "Document"
  | "Cost"
  | "User"
  | "DailyWorkRecord"
  | "Webhook"
  | "Settings";

interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Polish labels
const actionLabels: Record<AuditAction, string> = {
  CREATE: "Utworzenie",
  UPDATE: "Aktualizacja",
  DELETE: "Usuniecie",
  LOGIN: "Logowanie",
  LOGOUT: "Wylogowanie",
  EXPORT: "Eksport",
  IMPORT: "Import",
  VIEW: "Podglad",
  STATUS_CHANGE: "Zmiana statusu",
};

const entityTypeLabels: Record<AuditEntityType, string> = {
  Order: "Zlecenie",
  Invoice: "Faktura",
  Vehicle: "Pojazd",
  Driver: "Kierowca",
  Trailer: "Naczepa",
  Contractor: "Kontrahent",
  Document: "Dokument",
  Cost: "Koszt",
  User: "Uzytkownik",
  DailyWorkRecord: "Rekord pracy",
  Webhook: "Webhook",
  Settings: "Ustawienia",
};

// Action colors
const actionColors: Record<AuditAction, string> = {
  CREATE: "bg-green-500 hover:bg-green-600",
  UPDATE: "bg-blue-500 hover:bg-blue-600",
  DELETE: "bg-red-500 hover:bg-red-600",
  LOGIN: "bg-emerald-500 hover:bg-emerald-600",
  LOGOUT: "bg-slate-500 hover:bg-slate-600",
  EXPORT: "bg-purple-500 hover:bg-purple-600",
  IMPORT: "bg-orange-500 hover:bg-orange-600",
  VIEW: "bg-cyan-500 hover:bg-cyan-600",
  STATUS_CHANGE: "bg-amber-500 hover:bg-amber-600",
};

function AuditLogsPageContent() {
  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [action, setAction] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [userId, setUserId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // User autocomplete state
  const [selectedUser, setSelectedUser] = useState<AutocompleteOption | null>(null);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (action && action !== "all") params.set("action", action);
      if (entityType && entityType !== "all") params.set("entityType", entityType);
      if (userId && userId !== "all") params.set("userId", userId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);

      if (response.status === 403) {
        // User doesn't have permission
        setLogs([]);
        return;
      }

      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data: AuditLogsResponse = await response.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, action, entityType, userId, dateFrom, dateTo]);

  // Fetch logs on mount and filter change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Clear filters
  const clearFilters = () => {
    setAction("");
    setEntityType("");
    setUserId("");
    setSelectedUser(null);
    setDateFrom("");
    setDateTo("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (action && action !== "all") params.set("action", action);
      if (entityType && entityType !== "all") params.set("entityType", entityType);
      if (userId && userId !== "all") params.set("userId", userId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/audit-logs/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logi-audytowe-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      alert("Wystapil blad podczas eksportu");
    } finally {
      setExporting(false);
    }
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Format change value
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Tak" : "Nie";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  // Check if filters are active
  const hasActiveFilters = action || entityType || userId || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Logi audytowe
          </h1>
          <p className="text-muted-foreground">
            Historia wszystkich operacji w systemie
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchLogs()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Odswiez
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Eksportowanie..." : "Eksport CSV"}
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
                className="flex-shrink-0"
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
              <div className="grid gap-4 md:grid-cols-5 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Akcja</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      {Object.entries(actionLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Typ encji</Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      {Object.entries(entityTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Uzytkownik</Label>
                  <AutocompleteInput
                    value={userId}
                    onChange={(val) => setUserId(val)}
                    onSelect={(option) => {
                      setSelectedUser(option);
                      setUserId(option?.value || "");
                    }}
                    fetchOptions={fetchUsers}
                    placeholder="Wyszukaj użytkownika..."
                    selectedOption={selectedUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data od</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data do</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historia operacji</CardTitle>
          <CardDescription>
            Znaleziono {pagination.total} wpisow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nie znaleziono logow audytowych</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Wyczysc filtry
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Uzytkownik</TableHead>
                    <TableHead>Akcja</TableHead>
                    <TableHead>Encja</TableHead>
                    <TableHead>ID encji</TableHead>
                    <TableHead>Adres IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <Collapsible key={log.id} asChild>
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRow(log.id)}
                              >
                                {expandedRows.has(log.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {log.user?.name || "-"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {log.user?.email || "-"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${actionColors[log.action]} text-white`}
                            >
                              {actionLabels[log.action]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {entityTypeLabels[log.entityType]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono text-muted-foreground">
                              {log.entityId
                                ? log.entityId.slice(0, 8) + "..."
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {log.ipAddress || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30">
                              <div className="p-4 space-y-4">
                                {/* Changes */}
                                {log.changes &&
                                  Object.keys(log.changes).length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Zmiany:
                                      </h4>
                                      <div className="rounded-md border overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-1/3">
                                                Pole
                                              </TableHead>
                                              <TableHead className="w-1/3">
                                                Stara wartosc
                                              </TableHead>
                                              <TableHead className="w-1/3">
                                                Nowa wartosc
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {Object.entries(log.changes).map(
                                              ([field, change]) => (
                                                <TableRow key={field}>
                                                  <TableCell className="font-medium">
                                                    {field}
                                                  </TableCell>
                                                  <TableCell className="text-red-600">
                                                    {formatValue(change.old)}
                                                  </TableCell>
                                                  <TableCell className="text-green-600">
                                                    {formatValue(change.new)}
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            )}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}

                                {/* Metadata */}
                                {log.metadata &&
                                  Object.keys(log.metadata).length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Metadane:
                                      </h4>
                                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                {/* User Agent */}
                                {log.userAgent && (
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      User Agent:
                                    </h4>
                                    <p className="text-xs text-muted-foreground break-all">
                                      {log.userAgent}
                                    </p>
                                  </div>
                                )}

                                {/* No details message */}
                                {!log.changes &&
                                  !log.metadata &&
                                  !log.userAgent && (
                                    <p className="text-sm text-muted-foreground">
                                      Brak dodatkowych informacji
                                    </p>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
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

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuditLogsPageContent />
    </Suspense>
  );
}
