import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { logAudit } from "@/lib/audit/audit-service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Haslo", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        // Check if this is a 2FA verified login
        const is2FAVerified = password.startsWith("2fa_verified_");
        const userId = is2FAVerified ? password.replace("2fa_verified_", "") : null;

        const user = await prisma.user.findUnique({
          where: is2FAVerified ? { id: userId! } : { email },
          include: { tenant: true },
        });

        if (!user || !user.password) {
          return null;
        }

        // If 2FA verified, skip password check (already verified in /api/auth/check-2fa)
        if (!is2FAVerified) {
          const isValid = await compare(password, user.password);

          if (!isValid) {
            return null;
          }

          // If user has 2FA enabled and this is not a 2FA verified request, reject
          // (The login page should redirect to 2FA verification first)
          if (user.twoFactorEnabled) {
            throw new Error("2FA_REQUIRED");
          }
        }

        if (!user.isActive) {
          throw new Error("Konto jest nieaktywne");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Log login audit (only if user has tenant)
        if (user.tenantId) {
          await logAudit({
            tenantId: user.tenantId,
            userId: user.id,
            action: "LOGIN",
            entityType: "User",
            entityId: user.id,
            metadata: { email: user.email },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
        token.tenantId = (user as { tenantId: string | null }).tenantId;
        token.tenantName = (user as { tenantName?: string }).tenantName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string | null;
        session.user.tenantName = token.tenantName as string | undefined;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;

      // Pages that require authentication
      const isOnDashboard = pathname.startsWith("/dashboard") ||
        pathname.startsWith("/orders") ||
        pathname.startsWith("/vehicles") ||
        pathname.startsWith("/drivers") ||
        pathname.startsWith("/costs") ||
        pathname.startsWith("/invoices") ||
        pathname.startsWith("/documents") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/trailers") ||
        pathname.startsWith("/contractors") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/gps") ||
        pathname.startsWith("/calendar") || pathname.startsWith("/notes") || pathname.startsWith("/webhooks") ||
        pathname.startsWith("/import") ||
        pathname.startsWith("/export") ||
        pathname.startsWith("/audit-logs") ||
        pathname.startsWith("/api-docs");

      // Auth pages that don't require login
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/verify-2fa");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      } else if (isLoggedIn && !isAuthPage) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
