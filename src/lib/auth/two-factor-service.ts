import { generateSecret as generateSecretBase, generateURI, verifySync } from "otplib";
import * as QRCode from "qrcode";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

const APP_NAME = "Bakus TMS";

// TOTP options
const TOTP_OPTIONS = {
  digits: 6 as const,
  period: 30,
  epochTolerance: 30, // Allow 30 seconds tolerance for clock drift
};

/**
 * Generate a new TOTP secret for a user
 */
export function generateSecret(email: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = generateSecretBase();
  const otpauthUrl = generateURI({
    secret,
    issuer: APP_NAME,
    label: email,
    digits: TOTP_OPTIONS.digits,
    period: TOTP_OPTIONS.period,
  });

  return { secret, otpauthUrl };
}

/**
 * Generate QR code as data URL for the authenticator app
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      margin: 2,
      width: 256,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Nie udalo sie wygenerowac kodu QR");
  }
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyToken(secret: string, token: string): boolean {
  try {
    // Remove any spaces from the token
    const cleanToken = token.replace(/\s/g, "");
    const result = verifySync({
      token: cleanToken,
      secret,
      digits: TOTP_OPTIONS.digits,
      period: TOTP_OPTIONS.period,
      epochTolerance: TOTP_OPTIONS.epochTolerance,
    });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate recovery codes (10 codes, each 8 characters)
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Generate 4 bytes, convert to hex (8 characters)
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Hash recovery codes for secure storage
 */
export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  const hashedCodes = await Promise.all(
    codes.map((code) => hash(code.replace("-", ""), 10))
  );
  return hashedCodes;
}

/**
 * Verify a recovery code against stored hashed codes
 */
export async function verifyRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; usedIndex: number }> {
  const cleanCode = inputCode.replace("-", "").toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await compare(cleanCode, hashedCodes[i]);
    if (isValid) {
      return { valid: true, usedIndex: i };
    }
  }

  return { valid: false, usedIndex: -1 };
}

/**
 * Enable 2FA for a user after verifying the token
 */
export async function enable2FA(
  userId: string,
  secret: string,
  token: string
): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  // Verify the token first
  if (!verifyToken(secret, token)) {
    return { success: false, error: "Nieprawidlowy kod weryfikacyjny" };
  }

  // Generate recovery codes
  const recoveryCodes = generateRecoveryCodes();
  const hashedCodes = await hashRecoveryCodes(recoveryCodes);

  try {
    // Update user with 2FA settings
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        recoveryCodes: JSON.stringify(hashedCodes),
      },
    });

    return { success: true, recoveryCodes };
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    return { success: false, error: "Blad podczas wlaczania 2FA" };
  }
}

/**
 * Disable 2FA for a user after verifying the token
 */
export async function disable2FA(
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  // Get user's current secret
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, recoveryCodes: true },
  });

  if (!user || !user.twoFactorSecret) {
    return { success: false, error: "2FA nie jest wlaczone" };
  }

  // Verify the token OR recovery code
  const isValidToken = verifyToken(user.twoFactorSecret, token);

  let isValidRecoveryCode = false;
  if (!isValidToken && user.recoveryCodes) {
    try {
      const hashedCodes = JSON.parse(user.recoveryCodes) as string[];
      const result = await verifyRecoveryCode(token, hashedCodes);
      isValidRecoveryCode = result.valid;
    } catch {
      // Invalid JSON, ignore
    }
  }

  if (!isValidToken && !isValidRecoveryCode) {
    return { success: false, error: "Nieprawidlowy kod weryfikacyjny" };
  }

  try {
    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return { success: false, error: "Blad podczas wylaczania 2FA" };
  }
}

/**
 * Verify 2FA during login (TOTP or recovery code)
 */
export async function verify2FALogin(
  userId: string,
  token: string
): Promise<{ success: boolean; usedRecoveryCode: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, recoveryCodes: true },
  });

  if (!user || !user.twoFactorSecret) {
    return { success: false, usedRecoveryCode: false, error: "2FA nie jest wlaczone" };
  }

  // First try TOTP verification
  if (verifyToken(user.twoFactorSecret, token)) {
    return { success: true, usedRecoveryCode: false };
  }

  // Then try recovery code
  if (user.recoveryCodes) {
    try {
      const hashedCodes = JSON.parse(user.recoveryCodes) as string[];
      const result = await verifyRecoveryCode(token, hashedCodes);

      if (result.valid) {
        // Remove the used recovery code
        hashedCodes.splice(result.usedIndex, 1);

        await prisma.user.update({
          where: { id: userId },
          data: {
            recoveryCodes: JSON.stringify(hashedCodes),
          },
        });

        return { success: true, usedRecoveryCode: true };
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  return { success: false, usedRecoveryCode: false, error: "Nieprawidlowy kod" };
}

/**
 * Get 2FA status for a user
 */
export async function get2FAStatus(userId: string): Promise<{
  enabled: boolean;
  recoveryCodesCount: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, recoveryCodes: true },
  });

  if (!user) {
    return { enabled: false, recoveryCodesCount: 0 };
  }

  let recoveryCodesCount = 0;
  if (user.recoveryCodes) {
    try {
      const hashedCodes = JSON.parse(user.recoveryCodes) as string[];
      recoveryCodesCount = hashedCodes.length;
    } catch {
      // Invalid JSON
    }
  }

  return {
    enabled: user.twoFactorEnabled,
    recoveryCodesCount,
  };
}

/**
 * Regenerate recovery codes for a user
 */
export async function regenerateRecoveryCodes(
  userId: string,
  token: string
): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return { success: false, error: "2FA nie jest wlaczone" };
  }

  // Verify the token
  if (!verifyToken(user.twoFactorSecret, token)) {
    return { success: false, error: "Nieprawidlowy kod weryfikacyjny" };
  }

  // Generate new recovery codes
  const recoveryCodes = generateRecoveryCodes();
  const hashedCodes = await hashRecoveryCodes(recoveryCodes);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        recoveryCodes: JSON.stringify(hashedCodes),
      },
    });

    return { success: true, recoveryCodes };
  } catch (error) {
    console.error("Error regenerating recovery codes:", error);
    return { success: false, error: "Blad podczas generowania kodow zapasowych" };
  }
}
