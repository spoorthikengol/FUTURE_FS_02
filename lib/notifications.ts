import { connectDB } from "@/lib/db";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";
import { Notification } from "@/models/Notification";
import { resolveFollowUpStatus } from "@/lib/followups";

export async function createFollowUpNotifications(userId: string) {
  await connectDB();

  const followUps = await FollowUp.find({
    status: { $ne: "COMPLETED" },
  })
    .sort({ date: 1 })
    .lean();

  if (followUps.length === 0) {
    return;
  }

  const leadIds = [
    ...new Set(
      followUps.map((followUp) =>
        String(followUp.leadId),
      ),
    ),
  ];

  const leads = await Lead.find({
    _id: { $in: leadIds },
  })
    .select("_id name company")
    .lean();

  const leadMap = new Map(
    leads.map((lead) => [
      String(lead._id),
      lead,
    ]),
  );

  const notifications = [];

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

    const lead = leadMap.get(
      String(followUp.leadId),
    );

    if (!lead) {
      continue;
    }

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

    const existing = await Notification.findOne({
      userId,
      type,
      message,
      read: false,
    })
      .select("_id")
      .lean();

    if (existing) {
      continue;
    }

    notifications.push({
      userId,
      type,
      title,
      message,
      read: false,

      // IMPORTANT:
      // Open Follow-ups page with the exact follow-up ID.
      link: `/followups?followUpId=${String(
        followUp._id,
      )}`,
    });
  }

  if (notifications.length > 0) {
    await Notification.insertMany(
      notifications,
    );
  }
}