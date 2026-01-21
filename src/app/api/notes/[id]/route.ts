import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { NoteType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/notes/[id] - Get single note
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const note = await prisma.note.findUnique({
      where: { id, tenantId },
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
        readBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Notatka nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Check access for private notes
    if (note.type === NoteType.PRIVATE) {
      const isAuthor = note.authorId === userId;
      const isRecipient = note.recipients.some((r) => r.userId === userId);
      if (!isAuthor && !isRecipient) {
        return NextResponse.json(
          { error: "Brak dostepu do tej notatki" },
          { status: 403 }
        );
      }
    }

    // Mark as read if not already
    const alreadyRead = note.readBy.some((r) => r.userId === userId);
    if (!alreadyRead) {
      await prisma.noteRead.create({
        data: {
          noteId: id,
          userId,
        },
      });
    }

    // Transform response
    const isRead = alreadyRead || true;
    const userReactions = note.reactions
      .filter((r) => r.userId === userId)
      .map((r) => r.type);

    const reactionsCount = note.reactions.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      ...note,
      isRead,
      userReactions,
      reactionsCount,
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania notatki" },
      { status: 500 }
    );
  }
}

// PUT /api/notes/[id] - Update note
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Get existing note
    const existingNote = await prisma.note.findUnique({
      where: { id, tenantId },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Notatka nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Check permissions - author or admin can edit
    const isAuthor = existingNote.authorId === userId;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole || "");

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Nie masz uprawnien do edycji tej notatki" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      priority,
      category,
      isPinned,
      isArchived,
      expiresAt,
    } = body;

    // Only admins can pin notes
    if (
      isPinned !== undefined &&
      isPinned !== existingNote.isPinned &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(userRole || "")
    ) {
      return NextResponse.json(
        { error: "Nie masz uprawnien do przypinania notatek" },
        { status: 403 }
      );
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        content: content !== undefined ? content : undefined,
        priority: priority !== undefined ? priority : undefined,
        category: category !== undefined ? category : undefined,
        isPinned: isPinned !== undefined ? isPinned : undefined,
        isArchived: isArchived !== undefined ? isArchived : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
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
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas aktualizacji notatki" },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete note
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Get existing note
    const existingNote = await prisma.note.findUnique({
      where: { id, tenantId },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Notatka nie zostala znaleziona" },
        { status: 404 }
      );
    }

    // Check permissions - author or admin can delete
    const isAuthor = existingNote.authorId === userId;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole || "");

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Nie masz uprawnien do usuniecia tej notatki" },
        { status: 403 }
      );
    }

    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas usuwania notatki" },
      { status: 500 }
    );
  }
}
