import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateRecoveryCodes,
  hashRecoveryCodes,
  verifyRecoveryCode,
  enable2FA,
  disable2FA,
  verify2FALogin,
  get2FAStatus,
  regenerateRecoveryCodes,
} from "@/lib/auth/two-factor-service";
import { prisma } from "@/lib/db/prisma";

// Mock otplib
vi.mock("otplib", () => ({
  generateSecret: vi.fn(() => "JBSWY3DPEHPK3PXP"),
  generateURI: vi.fn(
    ({ secret, issuer, label }) =>
      `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`
  ),
  verifySync: vi.fn(({ token, secret }) => {
    // Simulate valid token
    if (token === "123456" && secret === "JBSWY3DPEHPK3PXP") {
      return { valid: true, delta: 0 };
    }
    return { valid: false };
  }),
}));

// Mock QRCode
vi.mock("qrcode", () => ({
  toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,mockQRCode")),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  hash: vi.fn((value: string) => Promise.resolve(`hashed_${value}`)),
  compare: vi.fn((value: string, hash: string) =>
    Promise.resolve(hash === `hashed_${value.replace("-", "").toUpperCase()}`)
  ),
}));

describe("Two-Factor Authentication Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSecret", () => {
    it("should generate a secret and otpauth URL", () => {
      const result = generateSecret("test@example.com");

      expect(result).toHaveProperty("secret");
      expect(result).toHaveProperty("otpauthUrl");
      expect(result.secret).toBe("JBSWY3DPEHPK3PXP");
      expect(result.otpauthUrl).toContain("otpauth://totp/");
      expect(result.otpauthUrl).toContain("test@example.com");
    });
  });

  describe("generateQRCode", () => {
    it("should generate a QR code data URL", async () => {
      const result = await generateQRCode("otpauth://totp/test");

      expect(result).toBe("data:image/png;base64,mockQRCode");
    });
  });

  describe("verifyToken", () => {
    it("should return true for valid token", () => {
      const result = verifyToken("JBSWY3DPEHPK3PXP", "123456");
      expect(result).toBe(true);
    });

    it("should return false for invalid token", () => {
      const result = verifyToken("JBSWY3DPEHPK3PXP", "000000");
      expect(result).toBe(false);
    });

    it("should handle tokens with spaces", () => {
      const result = verifyToken("JBSWY3DPEHPK3PXP", "123 456");
      expect(result).toBe(true);
    });
  });

  describe("generateRecoveryCodes", () => {
    it("should generate 10 recovery codes", () => {
      // Restore original crypto for this test
      vi.unmock("crypto");
      const codes = generateRecoveryCodes();

      expect(codes).toHaveLength(10);
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      });
    });
  });

  describe("hashRecoveryCodes", () => {
    it("should hash all recovery codes", async () => {
      const codes = ["ABCD-1234", "EFGH-5678"];
      const hashed = await hashRecoveryCodes(codes);

      expect(hashed).toHaveLength(2);
      expect(hashed[0]).toBe("hashed_ABCD1234");
      expect(hashed[1]).toBe("hashed_EFGH5678");
    });
  });

  describe("verifyRecoveryCode", () => {
    it("should verify valid recovery code", async () => {
      const hashedCodes = ["hashed_ABCD1234", "hashed_EFGH5678"];
      const result = await verifyRecoveryCode("ABCD-1234", hashedCodes);

      expect(result.valid).toBe(true);
      expect(result.usedIndex).toBe(0);
    });

    it("should reject invalid recovery code", async () => {
      const hashedCodes = ["hashed_ABCD1234", "hashed_EFGH5678"];
      const result = await verifyRecoveryCode("XXXX-XXXX", hashedCodes);

      expect(result.valid).toBe(false);
      expect(result.usedIndex).toBe(-1);
    });
  });

  describe("enable2FA", () => {
    it("should enable 2FA with valid token", async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await enable2FA("user-123", "JBSWY3DPEHPK3PXP", "123456");

      expect(result.success).toBe(true);
      expect(result.recoveryCodes).toBeDefined();
      expect(result.recoveryCodes).toHaveLength(10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: expect.objectContaining({
          twoFactorEnabled: true,
          twoFactorSecret: "JBSWY3DPEHPK3PXP",
        }),
      });
    });

    it("should fail with invalid token", async () => {
      const result = await enable2FA("user-123", "JBSWY3DPEHPK3PXP", "000000");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nieprawidlowy kod weryfikacyjny");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("disable2FA", () => {
    it("should disable 2FA with valid TOTP token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
        recoveryCodes: null,
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await disable2FA("user-123", "123456");

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          recoveryCodes: null,
        },
      });
    });

    it("should disable 2FA with valid recovery code", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
        recoveryCodes: JSON.stringify(["hashed_ABCD1234"]),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await disable2FA("user-123", "ABCD-1234");

      expect(result.success).toBe(true);
    });

    it("should fail when 2FA is not enabled", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorSecret: null,
      } as never);

      const result = await disable2FA("user-123", "123456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("2FA nie jest wlaczone");
    });
  });

  describe("verify2FALogin", () => {
    it("should verify with TOTP token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
        recoveryCodes: null,
      } as never);

      const result = await verify2FALogin("user-123", "123456");

      expect(result.success).toBe(true);
      expect(result.usedRecoveryCode).toBe(false);
    });

    it("should verify with recovery code and remove it", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorSecret: "DIFFERENT_SECRET",
        recoveryCodes: JSON.stringify(["hashed_ABCD1234", "hashed_EFGH5678"]),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await verify2FALogin("user-123", "ABCD-1234");

      expect(result.success).toBe(true);
      expect(result.usedRecoveryCode).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          recoveryCodes: JSON.stringify(["hashed_EFGH5678"]),
        },
      });
    });

    it("should fail with invalid token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
        recoveryCodes: JSON.stringify([]),
      } as never);

      const result = await verify2FALogin("user-123", "000000");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nieprawidlowy kod");
    });
  });

  describe("get2FAStatus", () => {
    it("should return enabled status with recovery codes count", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorEnabled: true,
        recoveryCodes: JSON.stringify(["code1", "code2", "code3"]),
      } as never);

      const result = await get2FAStatus("user-123");

      expect(result.enabled).toBe(true);
      expect(result.recoveryCodesCount).toBe(3);
    });

    it("should return disabled status for user without 2FA", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorEnabled: false,
        recoveryCodes: null,
      } as never);

      const result = await get2FAStatus("user-123");

      expect(result.enabled).toBe(false);
      expect(result.recoveryCodesCount).toBe(0);
    });

    it("should handle non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await get2FAStatus("non-existent");

      expect(result.enabled).toBe(false);
      expect(result.recoveryCodesCount).toBe(0);
    });
  });

  describe("regenerateRecoveryCodes", () => {
    it("should regenerate recovery codes with valid token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await regenerateRecoveryCodes("user-123", "123456");

      expect(result.success).toBe(true);
      expect(result.recoveryCodes).toBeDefined();
      expect(result.recoveryCodes).toHaveLength(10);
    });

    it("should fail when 2FA is not enabled", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorEnabled: false,
        twoFactorSecret: null,
      } as never);

      const result = await regenerateRecoveryCodes("user-123", "123456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("2FA nie jest wlaczone");
    });

    it("should fail with invalid token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
      } as never);

      const result = await regenerateRecoveryCodes("user-123", "000000");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nieprawidlowy kod weryfikacyjny");
    });
  });
});
