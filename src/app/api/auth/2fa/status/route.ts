import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { get2FAStatus } from "@/lib/auth/two-factor-service";

// GET /api/auth/2fa/status - Get 2FA status for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const status = await get2FAStatus(session.user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting 2FA status:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania statusu 2FA" },
      { status: 500 }
    );
  }
}
