import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

// GET - pobierz zdjęcia pojazdu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify vehicle belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const photos = await prisma.vehiclePhoto.findMany({
      where: { vehicleId: id },
      orderBy: [
        { isPrimary: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ data: photos });
  } catch (error) {
    console.error("Error fetching vehicle photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - upload zdjęć pojazdu
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify vehicle belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const photos = formData.getAll("photos") as File[];
    const descriptions = formData.getAll("descriptions") as string[];

    if (photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    // Check current photo count
    const currentCount = await prisma.vehiclePhoto.count({
      where: { vehicleId: id },
    });

    if (currentCount + photos.length > 10) {
      return NextResponse.json(
        { error: "Maksymalnie 10 zdjęć na pojazd" },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), "public", "uploads", "vehicles", id);
    await mkdir(uploadDir, { recursive: true });

    const savedPhotos = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const description = descriptions[i] || null;

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
      const photoRecord = await prisma.vehiclePhoto.create({
        data: {
          vehicleId: id,
          url: `/uploads/vehicles/${id}/${filename}`,
          description,
          isPrimary: currentCount === 0 && i === 0, // First photo is primary if no photos exist
          uploadedBy: session.user.id,
        },
      });

      savedPhotos.push(photoRecord);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "CREATE",
        entityType: "VehiclePhoto",
        entityId: id,
        newValues: { photoCount: savedPhotos.length },
      },
    });

    return NextResponse.json({
      success: true,
      photos: savedPhotos,
    });
  } catch (error) {
    console.error("Error uploading vehicle photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - usuń zdjęcie pojazdu
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 });
    }

    // Verify vehicle belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Get photo
    const photo = await prisma.vehiclePhoto.findFirst({
      where: {
        id: photoId,
        vehicleId: id,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const filepath = join(process.cwd(), "public", photo.url);
      await unlink(filepath);
    } catch (e) {
      console.warn("Could not delete file:", e);
    }

    // Delete from database
    await prisma.vehiclePhoto.delete({
      where: { id: photoId },
    });

    // If deleted photo was primary, set next one as primary
    if (photo.isPrimary) {
      const nextPhoto = await prisma.vehiclePhoto.findFirst({
        where: { vehicleId: id },
        orderBy: { createdAt: "asc" },
      });
      if (nextPhoto) {
        await prisma.vehiclePhoto.update({
          where: { id: nextPhoto.id },
          data: { isPrimary: true },
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "DELETE",
        entityType: "VehiclePhoto",
        entityId: photoId,
        oldValues: { url: photo.url },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vehicle photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - ustaw zdjęcie jako główne
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 });
    }

    // Verify vehicle belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Verify photo belongs to vehicle
    const photo = await prisma.vehiclePhoto.findFirst({
      where: {
        id: photoId,
        vehicleId: id,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Unset all as primary, then set the selected one
    await prisma.vehiclePhoto.updateMany({
      where: { vehicleId: id },
      data: { isPrimary: false },
    });

    await prisma.vehiclePhoto.update({
      where: { id: photoId },
      data: { isPrimary: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting primary photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
