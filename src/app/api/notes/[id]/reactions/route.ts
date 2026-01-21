import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { NoteType, ReactionType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/notes/[id]/reactions - Toggle a reaction on a note
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check note exists and user has access
    const note = await prisma.note.findUnique({
      where: { id, tenantId },
      include: {
        recipients: true,
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

    const body = await request.json();
    const { type } = body;

    if (!type || !Object.values(ReactionType).includes(type)) {
      return NextResponse.json(
        { error: "Nieprawidlowy typ reakcji" },
        { status: 400 }
      );
    }

    // Check if reaction exists
    const existingReaction = await prisma.noteReaction.findUnique({
      where: {
        noteId_userId_type: {
          noteId: id,
          userId,
          type,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction (toggle off)
      await prisma.noteReaction.delete({
        where: { id: existingReaction.id },
      });

      return NextResponse.json({ action: "removed", type });
    } else {
      // Add reaction (toggle on)
      await prisma.noteReaction.create({
        data: {
          noteId: id,
          userId,
          type,
        },
      });

      return NextResponse.json({ action: "added", type });
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas dodawania reakcji" },
      { status: 500 }
    );
  }
}
