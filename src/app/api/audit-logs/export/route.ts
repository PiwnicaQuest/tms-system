import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { AuditAction, AuditEntityType, actionLabels, entityTypeLabels } from "@/lib/audit/audit-service";

// GET /api/audit-logs/export - Export audit logs to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    // Only ADMIN and SUPER_ADMIN can export audit logs
    const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do eksportu logow audytowych" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const action = searchParams.get("action") as AuditAction | null;
    const entityType = searchParams.get("entityType") as AuditEntityType | null;
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
    };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
      }
    }

    // Limit export to 10000 records
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    // Generate CSV
    const csvHeader = [
      "Data",
      "Uzytkownik",
      "Email",
      "Akcja",
      "Typ encji",
      "ID encji",
      "Adres IP",
      "Zmiany",
    ].join(";");

    const csvRows = logs.map((log) => {
      const date = new Date(log.createdAt).toLocaleString("pl-PL");
      const userName = log.user?.name || "-";
      const userEmail = log.user?.email || "-";
      const actionLabel = actionLabels[log.action as AuditAction] || log.action;
      const entityLabel = entityTypeLabels[log.entityType as AuditEntityType] || log.entityType;
      const entityId = log.entityId || "-";
      const ipAddress = log.ipAddress || "-";
      const changes = log.changes
        ? JSON.stringify(log.changes).replace(/;/g, ",").replace(/"/g, "'")
        : "-";

      return [date, userName, userEmail, actionLabel, entityLabel, entityId, ipAddress, changes].join(
        ";"
      );
    });

    const csv = [csvHeader, ...csvRows].join("\n");

    // Add BOM for UTF-8 encoding
    const bom = "\uFEFF";
    const csvWithBom = bom + csv;

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="logi-audytowe-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas eksportu logow audytowych" },
      { status: 500 }
    );
  }
}
