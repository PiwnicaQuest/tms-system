import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { regenerateRecoveryCodes } from "@/lib/auth/two-factor-service";

const regenerateSchema = z.object({
  token: z.string().length(6, "Kod musi miec 6 cyfr").regex(/^\d+$/, "Kod musi zawierac tylko cyfry"),
});

// POST /api/auth/2fa/regenerate-codes - Regenerate recovery codes
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = regenerateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { token } = validatedData.data;

    const result = await regenerateRecoveryCodes(session.user.id, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      recoveryCodes: result.recoveryCodes,
      message: "Nowe kody zapasowe zostaly wygenerowane. Zapisz je w bezpiecznym miejscu.",
    });
  } catch (error) {
    console.error("Error regenerating recovery codes:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas generowania kodow zapasowych" },
      { status: 500 }
    );
  }
}
