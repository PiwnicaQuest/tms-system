import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logAudit,
  getEntityChanges,
  getAuditLogs,
  actionLabels,
  entityTypeLabels,
  getIpAddress,
  getUserAgent,
} from "@/lib/audit/audit-service";
import { prisma } from "@/lib/db/prisma";

// Mock NextRequest
const createMockRequest = (headers: Record<string, string> = {}) => {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  } as unknown;
};

describe("Audit Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("actionLabels", () => {
    it("should have all expected action types", () => {
      expect(actionLabels).toHaveProperty("CREATE");
      expect(actionLabels).toHaveProperty("UPDATE");
      expect(actionLabels).toHaveProperty("DELETE");
      expect(actionLabels).toHaveProperty("LOGIN");
      expect(actionLabels).toHaveProperty("LOGOUT");
      expect(actionLabels).toHaveProperty("EXPORT");
      expect(actionLabels).toHaveProperty("STATUS_CHANGE");
    });

    it("should have Polish labels for all actions", () => {
      expect(actionLabels.CREATE).toBe("Utworzenie");
      expect(actionLabels.UPDATE).toBe("Aktualizacja");
      expect(actionLabels.DELETE).toBe("Usuniecie");
      expect(actionLabels.LOGIN).toBe("Logowanie");
    });
  });

  describe("entityTypeLabels", () => {
    it("should have all expected entity types", () => {
      expect(entityTypeLabels).toHaveProperty("Order");
      expect(entityTypeLabels).toHaveProperty("Invoice");
      expect(entityTypeLabels).toHaveProperty("Vehicle");
      expect(entityTypeLabels).toHaveProperty("Driver");
      expect(entityTypeLabels).toHaveProperty("Contractor");
      expect(entityTypeLabels).toHaveProperty("User");
    });

    it("should have Polish labels for all entity types", () => {
      expect(entityTypeLabels.Order).toBe("Zlecenie");
      expect(entityTypeLabels.Invoice).toBe("Faktura");
      expect(entityTypeLabels.Vehicle).toBe("Pojazd");
      expect(entityTypeLabels.Driver).toBe("Kierowca");
    });
  });

  describe("getIpAddress", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = createMockRequest({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1",
      });

      const ip = getIpAddress(request as never);

      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = createMockRequest({
        "x-real-ip": "192.168.1.100",
      });

      const ip = getIpAddress(request as never);

      expect(ip).toBe("192.168.1.100");
    });

    it("should prefer x-forwarded-for over x-real-ip", () => {
      const request = createMockRequest({
        "x-forwarded-for": "192.168.1.1",
        "x-real-ip": "192.168.1.100",
      });

      const ip = getIpAddress(request as never);

      expect(ip).toBe("192.168.1.1");
    });

    it("should return null if no IP headers present", () => {
      const request = createMockRequest({});

      const ip = getIpAddress(request as never);

      expect(ip).toBeNull();
    });
  });

  describe("getUserAgent", () => {
    it("should extract user agent from headers", () => {
      const request = createMockRequest({
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      });

      const ua = getUserAgent(request as never);

      expect(ua).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    });

    it("should return null if no user agent present", () => {
      const request = createMockRequest({});

      const ua = getUserAgent(request as never);

      expect(ua).toBeNull();
    });
  });

  describe("getEntityChanges", () => {
    it("should detect added fields for new entity", () => {
      const oldData = null;
      const newData = { name: "Test", description: "New description" };

      const changes = getEntityChanges(oldData, newData);

      expect(changes).not.toBeNull();
      expect(changes?.name).toEqual({ old: null, new: "Test" });
      expect(changes?.description).toEqual({ old: null, new: "New description" });
    });

    it("should detect modified fields", () => {
      const oldData = { name: "Old Name", status: "PENDING" };
      const newData = { name: "New Name", status: "PENDING" };

      const changes = getEntityChanges(oldData, newData);

      expect(changes).not.toBeNull();
      expect(changes?.name).toEqual({ old: "Old Name", new: "New Name" });
      expect(changes?.status).toBeUndefined(); // No change
    });

    it("should detect removed fields (deletion)", () => {
      const oldData = { name: "Test", description: "Description" };
      const newData = null;

      const changes = getEntityChanges(oldData, newData);

      expect(changes).not.toBeNull();
      expect(changes?.name).toEqual({ old: "Test", new: null });
      expect(changes?.description).toEqual({ old: "Description", new: null });
    });

    it("should detect multiple changes", () => {
      const oldData = { name: "Old", status: "PENDING", price: 100 };
      const newData = { name: "New", status: "COMPLETED", price: 100 };

      const changes = getEntityChanges(oldData, newData);

      expect(changes).not.toBeNull();
      expect(changes?.name).toEqual({ old: "Old", new: "New" });
      expect(changes?.status).toEqual({ old: "PENDING", new: "COMPLETED" });
      expect(changes?.price).toBeUndefined(); // No change
    });

    it("should return null for identical objects", () => {
      const oldData = { name: "Test", status: "PENDING" };
      const newData = { name: "Test", status: "PENDING" };

      const changes = getEntityChanges(oldData, newData);

      expect(changes).toBeNull();
    });

    it("should return null for both null inputs", () => {
      const changes = getEntityChanges(null, null);

      expect(changes).toBeNull();
    });

    it("should ignore timestamp fields (updatedAt, createdAt)", () => {
      const oldData = { name: "Test", updatedAt: new Date("2024-01-01") };
      const newData = { name: "Test", updatedAt: new Date("2024-01-02") };

      const changes = getEntityChanges(oldData, newData);

      // updatedAt should be ignored, no other changes
      expect(changes).toBeNull();
    });

    it("should ignore sensitive fields (password, twoFactorSecret)", () => {
      const oldData = { name: "Test", password: "old-hash" };
      const newData = { name: "Test", password: "new-hash" };

      const changes = getEntityChanges(oldData, newData);

      // password should be ignored
      expect(changes).toBeNull();
    });
  });

  describe("logAudit", () => {
    it("should create audit log entry", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
        tenantId: "tenant-1",
        userId: "user-1",
        action: "CREATE",
        entityType: "Order",
        entityId: "order-1",
        changes: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
        createdAt: new Date(),
      });

      await logAudit({
        tenantId: "tenant-1",
        userId: "user-1",
        action: "CREATE",
        entityType: "Order",
        entityId: "order-1",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          userId: "user-1",
          action: "CREATE",
          entityType: "Order",
          entityId: "order-1",
        }),
      });
    });

    it("should include changes when provided", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const changes = { status: { old: "PENDING", new: "COMPLETED" } };

      await logAudit({
        tenantId: "tenant-1",
        userId: "user-1",
        action: "UPDATE",
        entityType: "Order",
        entityId: "order-1",
        changes,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changes,
        }),
      });
    });

    it("should include metadata when provided", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const metadata = { browser: "Chrome", os: "Windows" };

      await logAudit({
        tenantId: "tenant-1",
        userId: "user-1",
        action: "LOGIN",
        entityType: "User",
        entityId: "user-1",
        metadata,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata,
        }),
      });
    });

    it("should extract IP and user agent from request", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const request = createMockRequest({
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Test Browser",
      });

      await logAudit({
        tenantId: "tenant-1",
        userId: "user-1",
        action: "LOGIN",
        entityType: "User",
        entityId: "user-1",
        request: request as never,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: "192.168.1.1",
          userAgent: "Test Browser",
        }),
      });
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error("Database error"));

      // Should not throw
      await expect(
        logAudit({
          tenantId: "tenant-1",
          userId: "user-1",
          action: "CREATE",
          entityType: "Order",
          entityId: "order-1",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("getAuditLogs", () => {
    it("should return paginated audit logs", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATE",
          entityType: "Order",
          entityId: "order-1",
          createdAt: new Date(),
          user: { id: "user-1", name: "Test User", email: "test@example.com" },
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as never);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);

      const result = await getAuditLogs({
        tenantId: "tenant-1",
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should filter by action", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs({
        tenantId: "tenant-1",
        action: "CREATE",
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: "CREATE",
          }),
        })
      );
    });

    it("should filter by entity type", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs({
        tenantId: "tenant-1",
        entityType: "Order",
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: "Order",
          }),
        })
      );
    });

    it("should filter by user", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs({
        tenantId: "tenant-1",
        userId: "user-1",
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
          }),
        })
      );
    });

    it("should filter by date range", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      const dateFrom = new Date("2024-01-01");
      const dateTo = new Date("2024-01-31");

      await getAuditLogs({
        tenantId: "tenant-1",
        dateFrom,
        dateTo,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          }),
        })
      );
    });

    it("should calculate total pages correctly", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(25);

      const result = await getAuditLogs({
        tenantId: "tenant-1",
        page: 1,
        limit: 10,
      });

      expect(result.pagination.totalPages).toBe(3); // 25 items / 10 per page = 3 pages
    });

    it("should use default pagination values", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs({
        tenantId: "tenant-1",
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // (1-1) * 20
          take: 20, // default limit
        })
      );
    });
  });
});
