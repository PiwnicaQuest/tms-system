import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/notes/templates - Get note templates
export async function GET() {
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

    const templates = await prisma.noteTemplate.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania szablonow" },
      { status: 500 }
    );
  }
}

// POST /api/notes/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const userRole = session.user.role;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    // Only admins and managers can create templates
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Nie masz uprawnien do tworzenia szablonow" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, content, category = "GENERAL" } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "Nazwa i tresc szablonu sa wymagane" },
        { status: 400 }
      );
    }

    const template = await prisma.noteTemplate.create({
      data: {
        tenantId,
        name,
        content,
        category,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia szablonu" },
      { status: 500 }
    );
  }
}
