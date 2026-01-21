"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Building2,
  Users,
  FileText,
  Plus,
  Loader2,
  Save,
  Upload,
  Bell,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Types
interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  nip: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  logo: string | null;
  plan: string;
}

interface InvoiceSettings {
  paymentDays: number;
  bankAccount: string;
  defaultVatRate: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface NotificationSettings {
  emailEnabled: boolean;
  emailInspectionExpiry: boolean;
  emailInsuranceExpiry: boolean;
  emailLicenseExpiry: boolean;
  emailNewOrder: boolean;
  emailOrderStatus: boolean;
  emailInvoiceOverdue: boolean;
  reminderDays: number;
  reminderSecondDays: number;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
}

interface KsefSettings {
  ksefEnabled: boolean;
  ksefEnvironment: "test" | "production";
  ksefNip: string;
}

interface TwoFactorStatus {
  enabled: boolean;
  recoveryCodesCount: number;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  MANAGER: "Manager",
  DISPATCHER: "Dyspozytor",
  ACCOUNTANT: "Ksiegowy",
  DRIVER: "Kierowca",
  VIEWER: "Podglad",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);

  // Company settings state
  const [companySettings, setCompanySettings] = useState<TenantSettings | null>(null);

  // Invoice settings state
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    paymentDays: 14,
    bankAccount: "",
    defaultVatRate: 23,
  });

  // Users state
  const [users, setUsers] = useState<User[]>([]);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    emailInspectionExpiry: true,
    emailInsuranceExpiry: true,
    emailLicenseExpiry: true,
    emailNewOrder: true,
    emailOrderStatus: false,
    emailInvoiceOverdue: true,
    reminderDays: 30,
    reminderSecondDays: 7,
    dailyDigestEnabled: false,
    dailyDigestTime: "08:00",
  });
  const [isCheckingNotifications, setIsCheckingNotifications] = useState(false);

  // KSeF settings state
  const [ksefSettings, setKsefSettings] = useState<KsefSettings>({
    ksefEnabled: false,
    ksefEnvironment: "test",
    ksefNip: "",
  });
  const [isTestingKsef, setIsTestingKsef] = useState(false);
  const [ksefTestStatus, setKsefTestStatus] = useState<"idle" | "success" | "error">("idle");

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    role: "VIEWER",
  });

  // 2FA state
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus>({
    enabled: false,
    recoveryCodesCount: 0,
  });
  const [setup2FADialogOpen, setSetup2FADialogOpen] = useState(false);
  const [disable2FADialogOpen, setDisable2FADialogOpen] = useState(false);
  const [regenerateCodesDialogOpen, setRegenerateCodesDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [regenerateCode, setRegenerateCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    fetchUsers();
    fetchNotificationSettings();
    fetch2FAStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setCompanySettings(data.tenant);
        if (data.invoiceSettings) {
          setInvoiceSettings(data.invoiceSettings);
          // Also set KSeF settings from invoiceSettings
          setKsefSettings({
            ksefEnabled: data.invoiceSettings.ksefEnabled ?? false,
            ksefEnvironment: data.invoiceSettings.ksefEnvironment ?? "test",
            ksefNip: data.invoiceSettings.ksefNip ?? "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Blad podczas pobierania ustawien");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch("/api/notifications/settings");
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings({
          emailEnabled: data.emailEnabled ?? true,
          emailInspectionExpiry: data.emailInspectionExpiry ?? true,
          emailInsuranceExpiry: data.emailInsuranceExpiry ?? true,
          emailLicenseExpiry: data.emailLicenseExpiry ?? true,
          emailNewOrder: data.emailNewOrder ?? true,
          emailOrderStatus: data.emailOrderStatus ?? false,
          emailInvoiceOverdue: data.emailInvoiceOverdue ?? true,
          reminderDays: data.reminderDays ?? 30,
          reminderSecondDays: data.reminderSecondDays ?? 7,
          dailyDigestEnabled: data.dailyDigestEnabled ?? false,
          dailyDigestTime: data.dailyDigestTime ?? "08:00",
        });
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch("/api/auth/2fa/status");
      if (response.ok) {
        const data = await response.json();
        setTwoFactorStatus(data);
      }
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
    }
  };

  const handleSetup2FA = async () => {
    setIsSettingUp2FA(true);
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.qrCode);
        setTwoFactorSecret(data.secret);
        setSetup2FADialogOpen(true);
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas konfiguracji 2FA");
      }
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      toast.error("Blad podczas konfiguracji 2FA");
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const handleEnable2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Wprowadz 6-cyfrowy kod");
      return;
    }

    setIsEnabling2FA(true);
    try {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: twoFactorSecret,
          token: verificationCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecoveryCodes(data.recoveryCodes);
        setShowRecoveryCodes(true);
        setSetup2FADialogOpen(false);
        setVerificationCode("");
        fetch2FAStatus();
        toast.success("2FA zostalo wlaczone");
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas wlaczania 2FA");
      }
    } catch (error) {
      console.error("Error enabling 2FA:", error);
      toast.error("Blad podczas wlaczania 2FA");
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode) {
      toast.error("Wprowadz kod weryfikacyjny");
      return;
    }

    setIsDisabling2FA(true);
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: disableCode }),
      });

      if (response.ok) {
        setDisable2FADialogOpen(false);
        setDisableCode("");
        fetch2FAStatus();
        toast.success("2FA zostalo wylaczone");
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas wylaczania 2FA");
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast.error("Blad podczas wylaczania 2FA");
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const handleRegenerateCodes = async () => {
    if (regenerateCode.length !== 6) {
      toast.error("Wprowadz 6-cyfrowy kod");
      return;
    }

    setIsRegeneratingCodes(true);
    try {
      const response = await fetch("/api/auth/2fa/regenerate-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: regenerateCode }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecoveryCodes(data.recoveryCodes);
        setShowRecoveryCodes(true);
        setRegenerateCodesDialogOpen(false);
        setRegenerateCode("");
        fetch2FAStatus();
        toast.success("Nowe kody zapasowe zostaly wygenerowane");
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas generowania kodow");
      }
    } catch (error) {
      console.error("Error regenerating codes:", error);
      toast.error("Blad podczas generowania kodow");
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Nie udalo sie skopiowac");
    }
  };

  const copyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      toast.success("Skopiowano wszystkie kody");
    } catch {
      toast.error("Nie udalo sie skopiowac");
    }
  };

  const handleSaveCompanySettings = async () => {
    if (!companySettings) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "company",
          data: companySettings,
        }),
      });

      if (response.ok) {
        toast.success("Ustawienia firmy zostaly zapisane");
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas zapisywania");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Blad podczas zapisywania ustawien");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInvoiceSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invoice",
          data: invoiceSettings,
        }),
      });

      if (response.ok) {
        toast.success("Ustawienia faktur zostaly zapisane");
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas zapisywania");
      }
    } catch (error) {
      console.error("Error saving invoice settings:", error);
      toast.error("Blad podczas zapisywania ustawien faktur");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationSettings),
      });

      if (response.ok) {
        toast.success("Ustawienia powiadomien zostaly zapisane");
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas zapisywania");
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Blad podczas zapisywania ustawien powiadomien");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckNotifications = async () => {
    setIsCheckingNotifications(true);
    try {
      const response = await fetch("/api/notifications/check");
      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Sprawdzono powiadomienia: ${result.documentsChecked} dokumentow, ${result.invoicesChecked} faktur`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas sprawdzania");
      }
    } catch (error) {
      console.error("Error checking notifications:", error);
      toast.error("Blad podczas sprawdzania powiadomien");
    } finally {
      setIsCheckingNotifications(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error("Email i haslo sa wymagane");
      return;
    }

    setIsAddingUser(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        toast.success("Uzytkownik zostal dodany");
        setAddUserDialogOpen(false);
        setNewUser({ email: "", name: "", password: "", role: "VIEWER" });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas dodawania uzytkownika");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Blad podczas dodawania uzytkownika");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleSaveKsefSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ksef",
          data: ksefSettings,
        }),
      });

      if (response.ok) {
        toast.success("Ustawienia KSeF zostaly zapisane");
      } else {
        const error = await response.json();
        toast.error(error.error || "Blad podczas zapisywania");
      }
    } catch (error) {
      console.error("Error saving KSeF settings:", error);
      toast.error("Blad podczas zapisywania ustawien KSeF");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestKsefConnection = async () => {
    setIsTestingKsef(true);
    setKsefTestStatus("idle");
    try {
      // Simulate connection test - in real implementation this would call KSeF API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock success for now
      setKsefTestStatus("success");
      toast.success("Polaczenie z KSeF dziala poprawnie (tryb testowy)");
    } catch (error) {
      console.error("Error testing KSeF connection:", error);
      setKsefTestStatus("error");
      toast.error("Blad polaczenia z KSeF");
    } finally {
      setIsTestingKsef(false);
    }
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Ustawienia
        </h1>
        <p className="text-muted-foreground">
          Zarzadzanie ustawieniami firmy i systemu
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Firma
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Uzytkownicy
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Faktury
          </TabsTrigger>
          <TabsTrigger value="ksef" className="gap-2">
            <FileCheck className="h-4 w-4" />
            KSeF
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Powiadomienia
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Bezpieczenstwo
          </TabsTrigger>
        </TabsList>

        {/* Company Settings Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Dane firmy</CardTitle>
              <CardDescription>
                Podstawowe informacje o firmie wyswietlane na fakturach i dokumentach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {companySettings && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nazwa firmy</Label>
                      <Input
                        id="name"
                        value={companySettings.name}
                        onChange={(e) =>
                          setCompanySettings({ ...companySettings, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nip">NIP</Label>
                      <Input
                        id="nip"
                        value={companySettings.nip || ""}
                        onChange={(e) =>
                          setCompanySettings({ ...companySettings, nip: e.target.value })
                        }
                        placeholder="0000000000"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="address">Adres</Label>
                      <Input
                        id="address"
                        value={companySettings.address || ""}
                        onChange={(e) =>
                          setCompanySettings({ ...companySettings, address: e.target.value })
                        }
                        placeholder="ul. Przykladowa 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Miasto</Label>
                      <Input
                        id="city"
                        value={companySettings.city || ""}
                        onChange={(e) =>
                          setCompanySettings({ ...companySettings, city: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Kod pocztowy</Label>
                      <Input
                        id="postalCode"
                        value={companySettings.postalCode || ""}
                        onChange={(e) =>
                          setCompanySettings({ ...companySettings, postalCode: e.target.value })
                        }
                        placeholder="00-000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={companySettings.phone || ""}
                        onChange={(e) =>
                          setCompanySettings({ ...companySettings, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={companySettings.email || ""}
                        onChange={(e) =>
                          setCompanySettings({ ...companySettings, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Logo firmy</Label>
                    <div className="flex items-center gap-4">
                      {companySettings.logo ? (
                        <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                          <img
                            src={companySettings.logo}
                            alt="Logo"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Button variant="outline" disabled>
                        <Upload className="mr-2 h-4 w-4" />
                        Zmien logo
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveCompanySettings} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Zapisz zmiany
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Uzytkownicy</CardTitle>
                <CardDescription>
                  Zarzadzanie uzytkownikami systemu i ich uprawnieniami
                </CardDescription>
              </div>
              <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj uzytkownika
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dodaj nowego uzytkownika</DialogTitle>
                    <DialogDescription>
                      Wprowadz dane nowego uzytkownika systemu
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser({ ...newUser, email: e.target.value })
                        }
                        placeholder="email@firma.pl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-name">Imie i nazwisko</Label>
                      <Input
                        id="new-name"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, name: e.target.value })
                        }
                        placeholder="Jan Kowalski"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Haslo</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        placeholder="Minimum 8 znakow"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-role">Rola</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) =>
                          setNewUser({ ...newUser, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="DISPATCHER">Dyspozytor</SelectItem>
                          <SelectItem value="ACCOUNTANT">Ksiegowy</SelectItem>
                          <SelectItem value="DRIVER">Kierowca</SelectItem>
                          <SelectItem value="VIEWER">Podglad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setAddUserDialogOpen(false)}
                    >
                      Anuluj
                    </Button>
                    <Button onClick={handleAddUser} disabled={isAddingUser}>
                      {isAddingUser ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Dodaj
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uzytkownik</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rola</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ostatnie logowanie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || "-"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={
                            user.isActive
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-500 text-white"
                          }
                        >
                          {user.isActive ? "Aktywny" : "Nieaktywny"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString("pl-PL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Nigdy"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Brak uzytkownikow
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia faktur</CardTitle>
              <CardDescription>
                Domyslne wartosci dla wystawianych faktur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="paymentDays">Termin platnosci (dni)</Label>
                  <Input
                    id="paymentDays"
                    type="number"
                    min="1"
                    max="180"
                    value={invoiceSettings.paymentDays}
                    onChange={(e) =>
                      setInvoiceSettings({
                        ...invoiceSettings,
                        paymentDays: parseInt(e.target.value) || 14,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultVatRate">Domyslna stawka VAT (%)</Label>
                  <Select
                    value={invoiceSettings.defaultVatRate.toString()}
                    onValueChange={(value) =>
                      setInvoiceSettings({
                        ...invoiceSettings,
                        defaultVatRate: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="23">23%</SelectItem>
                      <SelectItem value="8">8%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccount">Numer konta bankowego</Label>
                <Input
                  id="bankAccount"
                  value={invoiceSettings.bankAccount}
                  onChange={(e) =>
                    setInvoiceSettings({
                      ...invoiceSettings,
                      bankAccount: e.target.value,
                    })
                  }
                  placeholder="PL 00 0000 0000 0000 0000 0000 0000"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveInvoiceSettings} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Zapisz zmiany
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KSeF Settings Tab */}
        <TabsContent value="ksef" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                KSeF - Krajowy System e-Faktur
              </CardTitle>
              <CardDescription>
                Konfiguracja integracji z Krajowym Systemem e-Faktur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* KSeF Enable Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Wlacz integracje KSeF</Label>
                  <p className="text-sm text-muted-foreground">
                    Aktywuj mozliwosc wysylania faktur do KSeF
                  </p>
                </div>
                <Switch
                  checked={ksefSettings.ksefEnabled}
                  onCheckedChange={(checked) =>
                    setKsefSettings({
                      ...ksefSettings,
                      ksefEnabled: checked,
                    })
                  }
                />
              </div>

              {ksefSettings.ksefEnabled && (
                <>
                  {/* Environment Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="ksefEnvironment">Srodowisko</Label>
                    <Select
                      value={ksefSettings.ksefEnvironment}
                      onValueChange={(value: "test" | "production") =>
                        setKsefSettings({
                          ...ksefSettings,
                          ksefEnvironment: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">
                          Testowe (ksef-test.mf.gov.pl)
                        </SelectItem>
                        <SelectItem value="production">
                          Produkcyjne (ksef.mf.gov.pl)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Zalecamy najpierw przetestowac integracje w srodowisku testowym
                    </p>
                  </div>

                  {/* NIP for KSeF */}
                  <div className="space-y-2">
                    <Label htmlFor="ksefNip">NIP dla KSeF</Label>
                    <Input
                      id="ksefNip"
                      value={ksefSettings.ksefNip}
                      onChange={(e) =>
                        setKsefSettings({
                          ...ksefSettings,
                          ksefNip: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      placeholder="0000000000"
                      maxLength={10}
                      className="w-[250px] font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      NIP firmy uzywany do autoryzacji w KSeF (zostaw puste aby uzyc NIP firmy)
                    </p>
                  </div>

                  {/* Connection Status */}
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Status polaczenia</Label>
                        <p className="text-sm text-muted-foreground">
                          Sprawdz czy polaczenie z KSeF dziala poprawnie
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ksefTestStatus === "success" && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Polaczono
                          </Badge>
                        )}
                        {ksefTestStatus === "error" && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Blad
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          onClick={handleTestKsefConnection}
                          disabled={isTestingKsef}
                        >
                          {isTestingKsef ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Testuj polaczenie
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Info about certificates */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Informacja o autoryzacji
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Obecnie integracja dziala w trybie testowym (mock). Pelna integracja z KSeF wymaga:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Kwalifikowanego podpisu elektronicznego lub pieczeci elektronicznej</li>
                      <li>Tokena autoryzacyjnego wygenerowanego w Aplikacji Podatnika KSeF</li>
                      <li>Rejestracji firmy w systemie KSeF</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Wiecej informacji na stronie{" "}
                      <a
                        href="https://ksef.mf.gov.pl/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        ksef.mf.gov.pl
                      </a>
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveKsefSettings} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Zapisz zmiany
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ustawienia powiadomien</CardTitle>
                <CardDescription>
                  Konfiguracja powiadomien email i alertow systemowych
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleCheckNotifications}
                disabled={isCheckingNotifications}
              >
                {isCheckingNotifications ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sprawdz teraz
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Enable Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Powiadomienia email</Label>
                  <p className="text-sm text-muted-foreground">
                    Wlacz lub wylacz wszystkie powiadomienia email
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailEnabled: checked,
                    })
                  }
                />
              </div>

              {/* Email Notification Types */}
              {notificationSettings.emailEnabled && (
                <div className="space-y-4">
                  <h4 className="font-medium">Typy powiadomien</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Przeglady techniczne</Label>
                        <p className="text-sm text-muted-foreground">
                          Powiadomienia o wygasajacych przegladach pojazdow
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailInspectionExpiry}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailInspectionExpiry: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Ubezpieczenia</Label>
                        <p className="text-sm text-muted-foreground">
                          Powiadomienia o wygasajacych polisach OC/AC
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailInsuranceExpiry}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailInsuranceExpiry: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Dokumenty kierowcow</Label>
                        <p className="text-sm text-muted-foreground">
                          Prawo jazdy, ADR, badania lekarskie
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailLicenseExpiry}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailLicenseExpiry: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Nowe zlecenia</Label>
                        <p className="text-sm text-muted-foreground">
                          Powiadomienia o nowych zleceniach transportowych
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailNewOrder}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailNewOrder: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Zmiany statusu zlecen</Label>
                        <p className="text-sm text-muted-foreground">
                          Powiadomienia o zmianach statusu realizacji
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailOrderStatus}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailOrderStatus: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Przeterminowane faktury</Label>
                        <p className="text-sm text-muted-foreground">
                          Alerty o nieoplaconych fakturach po terminie
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailInvoiceOverdue}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailInvoiceOverdue: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reminder Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Ustawienia przypominen</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reminderDays">Pierwsze przypomnienie (dni przed)</Label>
                    <Input
                      id="reminderDays"
                      type="number"
                      min="1"
                      max="90"
                      value={notificationSettings.reminderDays}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          reminderDays: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminderSecondDays">Drugie przypomnienie (dni przed)</Label>
                    <Input
                      id="reminderSecondDays"
                      type="number"
                      min="1"
                      max="30"
                      value={notificationSettings.reminderSecondDays}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          reminderSecondDays: parseInt(e.target.value) || 7,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Daily Digest */}
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dzienny raport</Label>
                    <p className="text-sm text-muted-foreground">
                      Otrzymuj codzienny email z podsumowaniem alertow
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.dailyDigestEnabled}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        dailyDigestEnabled: checked,
                      })
                    }
                  />
                </div>

                {notificationSettings.dailyDigestEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="dailyDigestTime">Godzina wysylki</Label>
                    <Input
                      id="dailyDigestTime"
                      type="time"
                      value={notificationSettings.dailyDigestTime}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          dailyDigestTime: e.target.value,
                        })
                      }
                      className="w-32"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotificationSettings} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Zapisz zmiany
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Weryfikacja dwuetapowa (2FA)
              </CardTitle>
              <CardDescription>
                Zabezpiecz swoje konto dodatkowym kodem weryfikacyjnym
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 2FA Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    twoFactorStatus.enabled ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                  }`}>
                    <Smartphone className={`h-6 w-6 ${
                      twoFactorStatus.enabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base">Weryfikacja dwuetapowa</Label>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorStatus.enabled
                        ? "Twoje konto jest chronione 2FA"
                        : "Wlacz 2FA aby zabezpieczyc swoje konto"}
                    </p>
                    {twoFactorStatus.enabled && (
                      <p className="text-xs text-muted-foreground">
                        Pozostalo kodow zapasowych: {twoFactorStatus.recoveryCodesCount}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={twoFactorStatus.enabled ? "default" : "secondary"}
                    className={twoFactorStatus.enabled ? "bg-green-500" : ""}
                  >
                    {twoFactorStatus.enabled ? "Wlaczone" : "Wylaczone"}
                  </Badge>
                </div>
              </div>

              {/* Enable/Disable 2FA Button */}
              <div className="flex gap-2">
                {!twoFactorStatus.enabled ? (
                  <Button onClick={handleSetup2FA} disabled={isSettingUp2FA}>
                    {isSettingUp2FA ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-4 w-4" />
                    )}
                    Wlacz 2FA
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRegenerateCodesDialogOpen(true)}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Nowe kody zapasowe
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDisable2FADialogOpen(true)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Wylacz 2FA
                    </Button>
                  </>
                )}
              </div>

              {/* Info Box */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  Jak dziala weryfikacja dwuetapowa?
                </h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Po wpisaniu hasla zostaniesz poproszony o kod z aplikacji</li>
                  <li>Uzyj aplikacji jak Google Authenticator, Authy lub 1Password</li>
                  <li>Kody zapasowe pozwalaja na logowanie gdy nie masz dostepu do telefonu</li>
                  <li>Kody zapasowe sa jednorazowe - kazdy moze byc uzyty tylko raz</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Setup 2FA Dialog */}
          <Dialog open={setup2FADialogOpen} onOpenChange={setSetup2FADialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Konfiguracja 2FA</DialogTitle>
                <DialogDescription>
                  Zeskanuj kod QR aplikacja uwierzytelniajaca
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="rounded-lg border p-2 bg-white"
                      width={200}
                      height={200}
                    />
                  )}
                </div>

                {/* Manual entry */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Lub wprowadz recznie:
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                      {twoFactorSecret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(twoFactorSecret)}
                    >
                      {copiedCode === twoFactorSecret ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Verification code input */}
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Kod weryfikacyjny</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center font-mono text-lg tracking-wider"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wprowadz 6-cyfrowy kod z aplikacji
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSetup2FADialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleEnable2FA} disabled={isEnabling2FA || verificationCode.length !== 6}>
                  {isEnabling2FA ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Wlacz 2FA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Disable 2FA Dialog */}
          <Dialog open={disable2FADialogOpen} onOpenChange={setDisable2FADialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Wylacz 2FA</DialogTitle>
                <DialogDescription>
                  Wprowadz kod z aplikacji lub kod zapasowy aby wylczyc 2FA
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="disable-code">Kod weryfikacyjny</Label>
                  <Input
                    id="disable-code"
                    type="text"
                    placeholder="000000 lub XXXX-XXXX"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    className="text-center font-mono text-lg tracking-wider"
                  />
                </div>
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="inline h-4 w-4 mr-2" />
                  Wylaczenie 2FA zmniejszy bezpieczenstwo Twojego konta
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDisable2FADialogOpen(false)}>
                  Anuluj
                </Button>
                <Button variant="destructive" onClick={handleDisable2FA} disabled={isDisabling2FA || !disableCode}>
                  {isDisabling2FA ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Wylacz 2FA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Regenerate Recovery Codes Dialog */}
          <Dialog open={regenerateCodesDialogOpen} onOpenChange={setRegenerateCodesDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generuj nowe kody zapasowe</DialogTitle>
                <DialogDescription>
                  Wprowadz kod z aplikacji aby wygenerowac nowe kody zapasowe. Stare kody przestana dzialac.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="regenerate-code">Kod weryfikacyjny</Label>
                  <Input
                    id="regenerate-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={regenerateCode}
                    onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center font-mono text-lg tracking-wider"
                    maxLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRegenerateCodesDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleRegenerateCodes} disabled={isRegeneratingCodes || regenerateCode.length !== 6}>
                  {isRegeneratingCodes ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  Generuj kody
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Recovery Codes Dialog */}
          <Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Kody zapasowe</DialogTitle>
                <DialogDescription>
                  Zapisz te kody w bezpiecznym miejscu. Kazdy kod mozna uzyc tylko raz.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded border bg-muted px-3 py-2"
                    >
                      <code className="font-mono text-sm">{code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(code)}
                      >
                        {copiedCode === code ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={copyAllCodes}>
                  <Copy className="mr-2 h-4 w-4" />
                  Kopiuj wszystkie kody
                </Button>
                <div className="rounded-lg bg-amber-100 dark:bg-amber-900 p-3 text-sm text-amber-800 dark:text-amber-200">
                  <AlertCircle className="inline h-4 w-4 mr-2" />
                  Te kody nie beda pokazane ponownie. Upewnij sie ze je zapisales!
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowRecoveryCodes(false)}>
                  Zapisalem kody
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
