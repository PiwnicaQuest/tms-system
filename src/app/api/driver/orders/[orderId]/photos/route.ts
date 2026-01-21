import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * @swagger
 * /api/driver/orders/{orderId}/photos:
 *   post:
 *     summary: Prześlij zdjęcia dokumentacji
 *     tags: [Driver]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
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

    // Parse multipart form data
    const formData = await request.formData();
    const photos = formData.getAll("photos") as File[];

    if (photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), "public", "uploads", "orders", orderId);
    await mkdir(uploadDir, { recursive: true });

    const savedPhotos = [];

    for (const photo of photos) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const timestamp = Date.now();
      const ext = photo.name.split(".").pop() || "jpg";
      const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filepath = join(uploadDir, filename);

      // Save file
      await writeFile(filepath, buffer);

      // Create database record
      const photoRecord = await prisma.orderPhoto.create({
        data: {
          orderId,
          url: `/uploads/orders/${orderId}/${filename}`,
          type: "DOCUMENTATION",
          uploadedBy: session.user.id,
        },
      });

      savedPhotos.push(photoRecord);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: order.tenantId,
        action: "CREATE",
        entityType: "OrderPhoto",
        entityId: orderId,
        newValues: { photoCount: savedPhotos.length },
      },
    });

    return NextResponse.json({
      success: true,
      photos: savedPhotos,
    });
  } catch (error) {
    console.error("Error uploading photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
