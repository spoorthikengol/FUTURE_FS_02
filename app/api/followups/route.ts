import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  resolveFollowUpStatus,
} from "@/lib/followups";
import { toFollowUpDTO } from "@/lib/serializers";
import { FollowUp } from "@/models/FollowUp";

export async function GET(
  request: NextRequest,
) {
  try {
    await requireApiSession(request);
    await connectDB();

    const followUps =
      await FollowUp.find()
        .sort({ date: 1, time: 1 })
        .lean();

    const data = followUps.map((item) => ({
      ...toFollowUpDTO(item),
      status: resolveFollowUpStatus(
        item.date,
        item.time,
        item.status,
      ),
    }));

    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}