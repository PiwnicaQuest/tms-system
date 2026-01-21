import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { NoteType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/notes/[id]/comments - Add a comment to a note
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
    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Tresc komentarza jest wymagana" },
        { status: 400 }
      );
    }

    const comment = await prisma.noteComment.create({
      data: {
        noteId: id,
        authorId: userId,
        content,
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas dodawania komentarza" },
      { status: 500 }
    );
  }
}
