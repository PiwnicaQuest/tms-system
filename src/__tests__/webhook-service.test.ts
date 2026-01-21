import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  signPayload,
  verifySignature,
  generateWebhookSecret,
  deliverWebhook,
  triggerWebhook,
  retryWebhookDelivery,
  sendTestWebhook,
  WEBHOOK_EVENTS,
} from "@/lib/webhooks/webhook-service";
import { prisma } from "@/lib/db/prisma";

// Restore crypto mock for these tests
vi.unmock("crypto");

describe("Webhook Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("WEBHOOK_EVENTS", () => {
    it("should have all expected event types", () => {
      const eventValues = WEBHOOK_EVENTS.map((e) => e.value);

      expect(eventValues).toContain("order.created");
      expect(eventValues).toContain("order.updated");
      expect(eventValues).toContain("order.status_changed");
      expect(eventValues).toContain("invoice.created");
      expect(eventValues).toContain("invoice.paid");
      expect(eventValues).toContain("vehicle.updated");
      expect(eventValues).toContain("driver.updated");
    });

    it("should have Polish labels for all events", () => {
      WEBHOOK_EVENTS.forEach((event) => {
        expect(event.label).toBeDefined();
        expect(event.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe("signPayload", () => {
    it("should generate HMAC-SHA256 signature", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";

      const signature = signPayload(payload, secret);

      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex = 64 chars
    });

    it("should generate consistent signatures for same input", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";

      const sig1 = signPayload(payload, secret);
      const sig2 = signPayload(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it("should generate different signatures for different secrets", () => {
      const payload = JSON.stringify({ test: "data" });

      const sig1 = signPayload(payload, "secret1");
      const sig2 = signPayload(payload, "secret2");

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("verifySignature", () => {
    it("should verify valid signature", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";
      const signature = signPayload(payload, secret);

      const isValid = verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";
      const wrongSignature = "0".repeat(64);

      const isValid = verifySignature(payload, wrongSignature, secret);

      expect(isValid).toBe(false);
    });

    it("should reject tampered payload", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";
      const signature = signPayload(payload, secret);
      const tamperedPayload = JSON.stringify({ test: "tampered" });

      const isValid = verifySignature(tamperedPayload, signature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe("generateWebhookSecret", () => {
    it("should generate 64-character hex string", () => {
      const secret = generateWebhookSecret();

      expect(secret).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate unique secrets", () => {
      const secrets = new Set();
      for (let i = 0; i < 100; i++) {
        secrets.add(generateWebhookSecret());
      }

      expect(secrets.size).toBe(100);
    });
  });

  describe("deliverWebhook", () => {
    const mockWebhook = {
      id: "webhook-123",
      url: "https://example.com/webhook",
      secret: "test-secret",
      headers: { "X-Custom": "value" },
    };

    it("should successfully deliver webhook", async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ received: true }) };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const result = await deliverWebhook(mockWebhook, "order.created", { orderId: "123" });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Signature": expect.any(String),
            "X-Webhook-Event": "order.created",
            "X-Custom": "value",
          }),
        })
      );
    });

    it("should retry on server error (5xx)", async () => {
      const mockResponse = { ok: false, status: 500, json: () => Promise.resolve({ error: "Server error" }) };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const resultPromise = deliverWebhook(mockWebhook, "order.created", { orderId: "123" });

      // Fast-forward through retries
      await vi.advanceTimersByTimeAsync(10000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // MAX_RETRIES
      expect(result.error).toBe("HTTP 500");
    });

    it("should not retry on client error (4xx except 429)", async () => {
      const mockResponse = { ok: false, status: 400, json: () => Promise.resolve({ error: "Bad request" }) };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const result = await deliverWebhook(mockWebhook, "order.created", { orderId: "123" });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // No retries
      expect(result.error).toBe("HTTP 400");
    });

    it("should retry on rate limit (429)", async () => {
      const mockResponse = { ok: false, status: 429, json: () => Promise.resolve({ error: "Rate limited" }) };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const resultPromise = deliverWebhook(mockWebhook, "order.created", { orderId: "123" });

      await vi.advanceTimersByTimeAsync(10000);

      const result = await resultPromise;

      expect(result.attempts).toBe(3); // Should retry
    });

    it("should handle network errors", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const resultPromise = deliverWebhook(mockWebhook, "order.created", { orderId: "123" });

      await vi.advanceTimersByTimeAsync(10000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.attempts).toBe(3);
    });
  });

  describe("triggerWebhook", () => {
    it("should find and deliver to all matching webhooks", async () => {
      const mockWebhooks = [
        { id: "wh1", url: "https://example1.com", secret: "s1", headers: null },
        { id: "wh2", url: "https://example2.com", secret: "s2", headers: null },
      ];

      vi.mocked(prisma.webhook.findMany).mockResolvedValue(mockWebhooks as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue({ id: "del-1" } as never);
      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue({} as never);

      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      await triggerWebhook("tenant-123", "order.created", { orderId: "123" });

      expect(prisma.webhook.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: "tenant-123",
          isActive: true,
          events: { has: "order.created" },
        },
      });
    });

    it("should do nothing if no webhooks match", async () => {
      vi.mocked(prisma.webhook.findMany).mockResolvedValue([]);

      await triggerWebhook("tenant-123", "order.created", { orderId: "123" });

      expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("retryWebhookDelivery", () => {
    it("should retry failed delivery", async () => {
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue({
        id: "del-1",
        success: false,
        event: "order.created",
        payload: { orderId: "123" },
        attempts: 3,
        webhook: {
          id: "wh-1",
          url: "https://example.com",
          secret: "secret",
          headers: null,
          isActive: true,
        },
      } as never);
      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue({} as never);

      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const result = await retryWebhookDelivery("del-1");

      expect(result.success).toBe(true);
      expect(prisma.webhookDelivery.update).toHaveBeenCalled();
    });

    it("should fail if delivery not found", async () => {
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(null);

      const result = await retryWebhookDelivery("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delivery not found");
    });

    it("should fail if delivery was already successful", async () => {
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue({
        success: true,
        webhook: { isActive: true },
      } as never);

      const result = await retryWebhookDelivery("del-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delivery was already successful");
    });

    it("should fail if webhook is inactive", async () => {
      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue({
        success: false,
        webhook: { isActive: false },
      } as never);

      const result = await retryWebhookDelivery("del-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook is not active");
    });
  });

  describe("sendTestWebhook", () => {
    it("should send test webhook", async () => {
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue({
        id: "wh-1",
        name: "Test Webhook",
        url: "https://example.com",
        secret: "secret",
        headers: null,
      } as never);
      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue({ id: "del-1" } as never);
      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue({} as never);

      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const result = await sendTestWebhook("wh-1");

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it("should fail if webhook not found", async () => {
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(null);

      const result = await sendTestWebhook("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook not found");
    });
  });
});
