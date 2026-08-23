import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { getAnalytics } from "@/lib/analytics/metrics";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireApiSession(request);
    await connectDB();
    return ok(await getAnalytics());
  } catch (error) {
    return handleError(error);
  }
}
