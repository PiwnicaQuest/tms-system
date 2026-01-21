import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

/**
 * @swagger
 * /api/driver/auth/me:
 *   get:
 *     summary: Pobierz dane zalogowanego kierowcy
 *     tags: [Driver Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dane użytkownika
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded: { userId: string };
    try {
      decoded = verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        vehicleId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account disabled" }, { status: 401 });
    }

    // Get vehicle if assigned
    let vehicleNumber: string | null = null;
    if (user.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: user.vehicleId },
        select: { registrationNumber: true },
      });
      vehicleNumber = vehicle?.registrationNumber || null;
    }

    return NextResponse.json({
      ...user,
      vehicleNumber,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
