import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { sendTestWebhook } from "@/lib/webhooks";

// POST /api/webhooks/[id]/test - Send test webhook
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

    // Only ADMIN and SUPER_ADMIN can test webhooks
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

    const result = await sendTestWebhook(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Testowy webhook zostal wyslany pomyslnie",
        statusCode: result.statusCode,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Wyslanie testowego webhooka nie powiodlo sie",
        error: result.error,
        statusCode: result.statusCode,
      });
    }
  } catch (error) {
    console.error("Error sending test webhook:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas wysylania testowego webhooka" },
      { status: 500 }
    );
  }
}
