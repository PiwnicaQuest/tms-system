import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { NoteType } from "@prisma/client";

// GET /api/notes/unread-count - Get count of unread notes
export async function GET() {
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

    // Get all notes user can see
    const notes = await prisma.note.findMany({
      where: {
        tenantId,
        isArchived: false,
        OR: [
          { type: NoteType.GENERAL },
          { type: NoteType.ANNOUNCEMENT },
          { type: NoteType.PRIVATE, authorId: userId },
          {
            type: NoteType.PRIVATE,
            recipients: {
              some: { userId },
            },
          },
          { type: NoteType.ENTITY_LINKED },
        ],
      },
      select: {
        id: true,
        readBy: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    // Count unread notes
    const unreadCount = notes.filter((note) => note.readBy.length === 0).length;

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania liczby nieprzeczytanych notatek" },
      { status: 500 }
    );
  }
}
