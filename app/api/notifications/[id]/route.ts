import { NextRequest } from "next/server";
import { handleError, ok, fail } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);
    await connectDB();

    const { id } = await context.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: session.id,
      },
      {
        read: true,
      },
      {
        new: true,
      },
    ).lean();

    if (!notification) {
      return fail("Notification not found", 404);
    }

    return ok(notification);
  } catch (error) {
    return handleError(error);
  }
}