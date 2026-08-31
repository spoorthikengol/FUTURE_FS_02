import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { getSpeedToLeadReport } from "@/lib/analytics/speed-to-lead";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireApiSession(request);
    await connectDB();
    return ok(await getSpeedToLeadReport());
  } catch (error) {
    return handleError(error);
  }
}