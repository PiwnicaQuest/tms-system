import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";

// Validation schemas
const userCreateSchema = z.object({
  email: z.string().email("Nieprawidlowy email"),
  name: z.string().optional(),
  password: z.string().min(8, "Haslo musi miec minimum 8 znakow"),
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
});

const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

// GET /api/users - List users in tenant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    // Check user role - only admins can list users
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do listy uzytkownikow" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedQuery = userQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe parametry zapytania",
          details: validatedQuery.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { page, limit, search, role, isActive } = validatedQuery.data;

    // Build where clause with tenant isolation
    const where: {
      tenantId: string;
      role?: UserRole;
      isActive?: boolean;
      OR?: Array<{
        email?: { contains: string; mode: "insensitive" };
        name?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      tenantId,
    };

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania uzytkownikow" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    // Check user role - only admins can create users
    const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do tworzenia uzytkownikow" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = userCreateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Uzytkownik o tym adresie email juz istnieje" },
        { status: 409 }
      );
    }

    // Prevent creating SUPER_ADMIN by non-super-admin
    if (
      validatedData.data.role === UserRole.SUPER_ADMIN &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Brak uprawnien do tworzenia Super Adminow" },
        { status: 403 }
      );
    }

    // Hash password
    const hashedPassword = await hash(validatedData.data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: validatedData.data.email,
        name: validatedData.data.name || null,
        password: hashedPassword,
        role: validatedData.data.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia uzytkownika" },
      { status: 500 }
    );
  }
}
