import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

/**
 * @swagger
 * /api/driver/auth/login:
 *   post:
 *     summary: Logowanie kierowcy (dla aplikacji mobilnej)
 *     tags: [Driver Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token JWT i dane użytkownika
 *       401:
 *         description: Nieprawidłowe dane logowania
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        phone: true,
        vehicleId: true,
        tenantId: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Nieprawidłowy email lub hasło" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Konto jest nieaktywne" },
        { status: 401 }
      );
    }

    // Check if user is a driver
    if (user.role !== "DRIVER") {
      return NextResponse.json(
        { error: "Dostęp tylko dla kierowców" },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Nieprawidłowy email lub hasło" },
        { status: 401 }
      );
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

    // Generate JWT token
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      JWT_SECRET,
      { expiresIn: "30d" } // Long-lived token for mobile app
    );

    // Return user data without password
    const { password: _, ...userData } = user;

    return NextResponse.json({
      token,
      user: {
        ...userData,
        vehicleNumber,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
