/**
 * KSeF (Krajowy System e-Faktur) Integration Service
 * Polish National e-Invoice System
 *
 * This service provides mock implementations for KSeF integration.
 * Real implementation requires:
 * - Qualified electronic signature (podpis kwalifikowany)
 * - KSeF API certificates
 * - Registration in KSeF system
 *
 * Documentation: https://ksef.mf.gov.pl/
 */

import { prisma } from "@/lib/db/prisma";

// KSeF Status enum
export enum KsefStatus {
  NOT_SENT = "NOT_SENT",
  PENDING = "PENDING",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  ERROR = "ERROR",
}

// Polish labels for KSeF statuses
export const KsefStatusLabels: Record<KsefStatus, string> = {
  [KsefStatus.NOT_SENT]: "Nie wysłano",
  [KsefStatus.PENDING]: "Oczekuje",
  [KsefStatus.SENT]: "Wysłano",
  [KsefStatus.ACCEPTED]: "Przyjęto",
  [KsefStatus.REJECTED]: "Odrzucono",
  [KsefStatus.ERROR]: "Błąd",
};

// KSeF Environment configuration
export type KsefEnvironment = "test" | "production";

export interface KsefConfig {
  environment: KsefEnvironment;
  nip: string;
  // TODO: Add certificate/token configuration when implementing real API
  // certificatePath?: string;
  // tokenId?: string;
}

// KSeF API endpoints
const KSEF_API_URLS: Record<KsefEnvironment, string> = {
  test: "https://ksef-test.mf.gov.pl/api",
  production: "https://ksef.mf.gov.pl/api",
};

// Response types
export interface KsefAuthResponse {
  success: boolean;
  sessionToken?: string;
  expiresAt?: Date;
  error?: string;
}

export interface KsefSendResponse {
  success: boolean;
  referenceNumber?: string; // Numer referencyjny sesji
  ksefNumber?: string; // Numer KSeF faktury
  error?: string;
  errorCode?: string;
}

export interface KsefStatusResponse {
  success: boolean;
  status: KsefStatus;
  ksefNumber?: string;
  processingDate?: Date;
  error?: string;
  errorDetails?: string;
}

export interface KsefUpoResponse {
  success: boolean;
  upoContent?: string; // Base64 encoded PDF
  upoXml?: string; // XML content of UPO
  error?: string;
}

// Invoice data required for KSeF
export interface KsefInvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: Date;
  saleDate?: Date | null;
  dueDate: Date;
  seller: {
    nip: string;
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country: string;
  };
  buyer: {
    nip?: string | null;
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPriceNet: number;
    vatRate: number;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  }>;
  totals: {
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  };
  currency: string;
  paymentMethod: string;
  bankAccount?: string | null;
  notes?: string | null;
}

/**
 * KSeF Service Class
 * Handles all interactions with the KSeF system
 */
export class KsefService {
  private config: KsefConfig;
  private sessionToken: string | null = null;
  private sessionExpiry: Date | null = null;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  /**
   * Get the API URL for current environment
   */
  private getApiUrl(): string {
    return KSEF_API_URLS[this.config.environment];
  }

  /**
   * Check if current session is valid
   */
  private isSessionValid(): boolean {
    if (!this.sessionToken || !this.sessionExpiry) {
      return false;
    }
    return new Date() < this.sessionExpiry;
  }

  /**
   * Authenticate with KSeF
   * TODO: Implement real authentication with certificates
   */
  async authenticate(): Promise<KsefAuthResponse> {
    console.log(`[KSeF] Authenticating with ${this.config.environment} environment`);
    console.log(`[KSeF] NIP: ${this.config.nip}`);
    console.log(`[KSeF] API URL: ${this.getApiUrl()}`);

    // TODO: Real implementation would:
    // 1. Load certificate/token
    // 2. Call /api/online/Session/AuthorisationChallenge
    // 3. Sign the challenge with certificate
    // 4. Call /api/online/Session/InitToken
    // 5. Store session token

    // Mock implementation - simulate successful authentication
    await this.simulateDelay(500);

    this.sessionToken = `mock_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.sessionExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    return {
      success: true,
      sessionToken: this.sessionToken,
      expiresAt: this.sessionExpiry,
    };
  }

  /**
   * Send invoice to KSeF
   * TODO: Implement real invoice sending
   */
  async sendInvoice(invoiceData: KsefInvoiceData): Promise<KsefSendResponse> {
    console.log(`[KSeF] Sending invoice ${invoiceData.invoiceNumber} to KSeF`);

    // Validate NIP
    if (!invoiceData.seller.nip) {
      return {
        success: false,
        error: "Brak NIP sprzedawcy - wymagany do wysłania do KSeF",
        errorCode: "SELLER_NIP_MISSING",
      };
    }

    // Ensure session is valid
    if (!this.isSessionValid()) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return {
          success: false,
          error: "Błąd autoryzacji KSeF",
          errorCode: "AUTH_FAILED",
        };
      }
    }

    // TODO: Real implementation would:
    // 1. Convert invoice data to FA(2) XML schema
    // 2. Validate XML against XSD
    // 3. Call /api/online/Invoice/Send
    // 4. Handle response and store reference number

    // Mock implementation
    await this.simulateDelay(1000);

    // Generate mock KSeF number
    // Real format: {year}{month}{day}-{random}-{sequence}
    const now = new Date();
    const mockKsefNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;

    // Simulate occasional failures for testing (10% chance)
    if (this.config.environment === "test" && Math.random() < 0.1) {
      return {
        success: false,
        error: "Symulowany błąd KSeF - faktura odrzucona",
        errorCode: "MOCK_REJECTION",
      };
    }

    return {
      success: true,
      referenceNumber: `REF-${Date.now()}`,
      ksefNumber: mockKsefNumber,
    };
  }

  /**
   * Check invoice status in KSeF
   * TODO: Implement real status check
   */
  async checkStatus(referenceNumber: string): Promise<KsefStatusResponse> {
    console.log(`[KSeF] Checking status for reference: ${referenceNumber}`);

    // Ensure session is valid
    if (!this.isSessionValid()) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return {
          success: false,
          status: KsefStatus.ERROR,
          error: "Błąd autoryzacji KSeF",
        };
      }
    }

    // TODO: Real implementation would:
    // 1. Call /api/online/Invoice/Status/{referenceNumber}
    // 2. Parse response and return status

    // Mock implementation
    await this.simulateDelay(500);

    // In real scenario, status would progress: PENDING -> SENT -> ACCEPTED
    return {
      success: true,
      status: KsefStatus.ACCEPTED,
      processingDate: new Date(),
    };
  }

  /**
   * Download UPO (Urzędowe Poświadczenie Odbioru)
   * TODO: Implement real UPO download
   */
  async downloadUpo(ksefNumber: string): Promise<KsefUpoResponse> {
    console.log(`[KSeF] Downloading UPO for KSeF number: ${ksefNumber}`);

    if (!ksefNumber) {
      return {
        success: false,
        error: "Brak numeru KSeF - faktura nie została jeszcze przyjęta",
      };
    }

    // Ensure session is valid
    if (!this.isSessionValid()) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return {
          success: false,
          error: "Błąd autoryzacji KSeF",
        };
      }
    }

    // TODO: Real implementation would:
    // 1. Call /api/online/Invoice/UPO/{ksefNumber}
    // 2. Download and return UPO document

    // Mock implementation - generate a simple UPO XML
    await this.simulateDelay(500);

    const mockUpoXml = this.generateMockUpoXml(ksefNumber);
    const mockUpoPdf = this.generateMockUpoPdf(ksefNumber);

    return {
      success: true,
      upoContent: mockUpoPdf,
      upoXml: mockUpoXml,
    };
  }

  /**
   * Generate mock UPO XML
   */
  private generateMockUpoXml(ksefNumber: string): string {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<UPO xmlns="http://ksef.mf.gov.pl/schema/UPO">
  <NumerKSeF>${ksefNumber}</NumerKSeF>
  <DataPrzyjecia>${now}</DataPrzyjecia>
  <NIPSprzedawcy>${this.config.nip}</NIPSprzedawcy>
  <Status>PRZYJETO</Status>
  <Uwagi>
    Dokument wygenerowany w trybie testowym.
    W środowisku produkcyjnym UPO zostanie pobrane z systemu KSeF.
  </Uwagi>
</UPO>`;
  }

  /**
   * Generate mock UPO PDF (as base64)
   * In real implementation, this would be actual PDF from KSeF
   */
  private generateMockUpoPdf(ksefNumber: string): string {
    // This is a placeholder - real UPO would be a proper PDF
    // For now, return a simple text representation
    const content = `
URZĘDOWE POŚWIADCZENIE ODBIORU (UPO)
=====================================

Numer KSeF: ${ksefNumber}
Data przyjęcia: ${new Date().toLocaleString("pl-PL")}
NIP Sprzedawcy: ${this.config.nip}
Status: PRZYJĘTO

---
UWAGA: Dokument wygenerowany w trybie testowym.
W środowisku produkcyjnym UPO zostanie pobrane z systemu KSeF.
---
    `;
    // Convert to base64
    return Buffer.from(content, "utf-8").toString("base64");
  }

  /**
   * Simulate network delay for mock implementation
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance management
let ksefServiceInstance: KsefService | null = null;

/**
 * Get or create KSeF service instance
 */
export async function getKsefService(tenantId: string): Promise<KsefService | null> {
  // Fetch tenant settings from database
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      nip: true,
      invoiceSettings: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!tenant?.nip) {
    console.warn("[KSeF] Tenant NIP not configured");
    return null;
  }

  // TODO: Fetch KSeF settings from database when model is created
  // For now, use default test environment
  const ksefConfig: KsefConfig = {
    environment: "test",
    nip: tenant.nip,
  };

  // Create new instance (in production, might want to cache this)
  ksefServiceInstance = new KsefService(ksefConfig);
  return ksefServiceInstance;
}

/**
 * Send invoice to KSeF and update database
 */
export async function sendInvoiceToKsef(
  invoiceId: string,
  tenantId: string
): Promise<KsefSendResponse> {
  // Get KSeF service
  const ksefService = await getKsefService(tenantId);
  if (!ksefService) {
    return {
      success: false,
      error: "KSeF nie jest skonfigurowany - brak NIP firmy",
      errorCode: "KSEF_NOT_CONFIGURED",
    };
  }

  // Fetch invoice with all required data
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tenantId,
    },
    include: {
      tenant: {
        select: {
          nip: true,
          name: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
        },
      },
      contractor: {
        select: {
          nip: true,
          name: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
        },
      },
      items: true,
    },
  });

  if (!invoice) {
    return {
      success: false,
      error: "Faktura nie została znaleziona",
      errorCode: "INVOICE_NOT_FOUND",
    };
  }

  // Check if already sent
  if (invoice.ksefNumber) {
    return {
      success: false,
      error: "Faktura została już wysłana do KSeF",
      errorCode: "ALREADY_SENT",
    };
  }

  // Prepare invoice data for KSeF
  const invoiceData: KsefInvoiceData = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    dueDate: invoice.dueDate,
    seller: {
      nip: invoice.tenant.nip || "",
      name: invoice.tenant.name,
      address: invoice.tenant.address,
      city: invoice.tenant.city,
      postalCode: invoice.tenant.postalCode,
      country: invoice.tenant.country,
    },
    buyer: {
      nip: invoice.contractor?.nip,
      name: invoice.contractor?.name || "Brak danych",
      address: invoice.contractor?.address,
      city: invoice.contractor?.city,
      postalCode: invoice.contractor?.postalCode,
      country: invoice.contractor?.country || "PL",
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPriceNet: item.unitPriceNet,
      vatRate: item.vatRate,
      netAmount: item.netAmount,
      vatAmount: item.vatAmount,
      grossAmount: item.grossAmount,
    })),
    totals: {
      netAmount: invoice.netAmount,
      vatAmount: invoice.vatAmount,
      grossAmount: invoice.grossAmount,
    },
    currency: invoice.currency,
    paymentMethod: invoice.paymentMethod,
    bankAccount: invoice.bankAccount,
    notes: invoice.notes,
  };

  // Update status to pending before sending
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ksefStatus: KsefStatus.PENDING,
    },
  });

  // Send to KSeF
  const result = await ksefService.sendInvoice(invoiceData);

  // Update database with result
  if (result.success && result.ksefNumber) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ksefNumber: result.ksefNumber,
        ksefStatus: KsefStatus.ACCEPTED,
        ksefSentAt: new Date(),
      },
    });
  } else {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ksefStatus: KsefStatus.ERROR,
      },
    });
  }

  return result;
}

/**
 * Check KSeF status for an invoice
 */
export async function checkInvoiceKsefStatus(
  invoiceId: string,
  tenantId: string
): Promise<KsefStatusResponse> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tenantId,
    },
    select: {
      ksefNumber: true,
      ksefStatus: true,
      ksefSentAt: true,
    },
  });

  if (!invoice) {
    return {
      success: false,
      status: KsefStatus.ERROR,
      error: "Faktura nie została znaleziona",
    };
  }

  // Return current status from database
  // In real implementation, might also query KSeF API for live status
  return {
    success: true,
    status: (invoice.ksefStatus as KsefStatus) || KsefStatus.NOT_SENT,
    ksefNumber: invoice.ksefNumber || undefined,
    processingDate: invoice.ksefSentAt || undefined,
  };
}

/**
 * Download UPO for an invoice
 */
export async function downloadInvoiceUpo(
  invoiceId: string,
  tenantId: string
): Promise<KsefUpoResponse> {
  // Get KSeF service
  const ksefService = await getKsefService(tenantId);
  if (!ksefService) {
    return {
      success: false,
      error: "KSeF nie jest skonfigurowany",
    };
  }

  // Fetch invoice
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tenantId,
    },
    select: {
      ksefNumber: true,
      ksefStatus: true,
    },
  });

  if (!invoice) {
    return {
      success: false,
      error: "Faktura nie została znaleziona",
    };
  }

  if (!invoice.ksefNumber) {
    return {
      success: false,
      error: "Faktura nie została jeszcze wysłana do KSeF",
    };
  }

  if (invoice.ksefStatus !== KsefStatus.ACCEPTED) {
    return {
      success: false,
      error: "UPO jest dostępne tylko dla faktur przyjętych przez KSeF",
    };
  }

  // Download UPO
  return ksefService.downloadUpo(invoice.ksefNumber);
}
