import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/addresses/suggestions - Get address suggestions from order history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "loading"; // "loading" or "unloading"
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    // Need at least 2 characters to search
    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const tenantId = session.user.tenantId;
    const searchTerm = query.toLowerCase();

    // Query based on type
    if (type === "loading") {
      // Get unique loading addresses
      const results = await prisma.$queryRaw<
        Array<{ address: string; city: string | null; country: string; count: bigint }>
      >`
        SELECT
          origin as address,
          "originCity" as city,
          "originCountry" as country,
          COUNT(*) as count
        FROM "Order"
        WHERE "tenantId" = ${tenantId}
          AND (
            LOWER(origin) LIKE ${`%${searchTerm}%`}
            OR LOWER("originCity") LIKE ${`%${searchTerm}%`}
          )
        GROUP BY origin, "originCity", "originCountry"
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      const suggestions = results.map((r) => ({
        address: r.address,
        city: r.city,
        country: r.country,
        usageCount: Number(r.count),
      }));

      return NextResponse.json({ suggestions });
    } else {
      // Get unique unloading addresses
      const results = await prisma.$queryRaw<
        Array<{ address: string; city: string | null; country: string; count: bigint }>
      >`
        SELECT
          destination as address,
          "destinationCity" as city,
          "destinationCountry" as country,
          COUNT(*) as count
        FROM "Order"
        WHERE "tenantId" = ${tenantId}
          AND (
            LOWER(destination) LIKE ${`%${searchTerm}%`}
            OR LOWER("destinationCity") LIKE ${`%${searchTerm}%`}
          )
        GROUP BY destination, "destinationCity", "destinationCountry"
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      const suggestions = results.map((r) => ({
        address: r.address,
        city: r.city,
        country: r.country,
        usageCount: Number(r.count),
      }));

      return NextResponse.json({ suggestions });
    }
  } catch (error) {
    console.error("Error fetching address suggestions:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania sugestii adresow" },
      { status: 500 }
    );
  }
}
