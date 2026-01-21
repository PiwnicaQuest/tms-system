import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// Types
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"
  | "VIEW"
  | "STATUS_CHANGE";

export type AuditEntityType =
  | "Order"
  | "OrderAssignment"
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

export interface AuditLogParams {
  tenantId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  metadata?: Record<string, unknown> | null;
  request?: NextRequest | null;
}

export interface AuditLogFilters {
  tenantId: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// Helper to extract IP address from request
export function getIpAddress(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return null;
}

// Helper to extract user agent from request
export function getUserAgent(request: NextRequest): string | null {
  return request.headers.get("user-agent");
}

// Calculate changes between old and new data
export function getEntityChanges<T extends Record<string, unknown>>(
  oldData: T | null,
  newData: T | null
): Record<string, { old: unknown; new: unknown }> | null {
  if (!oldData && !newData) return null;

  const changes: Record<string, { old: unknown; new: unknown }> = {};

  if (!oldData && newData) {
    // Creation - all fields are new
    for (const key of Object.keys(newData)) {
      if (shouldTrackField(key)) {
        changes[key] = { old: null, new: newData[key] };
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  }

  if (oldData && !newData) {
    // Deletion - all fields are removed
    for (const key of Object.keys(oldData)) {
      if (shouldTrackField(key)) {
        changes[key] = { old: oldData[key], new: null };
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  }

  if (oldData && newData) {
    // Update - compare fields
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (!shouldTrackField(key)) continue;

      const oldValue = oldData[key];
      const newValue = newData[key];

      // Handle Date comparison
      if (oldValue instanceof Date && newValue instanceof Date) {
        if (oldValue.getTime() !== newValue.getTime()) {
          changes[key] = { old: oldValue.toISOString(), new: newValue.toISOString() };
        }
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  }

  return null;
}

// Fields to skip in change tracking
const SKIP_FIELDS = new Set([
  "updatedAt",
  "createdAt",
  "password",
  "twoFactorSecret",
  "recoveryCodes",
  "tenant",
  "user",
  "orders",
  "invoices",
  "vehicles",
  "drivers",
  "documents",
  "costs",
  "waypoints",
  "items",
  "dailyWorkRecords",
  "_count",
]);

function shouldTrackField(key: string): boolean {
  return !SKIP_FIELDS.has(key);
}

// Create audit log entry
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress = params.request ? getIpAddress(params.request) : null;
    const userAgent = params.request ? getUserAgent(params.request) : null;

    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break main flow
    console.error("Error creating audit log:", error);
  }
}

// Query audit logs with filters and pagination
export async function getAuditLogs(filters: AuditLogFilters) {
  const {
    tenantId,
    action,
    entityType,
    entityId,
    userId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = filters;

  const where: Prisma.AuditLogWhereInput = {
    tenantId,
  };

  if (action) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (entityId) {
    where.entityId = entityId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = dateFrom;
    }
    if (dateTo) {
      where.createdAt.lte = dateTo;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Polish labels for audit actions
export const actionLabels: Record<AuditAction, string> = {
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

// Polish labels for entity types
export const entityTypeLabels: Record<AuditEntityType, string> = {
  Order: "Zlecenie",
  OrderAssignment: "Przypisanie zlecenia",
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
