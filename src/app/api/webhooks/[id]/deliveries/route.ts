import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { retryWebhookDelivery } from "@/lib/webhooks";

// GET /api/webhooks/[id]/deliveries - List deliveries with pagination
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

    // Only ADMIN and SUPER_ADMIN can access webhook deliveries
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if webhook exists and belongs to tenant
    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook nie zostal znaleziony" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const success = searchParams.get("success");

    const where: { webhookId: string; success?: boolean } = { webhookId: id };
    if (success === "true") {
      where.success = true;
    } else if (success === "false") {
      where.success = false;
    }

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookDelivery.count({ where }),
    ]);

    return NextResponse.json({
      data: deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania historii dostarczenia" },
      { status: 500 }
    );
  }
}

// POST /api/webhooks/[id]/deliveries - Retry a failed delivery
export async function POST(
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

    // Only ADMIN and SUPER_ADMIN can retry deliveries
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien" },
        { status: 403 }
      );
    }

    const { id: webhookId } = await params;
    const body = await request.json();
    const { deliveryId } = body;

    if (!deliveryId) {
      return NextResponse.json(
        { error: "ID dostarczenia jest wymagane" },
        { status: 400 }
      );
    }

    // Verify webhook belongs to tenant
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        tenantId,
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook nie zostal znaleziony" },
        { status: 404 }
      );
    }

    // Verify delivery belongs to this webhook
    const delivery = await prisma.webhookDelivery.findFirst({
      where: {
        id: deliveryId,
        webhookId,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Dostarczenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    const result = await retryWebhookDelivery(deliveryId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Webhook zostal ponownie wyslany pomyslnie",
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Ponowne wyslanie webhooka nie powiodlo sie",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error retrying webhook delivery:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas ponownego wysylania webhooka" },
      { status: 500 }
    );
  }
}
