import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { followUpDueAt, resolveFollowUpStatus } from "@/lib/followups";
import { toFollowUpDTO } from "@/lib/serializers";
import { followUpUpdateSchema } from "@/lib/validations";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);
    await connectDB();
    const { id } = await context.params;
    const body = followUpUpdateSchema.parse(await request.json());
    const followUp = await FollowUp.findById(id);
    if (!followUp) return fail("Follow-up not found", 404);

    if (body.date || body.time) {
      const dateValue = body.date ?? followUp.date;
      const timeValue = body.time ?? followUp.time;
      followUp.date = followUpDueAt(dateValue, timeValue);
      followUp.time = timeValue;
    }
    if (body.description) followUp.description = body.description;
    if (body.status) followUp.status = body.status;
    if (followUp.status !== "COMPLETED") {
      followUp.status = resolveFollowUpStatus(followUp.date, followUp.time, followUp.status);
    }
    await followUp.save();

    if (body.status === "COMPLETED") {
      const lead = await Lead.findById(followUp.leadId);
      await logActivity({
        leadId: String(followUp.leadId),
        type: "FOLLOW_UP_COMPLETED",
        description: `${session.name} completed a follow-up${lead ? ` for ${lead.company}` : ""}`,
      });
    }

    return ok(toFollowUpDTO(followUp));
  } catch (error) {
    return handleError(error);
  }
}
