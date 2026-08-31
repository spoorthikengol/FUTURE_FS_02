import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { createFollowUpNotifications } from "@/lib/notifications";
import { Notification } from "@/models/Notification";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiSession(request);

    await connectDB();

    await createFollowUpNotifications(session.id);

    const notifications = await Notification.find({
      userId: session.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.reduce(
      (count, notification) =>
        count + (notification.read ? 0 : 1),
      0,
    );

    return ok({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return handleError(error);
  }
}