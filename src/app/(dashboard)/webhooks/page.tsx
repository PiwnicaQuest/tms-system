"use client";

import { useState, useEffect, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Webhook,
  Plus,
  Loader2,
  Trash2,
  Edit,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Copy,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
interface WebhookEvent {
  value: string;
  label: string;
}

interface WebhookStats {
  totalDeliveries: number;
  recentSuccess: number;
  recentFailed: number;
  lastDeliveryAt: string | null;
  lastDeliverySuccess: boolean | null;
}

interface WebhookData {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  headers: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  stats: WebhookStats;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  response: unknown;
  statusCode: number | null;
  success: boolean;
  attempts: number;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface WebhookDetailStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
}

interface WebhookDetail extends Omit<WebhookData, 'stats'> {
  deliveries: WebhookDelivery[];
  stats: WebhookDetailStats;
}

// Event labels in Polish
const eventLabels: Record<string, string> = {
  "order.created": "Zlecenie utworzone",
  "order.updated": "Zlecenie zaktualizowane",
  "order.status_changed": "Zmiana statusu zlecenia",
  "invoice.created": "Faktura utworzona",
  "invoice.paid": "Faktura oplacona",
  "vehicle.updated": "Pojazd zaktualizowany",
  "driver.updated": "Kierowca zaktualizowany",
  test: "Test",
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [availableEvents, setAvailableEvents] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected webhook for editing/viewing
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(
    null
  );
  const [webhookDetail, setWebhookDetail] = useState<WebhookDetail | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as string[],
    isActive: true,
    headers: "",
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delivery pagination
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryTotalPages, setDeliveryTotalPages] = useState(1);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);

  // Fetch webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch(`/api/webhooks?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data || []);
        setAvailableEvents(data.availableEvents || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas pobierania webhookow");
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast.error("Blad podczas pobierania webhookow");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Fetch webhook details
  const fetchWebhookDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setWebhookDetail(data);
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error("Error fetching webhook details:", error);
    }
  };

  // Fetch deliveries with pagination
  const fetchDeliveries = async (webhookId: string, page: number) => {
    try {
      const response = await fetch(
        `/api/webhooks/${webhookId}/deliveries?page=${page}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.data || []);
        setDeliveryTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    }
  };

  // Handle add webhook
  const handleAddWebhook = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error("Wypelnij wszystkie wymagane pola");
      return;
    }

    setIsSaving(true);
    try {
      let headers = null;
      if (formData.headers.trim()) {
        try {
          headers = JSON.parse(formData.headers);
        } catch {
          toast.error("Nieprawidlowy format naglowkow JSON");
          setIsSaving(false);
          return;
        }
      }

      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          events: formData.events,
          isActive: formData.isActive,
          headers,
        }),
      });

      if (response.ok) {
        const newWebhook = await response.json();
        toast.success("Webhook zostal utworzony");

        // Show secret to user (only time it's visible)
        toast.info(
          `Secret webhooka: ${newWebhook.secret}. Skopiuj go teraz - nie bedzie wyswietlany ponownie!`,
          { duration: 15000 }
        );

        setAddDialogOpen(false);
        resetForm();
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas tworzenia webhooka");
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
      toast.error("Blad podczas tworzenia webhooka");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update webhook
  const handleUpdateWebhook = async () => {
    if (!selectedWebhook) return;

    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error("Wypelnij wszystkie wymagane pola");
      return;
    }

    setIsSaving(true);
    try {
      let headers = null;
      if (formData.headers.trim()) {
        try {
          headers = JSON.parse(formData.headers);
        } catch {
          toast.error("Nieprawidlowy format naglowkow JSON");
          setIsSaving(false);
          return;
        }
      }

      const response = await fetch(`/api/webhooks/${selectedWebhook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          events: formData.events,
          isActive: formData.isActive,
          headers,
        }),
      });

      if (response.ok) {
        toast.success("Webhook zostal zaktualizowany");
        setEditDialogOpen(false);
        resetForm();
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas aktualizacji webhooka");
      }
    } catch (error) {
      console.error("Error updating webhook:", error);
      toast.error("Blad podczas aktualizacji webhooka");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete webhook
  const handleDeleteWebhook = async () => {
    if (!selectedWebhook) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/webhooks/${selectedWebhook.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Webhook zostal usuniety");
        setDeleteDialogOpen(false);
        setSelectedWebhook(null);
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas usuwania webhooka");
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("Blad podczas usuwania webhooka");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle test webhook
  const handleTestWebhook = async (webhookId: string) => {
    setIsTesting(true);
    try {
      const response = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Testowy webhook zostal wyslany pomyslnie");
      } else {
        toast.error(result.error || "Wyslanie testowego webhooka nie powiodlo sie");
      }

      // Refresh details if viewing
      if (webhookDetail?.id === webhookId) {
        fetchWebhookDetail(webhookId);
      }
    } catch (error) {
      console.error("Error sending test webhook:", error);
      toast.error("Blad podczas wysylania testowego webhooka");
    } finally {
      setIsTesting(false);
    }
  };

  // Handle retry delivery
  const handleRetryDelivery = async (
    webhookId: string,
    deliveryId: string
  ) => {
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/webhooks/${webhookId}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Webhook zostal ponownie wyslany");
      } else {
        toast.error(
          result.error || "Ponowne wyslanie webhooka nie powiodlo sie"
        );
      }

      // Refresh deliveries
      if (webhookDetail) {
        fetchDeliveries(webhookDetail.id, deliveryPage);
      }
    } catch (error) {
      console.error("Error retrying webhook:", error);
      toast.error("Blad podczas ponownego wysylania webhooka");
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle toggle webhook active status
  const handleToggleActive = async (webhook: WebhookData) => {
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });

      if (response.ok) {
        toast.success(
          webhook.isActive
            ? "Webhook zostal wylaczony"
            : "Webhook zostal wlaczony"
        );
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas aktualizacji");
      }
    } catch (error) {
      console.error("Error toggling webhook:", error);
      toast.error("Blad podczas aktualizacji");
    }
  };

  // Open edit dialog
  const openEditDialog = (webhook: WebhookData) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      headers: webhook.headers ? JSON.stringify(webhook.headers, null, 2) : "",
    });
    setEditDialogOpen(true);
  };

  // Open detail dialog
  const openDetailDialog = async (webhook: WebhookData) => {
    setSelectedWebhook(webhook);
    setDeliveryPage(1);
    await fetchWebhookDetail(webhook.id);
    setDetailDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      events: [],
      isActive: true,
      headers: "",
    });
    setSelectedWebhook(null);
  };

  // Toggle event selection
  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Skopiowano do schowka");
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="h-8 w-8" />
            Webhooki
          </h1>
          <p className="text-muted-foreground">
            Zarzadzanie webhookami i integracjami zewnetrznymi
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dodaj nowy webhook</DialogTitle>
              <DialogDescription>
                Skonfiguruj webhook do otrzymywania powiadomien o zdarzeniach w
                systemie
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nazwa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Moj webhook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    placeholder="https://example.com/webhook"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Zdarzenia *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableEvents.map((event) => (
                    <div
                      key={event.value}
                      className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-colors ${
                        formData.events.includes(event.value)
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-muted"
                      }`}
                      onClick={() => toggleEvent(event.value)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{event.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headers">
                  Dodatkowe naglowki (JSON, opcjonalne)
                </Label>
                <Input
                  id="headers"
                  value={formData.headers}
                  onChange={(e) =>
                    setFormData({ ...formData, headers: e.target.value })
                  }
                  placeholder='{"Authorization": "Bearer token"}'
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Aktywny</Label>
                  <p className="text-sm text-muted-foreground">
                    Webhook bedzie otrzymywal powiadomienia
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Anuluj
              </Button>
              <Button onClick={handleAddWebhook} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Dodaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista webhookow</CardTitle>
          <CardDescription>
            Wszystkie skonfigurowane webhooki dla Twojej organizacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Zdarzenia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ostatnia dostawa</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{webhook.url}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(webhook.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {eventLabels[event] || event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.isActive}
                        onCheckedChange={() => handleToggleActive(webhook)}
                      />
                      <Badge
                        variant={webhook.isActive ? "default" : "secondary"}
                        className={
                          webhook.isActive
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-500 text-white"
                        }
                      >
                        {webhook.isActive ? "Aktywny" : "Nieaktywny"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {webhook.stats.lastDeliveryAt ? (
                        <>
                          {webhook.stats.lastDeliverySuccess ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {formatDate(webhook.stats.lastDeliveryAt)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Brak
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetailDialog(webhook)}
                        title="Szczegoly"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTestWebhook(webhook.id)}
                        disabled={isTesting || !webhook.isActive}
                        title="Wyslij test"
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(webhook)}
                        title="Edytuj"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setDeleteDialogOpen(true);
                        }}
                        title="Usun"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {webhooks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nie masz jeszcze zadnych webhookow</p>
                    <p className="text-sm">
                      Kliknij &quot;Dodaj webhook&quot; aby utworzyc pierwszy
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Strona {page} z {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj webhook</DialogTitle>
            <DialogDescription>
              Zaktualizuj konfiguracje webhooka
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nazwa *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-url">URL *</Label>
                <Input
                  id="edit-url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zdarzenia *</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableEvents.map((event) => (
                  <div
                    key={event.value}
                    className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-colors ${
                      formData.events.includes(event.value)
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-muted"
                    }`}
                    onClick={() => toggleEvent(event.value)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.value)}
                      onChange={() => toggleEvent(event.value)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{event.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-headers">
                Dodatkowe naglowki (JSON, opcjonalne)
              </Label>
              <Input
                id="edit-headers"
                value={formData.headers}
                onChange={(e) =>
                  setFormData({ ...formData, headers: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Aktywny</Label>
                <p className="text-sm text-muted-foreground">
                  Webhook bedzie otrzymywal powiadomienia
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleUpdateWebhook} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Edit className="mr-2 h-4 w-4" />
              )}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              {webhookDetail?.name || "Szczegoly webhooka"}
            </DialogTitle>
            <DialogDescription>{webhookDetail?.url}</DialogDescription>
          </DialogHeader>

          {webhookDetail && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 py-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        {webhookDetail.stats.totalDeliveries}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Wszystkie dostawy
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-emerald-500">
                        {webhookDetail.stats.successfulDeliveries}
                      </div>
                      <p className="text-xs text-muted-foreground">Udane</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-red-500">
                        {webhookDetail.stats.failedDeliveries}
                      </div>
                      <p className="text-xs text-muted-foreground">Nieudane</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        {webhookDetail.stats.successRate}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Skutecznosc
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Events */}
                <div className="space-y-2">
                  <Label>Subskrybowane zdarzenia</Label>
                  <div className="flex flex-wrap gap-2">
                    {webhookDetail.events.map((event) => (
                      <Badge key={event} variant="secondary">
                        {eventLabels[event] || event}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Deliveries */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Historia dostarczenia</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        fetchDeliveries(webhookDetail.id, deliveryPage)
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Odswiez
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zdarzenie</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Kod HTTP</TableHead>
                        <TableHead>Proby</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Akcja</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {eventLabels[delivery.event] || delivery.event}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {delivery.success ? (
                              <Badge className="bg-emerald-500 text-white">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Sukces
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">
                                <XCircle className="mr-1 h-3 w-3" />
                                Blad
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {delivery.statusCode || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {delivery.attempts}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(delivery.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {!delivery.success && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRetryDelivery(
                                    webhookDetail.id,
                                    delivery.id
                                  )
                                }
                                disabled={isRetrying}
                              >
                                {isRetrying ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                )}
                                Ponow
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {deliveries.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                          >
                            Brak historii dostarczenia
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Delivery Pagination */}
                  {deliveryTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPage = Math.max(1, deliveryPage - 1);
                          setDeliveryPage(newPage);
                          fetchDeliveries(webhookDetail.id, newPage);
                        }}
                        disabled={deliveryPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Strona {deliveryPage} z {deliveryTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPage = Math.min(
                            deliveryTotalPages,
                            deliveryPage + 1
                          );
                          setDeliveryPage(newPage);
                          fetchDeliveries(webhookDetail.id, newPage);
                        }}
                        disabled={deliveryPage === deliveryTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleTestWebhook(webhookDetail?.id || "")}
              disabled={isTesting || !webhookDetail?.isActive}
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Wyslij test
            </Button>
            <Button onClick={() => setDetailDialogOpen(false)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Usun webhook
            </DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunac webhook &quot;{selectedWebhook?.name}&quot;?
              Ta operacja jest nieodwracalna i usunie rowniez cala historie
              dostarczenia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWebhook}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Usun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
