import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { runNotificationChecks } from "@/lib/notifications/service";

// This endpoint can be called by a cron job or manually
// In production, you'd use Vercel Cron Jobs or similar

export async function POST(request: NextRequest) {
  try {
    // Check for cron secret or authenticated user
    const cronSecret = request.headers.get("x-cron-secret");
    const isValidCron = cronSecret === process.env.CRON_SECRET;

    if (!isValidCron) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
      }

      // Only admins can trigger manual checks
      if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Brak uprawnień" },
          { status: 403 }
        );
      }
    }

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const results: Array<{
      tenantId: string;
      tenantName: string;
      documentsChecked: number;
      invoicesChecked: number;
      emailsSent: number;
    }> = [];

    for (const tenant of tenants) {
      const result = await runNotificationChecks(tenant.id);
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        ...result,
      });
    }

    const totalDocuments = results.reduce((sum, r) => sum + r.documentsChecked, 0);
    const totalInvoices = results.reduce((sum, r) => sum + r.invoicesChecked, 0);
    const totalEmails = results.reduce((sum, r) => sum + r.emailsSent, 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        tenantsProcessed: tenants.length,
        totalDocumentNotifications: totalDocuments,
        totalInvoiceNotifications: totalInvoices,
        totalEmailsSent: totalEmails,
      },
      details: results,
    });
  } catch (error) {
    console.error("Error running notification checks:", error);
    return NextResponse.json(
      { error: "Błąd sprawdzania powiadomień" },
      { status: 500 }
    );
  }
}

// GET endpoint for single tenant (authenticated user)
export async function GET() {
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

    // Only admins can trigger checks
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Brak uprawnień" },
        { status: 403 }
      );
    }

    const result = await runNotificationChecks(tenantId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Error running notification checks:", error);
    return NextResponse.json(
      { error: "Błąd sprawdzania powiadomień" },
      { status: 500 }
    );
  }
}
