import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const contractorSchema = z.object({
  type: z.enum(["CLIENT", "CARRIER", "BOTH"]),
  name: z.string().min(1, "Nazwa jest wymagana"),
  shortName: z.string().optional(),
  nip: z.string().optional(),
  regon: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("PL"),
  // Adres korespondencyjny
  corrAddress: z.string().optional(),
  corrCity: z.string().optional(),
  corrPostalCode: z.string().optional(),
  corrCountry: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  paymentDays: z.number().int().positive().default(14),
  creditLimit: z.number().positive().optional(),
  notes: z.string().optional(),
});

// GET /api/contractors - List contractors
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
      isActive: true,
    };

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { shortName: { contains: search, mode: "insensitive" } },
        { nip: { contains: search } },
      ];
    }

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contractor.count({ where }),
    ]);

    return NextResponse.json({
      data: contractors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching contractors:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/contractors - Create contractor
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = contractorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const contractor = await prisma.contractor.create({
      data: {
        ...parsed.data,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json(contractor, { status: 201 });
  } catch (error) {
    console.error("Error creating contractor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
