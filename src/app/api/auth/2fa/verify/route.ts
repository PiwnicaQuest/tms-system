import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verify2FALogin } from "@/lib/auth/two-factor-service";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";

const verifySchema = z.object({
  userId: z.string().min(1, "ID uzytkownika jest wymagane"),
  token: z.string().min(6, "Kod jest wymagany"),
});

// POST /api/auth/2fa/verify - Verify 2FA token during login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifySchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { userId, token } = validatedData.data;

    // Verify the pending 2FA session
    const cookieStore = await cookies();
    const pendingSession = cookieStore.get("pending_2fa_session");

    if (!pendingSession || pendingSession.value !== userId) {
      return NextResponse.json(
        { error: "Sesja weryfikacji 2FA wygasla. Zaloguj sie ponownie." },
        { status: 401 }
      );
    }

    const result = await verify2FALogin(userId, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get user data for the response
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Nie znaleziono uzytkownika" }, { status: 404 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    // Clear pending 2FA session cookie
    const response = NextResponse.json({
      success: true,
      usedRecoveryCode: result.usedRecoveryCode,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
      },
    });

    response.cookies.delete("pending_2fa_session");

    return response;
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas weryfikacji 2FA" },
      { status: 500 }
    );
  }
}
