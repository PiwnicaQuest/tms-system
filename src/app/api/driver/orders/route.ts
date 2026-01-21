import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/driver/orders:
 *   get:
 *     summary: Pobierz zlecenia przypisane do kierowcy
 *     tags: [Driver]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista zleceń kierowcy
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch orders assigned to this driver
    const orders = await prisma.order.findMany({
      where: {
        driverId: session.user.id,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      orderBy: [
        { loadingDate: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        orderNumber: true,
        status: true,
        loadingAddress: true,
        loadingDate: true,
        loadingContact: true,
        loadingPhone: true,
        unloadingAddress: true,
        unloadingDate: true,
        unloadingContact: true,
        unloadingPhone: true,
        cargoDescription: true,
        cargoWeight: true,
        cargoVolume: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching driver orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
