import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { generateLeadEmail } from "@/lib/ai/service";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toLeadDTO } from "@/lib/serializers";
import { aiEmailSchema } from "@/lib/validations";
import { Lead } from "@/models/Lead";

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiSession(request);
    const limited = rateLimit(`ai:${clientIp(request)}`, 30, 10 * 60 * 1000);
    if (!limited.ok) return fail("Too many AI requests", 429);

    await connectDB();
    const { leadId, instruction } = aiEmailSchema.parse(await request.json());
    const lead = await Lead.findById(leadId);
    if (!lead) return fail("Lead not found", 404);

    const email = await generateLeadEmail(toLeadDTO(lead), instruction);
    await logActivity({
      leadId,
      type: "AI_EMAIL_GENERATED",
      description: `${session.name} generated an AI email for ${lead.name}`,
    });
    return ok(email);
  } catch (error) {
    return handleError(error);
  }
}
