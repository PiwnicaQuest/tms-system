import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { generateWebhookSecret, WEBHOOK_EVENTS } from "@/lib/webhooks";

// GET /api/webhooks - List webhooks for tenant
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

    // Only ADMIN and SUPER_ADMIN can access webhooks
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { deliveries: true },
          },
        },
      }),
      prisma.webhook.count({ where: { tenantId } }),
    ]);

    // Get recent delivery stats for each webhook
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
        const recentDeliveries = await prisma.webhookDelivery.findMany({
          where: { webhookId: webhook.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            success: true,
            createdAt: true,
          },
        });

        const successCount = recentDeliveries.filter((d) => d.success).length;
        const failedCount = recentDeliveries.length - successCount;
        const lastDelivery = recentDeliveries[0];

        return {
          ...webhook,
          // Don't expose the secret in list view
          secret: undefined,
          stats: {
            totalDeliveries: webhook._count.deliveries,
            recentSuccess: successCount,
            recentFailed: failedCount,
            lastDeliveryAt: lastDelivery?.createdAt || null,
            lastDeliverySuccess: lastDelivery?.success ?? null,
          },
        };
      })
    );

    return NextResponse.json({
      data: webhooksWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania webhookow" },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create new webhook
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.url || !body.events || body.events.length === 0) {
      return NextResponse.json(
        { error: "Nazwa, URL i co najmniej jedno zdarzenie sa wymagane" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: "Nieprawidlowy format URL" },
        { status: 400 }
      );
    }

    // Validate events
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

    // Generate a secret for this webhook
    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        tenantId,
        name: body.name,
        url: body.url,
        secret,
        events: body.events,
        isActive: body.isActive ?? true,
        headers: body.headers || null,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia webhooka" },
      { status: 500 }
    );
  }
}
