import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";

const checkSchema = z.object({
  email: z.string().email("Nieprawidlowy email"),
  password: z.string().min(1, "Haslo jest wymagane"),
});

// POST /api/auth/check-2fa - Check if user has 2FA enabled (pre-auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = checkSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Nieprawidlowe dane" },
        { status: 400 }
      );
    }

    const { email, password } = validatedData.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        isActive: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Nieprawidlowy email lub haslo" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Nieprawidlowy email lub haslo" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Konto jest nieaktywne" },
        { status: 403 }
      );
    }

    // If 2FA is not enabled, return false
    if (!user.twoFactorEnabled) {
      return NextResponse.json({
        requires2FA: false,
      });
    }

    // Set pending 2FA session cookie
    const response = NextResponse.json({
      requires2FA: true,
      userId: user.id,
    });

    // Cookie expires in 5 minutes
    const cookieStore = await cookies();
    cookieStore.set("pending_2fa_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60, // 5 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error checking 2FA:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas weryfikacji" },
      { status: 500 }
    );
  }
}
