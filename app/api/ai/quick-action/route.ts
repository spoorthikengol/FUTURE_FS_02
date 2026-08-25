import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { buildCrmSnapshot } from "@/lib/ai/context";
import { runQuickAction } from "@/lib/ai/quick-actions";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { aiQuickActionSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    await requireApiSession(request);
    const limited = rateLimit(`ai:${clientIp(request)}`, 30, 10 * 60 * 1000);
    if (!limited.ok) return fail("Too many AI requests", 429);

    await connectDB();
    const { action, leadId } = aiQuickActionSchema.parse(await request.json());

    const snapshot = await buildCrmSnapshot();
    const lead = leadId ? (snapshot.leads.find((item) => item.lead.id === leadId) ?? null) : null;
    if (leadId && !lead) return fail("Lead not found", 404);

    return ok(runQuickAction(action, snapshot, lead));
  } catch (error) {
    return handleError(error);
  }
}
