import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toLeadDTO } from "@/lib/serializers";
import { statusSchema } from "@/lib/validations";
import { Lead } from "@/models/Lead";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);
    await connectDB();
    const { id } = await context.params;
    const { status } = statusSchema.parse(await request.json());
    const existing = await Lead.findById(id);
    if (!existing) return fail("Lead not found", 404);
    const previous = existing.status;
    existing.status = status;
    if (status !== "NEW") existing.lastContactedAt = new Date();
    await existing.save();

    await logActivity({
      leadId: id,
      type: status === "CONVERTED" ? "LEAD_CONVERTED" : "STATUS_CHANGED",
      description:
        status === "CONVERTED"
          ? `${session.name} converted ${existing.company}`
          : `${session.name} moved ${existing.company} from ${previous} → ${status}`,
      metadata: { from: previous, to: status },
    });

    return ok(toLeadDTO(existing));
  } catch (error) {
    return handleError(error);
  }
}
