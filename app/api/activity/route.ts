import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { Lead } from "@/models/Lead";

export async function GET(request: NextRequest) {
  try {
    await requireApiSession(request);
    await connectDB();
    const limit = Math.min(100, Number(request.nextUrl.searchParams.get("limit") ?? 40));
    const items = await Activity.find().sort({ createdAt: -1 }).limit(limit).lean();
    const leads = await Lead.find({
      _id: { $in: items.map((item) => item.leadId).filter(Boolean) },
    }).lean();
    const map = new Map(leads.map((lead) => [String(lead._id), lead]));

    return ok(
      items.map((item) => ({
        id: String(item._id),
        leadId: item.leadId ? String(item.leadId) : null,
        type: item.type,
        description: item.description,
        metadata: item.metadata ?? {},
        createdAt: item.createdAt.toISOString(),
        leadName: item.leadId ? map.get(String(item.leadId))?.name ?? null : null,
        company: item.leadId ? map.get(String(item.leadId))?.company ?? null : null,
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}
