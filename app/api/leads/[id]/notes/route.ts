import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toNoteDTO } from "@/lib/serializers";
import { noteSchema } from "@/lib/validations";
import { Lead } from "@/models/Lead";
import { Note } from "@/models/Note";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);
    await connectDB();
    const { id } = await context.params;
    const lead = await Lead.findById(id);
    if (!lead) return fail("Lead not found", 404);
    const { content } = noteSchema.parse(await request.json());
    const note = await Note.create({
      leadId: id,
      content,
      author: session.name,
    });
    await logActivity({
      leadId: id,
      type: "NOTE_ADDED",
      description: `${session.name} added a note on ${lead.company}`,
    });
    return ok(toNoteDTO(note), 201);
  } catch (error) {
    return handleError(error);
  }
}
