import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { generateLeadInsights } from "@/lib/ai/service";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toLeadDTO } from "@/lib/serializers";
import { aiInsightsSchema } from "@/lib/validations";
import { Lead } from "@/models/Lead";

export async function POST(request: NextRequest) {
  try {
    await requireApiSession(request);
    const limited = rateLimit(`ai:${clientIp(request)}`, 30, 10 * 60 * 1000);
    if (!limited.ok) return fail("Too many AI requests", 429);
    await connectDB();
    const { leadId } = aiInsightsSchema.parse(await request.json());
    const lead = await Lead.findById(leadId);
    if (!lead) return fail("Lead not found", 404);
    return ok(await generateLeadInsights(toLeadDTO(lead)));
  } catch (error) {
    return handleError(error);
  }
}
