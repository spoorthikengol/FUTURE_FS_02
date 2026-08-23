import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveFollowUpStatus } from "@/lib/followups";
import { toFollowUpDTO } from "@/lib/serializers";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";

export async function GET(request: NextRequest) {
  try {
    await requireApiSession(request);
    await connectDB();
    const followUps = await FollowUp.find().sort({ date: 1 }).lean();
    const leads = await Lead.find({
      _id: { $in: followUps.map((item) => item.leadId) },
    }).lean();
    const leadMap = new Map(leads.map((lead) => [String(lead._id), lead]));

    return ok(
      followUps.map((item) => ({
        ...toFollowUpDTO({
          ...item,
          status: resolveFollowUpStatus(item.date, item.time, item.status),
        }),
        leadName: leadMap.get(String(item.leadId))?.name ?? "Unknown",
        company: leadMap.get(String(item.leadId))?.company ?? "",
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}
