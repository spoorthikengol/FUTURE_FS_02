import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { followUpDueAt } from "@/lib/followups";
import { toFollowUpDTO } from "@/lib/serializers";
import { followUpSchema } from "@/lib/validations";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";

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
    const body = followUpSchema.parse(await request.json());
    const date = followUpDueAt(body.date, body.time);
    const followUp = await FollowUp.create({
      leadId: id,
      date,
      time: body.time,
      description: body.description,
      status: body.status,
    });
    lead.followUpDate = date;
    await lead.save();
    await logActivity({
      leadId: id,
      type: "FOLLOW_UP_SCHEDULED",
      description: `${session.name} scheduled a follow-up with ${lead.name}`,
      metadata: { followUpId: String(followUp._id) },
    });
    return ok(toFollowUpDTO(followUp), 201);
  } catch (error) {
    return handleError(error);
  }
}
