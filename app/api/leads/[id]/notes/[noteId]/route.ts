import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toNoteDTO } from "@/lib/serializers";
import { noteSchema } from "@/lib/validations";
import { Note } from "@/models/Note";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> },
) {
  try {
    await requireApiSession(request);
    await connectDB();
    const { id, noteId } = await context.params;
    const { content } = noteSchema.parse(await request.json());
    const note = await Note.findOneAndUpdate(
      { _id: noteId, leadId: id },
      { content },
      { new: true },
    );
    if (!note) return fail("Note not found", 404);
    return ok(toNoteDTO(note));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> },
) {
  try {
    await requireApiSession(request);
    await connectDB();
    const { id, noteId } = await context.params;
    const note = await Note.findOneAndDelete({ _id: noteId, leadId: id });
    if (!note) return fail("Note not found", 404);
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
