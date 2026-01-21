import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * @swagger
 * /api/driver/orders/{orderId}/signature:
 *   post:
 *     summary: Zapisz podpis POD (Proof of Delivery)
 *     tags: [Driver]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paths:
 *                 type: array
 *                 items:
 *                   type: string
 *               width:
 *                 type: number
 *               height:
 *                 type: number
 *               recipientName:
 *                 type: string
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const body = await request.json();
    const { paths, width, height, recipientName } = body;

    // Verify order belongs to driver
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        driverId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Generate SVG from paths
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
  ${paths.map((path: string) => `<path d="${path}" stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("\n  ")}
</svg>`;

    // Create signature directory
    const uploadDir = join(process.cwd(), "public", "uploads", "signatures", orderId);
    await mkdir(uploadDir, { recursive: true });

    // Save signature SVG
    const timestamp = Date.now();
    const filename = `signature-${timestamp}.svg`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, svgContent);

    // Update order with POD data
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        podSignatureUrl: `/uploads/signatures/${orderId}/${filename}`,
        podRecipientName: recipientName,
        podSignedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: order.tenantId,
        action: "UPDATE",
        entityType: "Order",
        entityId: orderId,
        newValues: {
          podSignatureUrl: updatedOrder.podSignatureUrl,
          podRecipientName: recipientName,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving signature:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
