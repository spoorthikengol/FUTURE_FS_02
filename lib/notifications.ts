import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";
import { resolveFollowUpStatus } from "@/lib/followups";

export async function createFollowUpNotifications(
  userId: string,
) {
  await connectDB();

  const followUps = await FollowUp.find()
    .sort({ date: 1 })
    .lean();

  for (const followUp of followUps) {
    const status = resolveFollowUpStatus(
      followUp.date,
      followUp.time,
      followUp.status,
    );

    if (
      status !== "UPCOMING" &&
      status !== "OVERDUE"
    ) {
      continue;
    }

    const lead = await Lead.findById(
      followUp.leadId,
    ).lean();

    if (!lead) continue;

    const type =
      status === "OVERDUE"
        ? "FOLLOW_UP_OVERDUE"
        : "FOLLOW_UP_DUE";

    const title =
      status === "OVERDUE"
        ? "Follow-up overdue"
        : "Follow-up due";

    const message =
      status === "OVERDUE"
        ? `Follow-up with ${lead.name} at ${lead.company} is overdue.`
        : `Follow-up with ${lead.name} at ${lead.company} is coming up.`;

    const existing =
      await Notification.findOne({
        userId,
        type,
        message,
        read: false,
      });

    if (existing) continue;

    await Notification.create({
      userId,
      type,
      title,
      message,
      read: false,
      link: `/leads/${lead._id}`,
    });
  }
}