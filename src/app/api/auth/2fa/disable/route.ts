import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { disable2FA } from "@/lib/auth/two-factor-service";

const disableSchema = z.object({
  token: z.string().min(6, "Kod jest wymagany"),
});

// POST /api/auth/2fa/disable - Disable 2FA with verification
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = disableSchema.safeParse(body);

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

    const result = await disable2FA(session.user.id, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "2FA zostalo wylaczone",
    });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas wylaczania 2FA" },
      { status: 500 }
    );
  }
}
