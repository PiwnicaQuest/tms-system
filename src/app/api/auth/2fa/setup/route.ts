import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSecret, generateQRCode } from "@/lib/auth/two-factor-service";
import { prisma } from "@/lib/db/prisma";

// POST /api/auth/2fa/setup - Generate new 2FA secret and QR code
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    // Check if 2FA is already enabled
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Nie znaleziono uzytkownika" }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA jest juz wlaczone. Najpierw wylacz obecne 2FA." },
        { status: 400 }
      );
    }

    // Generate new secret
    const { secret, otpauthUrl } = generateSecret(user.email);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(otpauthUrl);

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpauthUrl,
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas konfiguracji 2FA" },
      { status: 500 }
    );
  }
}
