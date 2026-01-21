import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

// GET /api/webhooks/[id] - Get webhook details with recent deliveries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only ADMIN and SUPER_ADMIN can access webhooks
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Get delivery statistics
    const [totalDeliveries, successfulDeliveries, failedDeliveries] =
      await Promise.all([
        prisma.webhookDelivery.count({
          where: { webhookId: id },
        }),
        prisma.webhookDelivery.count({
          where: { webhookId: id, success: true },
        }),
        prisma.webhookDelivery.count({
          where: { webhookId: id, success: false },
        }),
      ]);

    return NextResponse.json({
      ...webhook,
      stats: {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate:
          totalDeliveries > 0
            ? Math.round((successfulDeliveries / totalDeliveries) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania webhooka" },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks/[id] - Update webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only ADMIN and SUPER_ADMIN can manage webhooks
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if webhook exists and belongs to tenant
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingWebhook) {
      return NextResponse.json(
        { error: "Webhook nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Validate URL format if provided
    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { error: "Nieprawidlowy format URL" },
          { status: 400 }
        );
      }
    }

    // Validate events if provided
    if (body.events) {
      if (body.events.length === 0) {
        return NextResponse.json(
          { error: "Co najmniej jedno zdarzenie jest wymagane" },
          { status: 400 }
        );
      }

      const validEvents = WEBHOOK_EVENTS.map((e) => e.value);
      const invalidEvents = body.events.filter(
        (e: string) => !validEvents.includes(e as typeof validEvents[number])
      );
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Nieprawidlowe zdarzenia: ${invalidEvents.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        url: body.url !== undefined ? body.url : undefined,
        events: body.events !== undefined ? body.events : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        headers: body.headers !== undefined ? body.headers : undefined,
      },
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji webhooka" },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only ADMIN and SUPER_ADMIN can manage webhooks
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if webhook exists and belongs to tenant
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingWebhook) {
      return NextResponse.json(
        { error: "Webhook nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Delete webhook (deliveries will be cascade deleted)
    await prisma.webhook.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania webhooka" },
      { status: 500 }
    );
  }
}
