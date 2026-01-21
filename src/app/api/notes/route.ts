import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { NoteType, NotePriority, NoteCategory, Prisma } from "@prisma/client";

// GET /api/notes - List notes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const userId = session.user.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") as NoteType | null;
    const priority = searchParams.get("priority") as NotePriority | null;
    const category = searchParams.get("category") as NoteCategory | null;
    const archived = searchParams.get("archived") === "true";
    const unreadOnly = searchParams.get("unread") === "true";
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.NoteWhereInput = {
      tenantId,
      isArchived: archived,
      OR: [
        // Public notes (GENERAL, ANNOUNCEMENT)
        { type: NoteType.GENERAL },
        { type: NoteType.ANNOUNCEMENT },
        // Private notes where user is author
        { type: NoteType.PRIVATE, authorId: userId },
        // Private notes where user is recipient
        {
          type: NoteType.PRIVATE,
          recipients: {
            some: { userId },
          },
        },
        // Entity-linked notes
        { type: NoteType.ENTITY_LINKED },
      ],
    };

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Get notes with read status
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          readBy: {
            where: { userId },
            select: { readAt: true },
          },
          reactions: {
            select: {
              type: true,
              userId: true,
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
        orderBy: [
          { isPinned: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.note.count({ where }),
    ]);

    // Transform notes to include isRead flag
    const transformedNotes = notes.map((note) => ({
      ...note,
      isRead: note.readBy.length > 0,
      readAt: note.readBy[0]?.readAt || null,
      readBy: undefined, // Remove the full readBy array
      commentsCount: note._count.comments,
      attachmentsCount: note._count.attachments,
      _count: undefined,
      // Aggregate reactions
      reactionsCount: note.reactions.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      userReactions: note.reactions
        .filter((r) => r.userId === userId)
        .map((r) => r.type),
      reactions: undefined,
    }));

    // Filter unread if requested
    const finalNotes = unreadOnly
      ? transformedNotes.filter((n) => !n.isRead)
      : transformedNotes;

    return NextResponse.json({
      notes: finalNotes,
      pagination: {
        page,
        limit,
        total: unreadOnly ? finalNotes.length : total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania notatek" },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const userId = session.user.id;
    const userRole = session.user.role;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      type = "GENERAL",
      priority = "NORMAL",
      category = "GENERAL",
      isPinned = false,
      recipientIds,
      entityType,
      entityId,
      expiresAt,
    } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Tresc notatki jest wymagana" },
        { status: 400 }
      );
    }

    // Only admins can create announcements
    if (type === "ANNOUNCEMENT" && !["ADMIN", "SUPER_ADMIN"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Tylko administratorzy moga tworzyc ogloszenia" },
        { status: 403 }
      );
    }

    // Only admins can pin notes
    if (isPinned && !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Nie masz uprawnien do przypinania notatek" },
        { status: 403 }
      );
    }

    // For private notes, recipients are required
    if (type === "PRIVATE" && (!recipientIds || recipientIds.length === 0)) {
      return NextResponse.json(
        { error: "Notatka prywatna wymaga wybrania odbiorcow" },
        { status: 400 }
      );
    }

    // Create note with recipients
    const note = await prisma.note.create({
      data: {
        tenantId,
        authorId: userId,
        title,
        content,
        type,
        priority,
        category,
        isPinned,
        entityType,
        entityId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        recipients:
          type === "PRIVATE" && recipientIds
            ? {
                create: recipientIds.map((recipientId: string) => ({
                  userId: recipientId,
                })),
              }
            : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas tworzenia notatki" },
      { status: 500 }
    );
  }
}
