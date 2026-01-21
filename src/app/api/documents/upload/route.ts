import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// POST /api/documents/upload - Upload a document file
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const entityType = formData.get("entityType") as string; // vehicle, trailer, driver, order
    const entityId = formData.get("entityId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Dozwolone formaty: JPG, PNG, WebP, PDF" },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Maksymalny rozmiar pliku to 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = file.name.split(".").pop() || "pdf";
    const filename = `${timestamp}-${random}.${ext}`;

    // Create upload directory based on entity type
    let uploadPath = "documents";
    if (entityType && entityId) {
      uploadPath = `documents/${entityType}/${entityId}`;
    } else {
      uploadPath = `documents/${session.user.tenantId}`;
    }

    const uploadDir = join(process.cwd(), "public", "uploads", uploadPath);
    await mkdir(uploadDir, { recursive: true });

    const filepath = join(uploadDir, filename);

    // Save file
    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/${uploadPath}/${filename}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
