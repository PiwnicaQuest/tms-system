import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/driver/push-token:
 *   post:
 *     summary: Zarejestruj token push notification
 *     tags: [Driver]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Expo Push Token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Push token is required" },
        { status: 400 }
      );
    }

    // Update or create push token for user
    await prisma.pushToken.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        token,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token,
        platform: "expo", // Mobile app platform
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving push token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
