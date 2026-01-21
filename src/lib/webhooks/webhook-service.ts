import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

// Webhook event types
export type WebhookEvent =
  | "order.created"
  | "order.updated"
  | "order.status_changed"
  | "order.assignment_created"
  | "order.assignment_updated"
  | "order.assignment_deleted"
  | "invoice.created"
  | "invoice.paid"
  | "vehicle.updated"
  | "driver.updated";

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "order.created", label: "Zlecenie utworzone" },
  { value: "order.updated", label: "Zlecenie zaktualizowane" },
  { value: "order.status_changed", label: "Zmiana statusu zlecenia" },
  { value: "order.assignment_created", label: "Przypisanie utworzone" },
  { value: "order.assignment_updated", label: "Przypisanie zaktualizowane" },
  { value: "order.assignment_deleted", label: "Przypisanie usunięte" },
  { value: "invoice.created", label: "Faktura utworzona" },
  { value: "invoice.paid", label: "Faktura oplacona" },
  { value: "vehicle.updated", label: "Pojazd zaktualizowany" },
  { value: "driver.updated", label: "Kierowca zaktualizowany" },
];

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000; // 1 second

/**
 * Sign payload with HMAC-SHA256
 */
export function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload, "utf8");
  return hmac.digest("hex");
}

/**
 * Verify incoming webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Generate a secure random secret for webhook
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deliver a single webhook with retry logic
 */
export async function deliverWebhook(
  webhook: {
    id: string;
    url: string;
    secret: string;
    headers?: Record<string, string> | null;
  },
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<{
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
  attempts: number;
}> {
  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, webhook.secret);
  const timestamp = Date.now();

  let attempts = 0;
  let lastError: string | undefined;
  let lastStatusCode: number | undefined;
  let lastResponse: unknown;

  // Retry loop with exponential backoff
  while (attempts < MAX_RETRIES) {
    attempts++;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp.toString(),
        "X-Webhook-Event": event,
        "X-Webhook-Id": webhook.id,
        ...(webhook.headers as Record<string, string> | undefined),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      lastStatusCode = response.status;

      try {
        lastResponse = await response.json();
      } catch {
        lastResponse = await response.text();
      }

      // Success if status is 2xx
      if (response.ok) {
        return {
          success: true,
          statusCode: lastStatusCode,
          response: lastResponse,
          attempts,
        };
      }

      // Don't retry on client errors (4xx) except 429 (rate limiting)
      if (lastStatusCode >= 400 && lastStatusCode < 500 && lastStatusCode !== 429) {
        return {
          success: false,
          statusCode: lastStatusCode,
          response: lastResponse,
          error: `HTTP ${lastStatusCode}`,
          attempts,
        };
      }

      lastError = `HTTP ${lastStatusCode}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = "Request timeout (30s)";
        } else {
          lastError = error.message;
        }
      } else {
        lastError = "Unknown error";
      }
    }

    // Exponential backoff before retry
    if (attempts < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempts - 1);
      await sleep(delay);
    }
  }

  return {
    success: false,
    statusCode: lastStatusCode,
    response: lastResponse,
    error: lastError,
    attempts,
  };
}

/**
 * Trigger webhooks for a specific event
 * This function finds all active webhooks for the tenant that are subscribed to the event
 * and delivers the payload to each of them.
 */
export async function triggerWebhook(
  tenantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    // Find all active webhooks for this tenant that listen to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // Deliver to all webhooks in parallel (fire and forget with logging)
    const deliveryPromises = webhooks.map(async (webhook) => {
      const deliveryPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      // Create delivery record first
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: JSON.parse(JSON.stringify(deliveryPayload)),
          attempts: 0,
        },
      });

      // Deliver webhook
      const result = await deliverWebhook(
        {
          id: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          headers: webhook.headers as Record<string, string> | null,
        },
        event,
        deliveryPayload
      );

      // Update delivery record with result
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          success: result.success,
          statusCode: result.statusCode,
          response: result.response ? JSON.parse(JSON.stringify(result.response)) : null,
          error: result.error,
          attempts: result.attempts,
          deliveredAt: result.success ? new Date() : null,
        },
      });

      return result;
    });

    // Execute all deliveries (don't await to avoid blocking)
    Promise.allSettled(deliveryPromises).catch((error) => {
      console.error("Error delivering webhooks:", error);
    });
  } catch (error) {
    console.error("Error triggering webhooks:", error);
  }
}

/**
 * Retry a failed webhook delivery
 */
export async function retryWebhookDelivery(deliveryId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      return { success: false, error: "Delivery not found" };
    }

    if (delivery.success) {
      return { success: false, error: "Delivery was already successful" };
    }

    if (!delivery.webhook.isActive) {
      return { success: false, error: "Webhook is not active" };
    }

    const result = await deliverWebhook(
      {
        id: delivery.webhook.id,
        url: delivery.webhook.url,
        secret: delivery.webhook.secret,
        headers: delivery.webhook.headers as Record<string, string> | null,
      },
      delivery.event as WebhookEvent,
      delivery.payload as Record<string, unknown>
    );

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        success: result.success,
        statusCode: result.statusCode,
        response: result.response ? JSON.parse(JSON.stringify(result.response)) : null,
        error: result.error,
        attempts: delivery.attempts + result.attempts,
        deliveredAt: result.success ? new Date() : null,
      },
    });

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error("Error retrying webhook delivery:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a test webhook
 */
export async function sendTestWebhook(webhookId: string): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
}> {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return { success: false, error: "Webhook not found" };
    }

    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "To jest testowy webhook z Bakus TMS",
        webhookId: webhook.id,
        webhookName: webhook.name,
      },
    };

    // Create test delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: "test",
        payload: JSON.parse(JSON.stringify(testPayload)),
        attempts: 0,
      },
    });

    const result = await deliverWebhook(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        headers: webhook.headers as Record<string, string> | null,
      },
      "test" as WebhookEvent,
      testPayload
    );

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        success: result.success,
        statusCode: result.statusCode,
        response: result.response ? JSON.parse(JSON.stringify(result.response)) : null,
        error: result.error,
        attempts: result.attempts,
        deliveredAt: result.success ? new Date() : null,
      },
    });

    return {
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
    };
  } catch (error) {
    console.error("Error sending test webhook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
