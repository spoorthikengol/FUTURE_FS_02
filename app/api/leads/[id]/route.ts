import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveFollowUpStatus } from "@/lib/followups";
import { toFollowUpDTO, toLeadDTO, toNoteDTO } from "@/lib/serializers";
import { leadUpdateSchema } from "@/lib/validations";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";
import { Note } from "@/models/Note";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiSession(request);
    await connectDB();
    const { id } = await context.params;
    const lead = await Lead.findById(id).lean();
    if (!lead) return fail("Lead not found", 404);

    const [notes, followUps] = await Promise.all([
      Note.find({ leadId: id }).sort({ createdAt: -1 }).lean(),
      FollowUp.find({ leadId: id }).sort({ date: 1 }).lean(),
    ]);

    return ok({
      lead: toLeadDTO(lead),
      notes: notes.map(toNoteDTO),
      followUps: followUps.map((item) =>
        toFollowUpDTO({
          ...item,
          status: resolveFollowUpStatus(item.date, item.time, item.status),
        }),
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);
    await connectDB();
    const { id } = await context.params;
    const body = leadUpdateSchema.parse(await request.json());
    const lead = await Lead.findByIdAndUpdate(
      id,
      {
        ...body,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : body.followUpDate,
        lastContactedAt: body.lastContactedAt
          ? new Date(body.lastContactedAt)
          : body.lastContactedAt,
      },
      { new: true },
    );
    if (!lead) return fail("Lead not found", 404);
    await logActivity({
      leadId: id,
      type: "LEAD_UPDATED",
      description: `${session.name} updated ${lead.name} at ${lead.company}`,
    });
    return ok(toLeadDTO(lead));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);
    await connectDB();
    const { id } = await context.params;
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) return fail("Lead not found", 404);
    await Promise.all([
      Note.deleteMany({ leadId: id }),
      FollowUp.deleteMany({ leadId: id }),
    ]);
    await logActivity({
      type: "LEAD_UPDATED",
      description: `${session.name} deleted lead ${lead.name}`,
      metadata: { deleted: true, company: lead.company },
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
