import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enable2FA } from "@/lib/auth/two-factor-service";

const enableSchema = z.object({
  secret: z.string().min(16, "Nieprawidlowy sekret"),
  token: z.string().length(6, "Kod musi miec 6 cyfr").regex(/^\d+$/, "Kod musi zawierac tylko cyfry"),
});

// POST /api/auth/2fa/enable - Enable 2FA after verifying token
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = enableSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { secret, token } = validatedData.data;

    const result = await enable2FA(session.user.id, secret, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      recoveryCodes: result.recoveryCodes,
      message: "2FA zostalo wlaczone. Zapisz kody zapasowe w bezpiecznym miejscu.",
    });
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas wlaczania 2FA" },
      { status: 500 }
    );
  }
}
