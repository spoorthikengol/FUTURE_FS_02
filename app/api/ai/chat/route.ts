import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { generateAssistantReply } from "@/lib/ai/service";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toLeadDTO } from "@/lib/serializers";
import { aiChatSchema } from "@/lib/validations";
import { Lead } from "@/models/Lead";

export async function POST(request: NextRequest) {
  try {
    await requireApiSession(request);
    const limited = rateLimit(`ai:${clientIp(request)}`, 40, 10 * 60 * 1000);
    if (!limited.ok) return fail("Too many AI requests", 429);
    await connectDB();
    const body = aiChatSchema.parse(await request.json());
    const lead = body.leadId ? await Lead.findById(body.leadId) : null;
    return ok(
      await generateAssistantReply({
        message: body.message,
        lead: lead ? toLeadDTO(lead) : null,
        history: body.history,
        intent: body.intent ?? null,
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
