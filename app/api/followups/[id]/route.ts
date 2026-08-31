import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireApiSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  followUpDueAt,
  resolveFollowUpStatus,
} from "@/lib/followups";
import { toFollowUpDTO } from "@/lib/serializers";
import { followUpUpdateSchema } from "@/lib/validations";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);

    await connectDB();

    const { id } = await context.params;

    const body = followUpUpdateSchema.parse(
      await request.json(),
    );

    const followUp = await FollowUp.findById(id);

    if (!followUp) {
      return fail("Follow-up not found", 404);
    }

    const lead = await Lead.findById(
      followUp.leadId,
    ).lean();

    if (!lead) {
      return fail("Lead not found", 404);
    }

    const oldDate = followUp.date;
    const oldTime = followUp.time;
    const oldStatus = followUp.status;
    const oldDescription = followUp.description;

    const dateChanged =
      body.date !== undefined &&
      body.date !== oldDate.toISOString().slice(0, 10);

    const timeChanged =
      body.time !== undefined &&
      body.time !== oldTime;

    const descriptionChanged =
      body.description !== undefined &&
      body.description !== oldDescription;

    const statusChanged =
      body.status !== undefined &&
      body.status !== oldStatus;

    if (
      body.date !== undefined ||
      body.time !== undefined
    ) {
      const dateValue = body.date ?? oldDate;
      const timeValue = body.time ?? oldTime;

      followUp.date = followUpDueAt(
        dateValue,
        timeValue,
      );

      followUp.time = timeValue;
    }

    if (body.description !== undefined) {
      followUp.description = body.description;
    }

    if (body.status !== undefined) {
      followUp.status = body.status;
    }

    if (followUp.status !== "COMPLETED") {
      followUp.status = resolveFollowUpStatus(
        followUp.date,
        followUp.time,
        followUp.status,
      );
    }

    await followUp.save();

    const newStatus = followUp.status;

    // Follow-up completed
    if (
      body.status === "COMPLETED" &&
      oldStatus !== "COMPLETED"
    ) {
      await logActivity({
        leadId: String(followUp.leadId),
        type: "FOLLOW_UP_COMPLETED",
        description:
          `${session.name} completed a follow-up for ${lead.company}`,
        metadata: {
          followUpId: String(followUp._id),
        },
      });
    }

    // Follow-up reopened
    if (
      oldStatus === "COMPLETED" &&
      body.status !== undefined &&
      body.status !== "COMPLETED"
    ) {
      await logActivity({
        leadId: String(followUp.leadId),
        type: "FOLLOW_UP_REOPENED",
        description:
          `${session.name} reopened a follow-up for ${lead.company}`,
        metadata: {
          followUpId: String(followUp._id),
          status: newStatus,
        },
      });
    }

    // Follow-up date/time changed
    if (
      (dateChanged || timeChanged) &&
      oldStatus !== "COMPLETED"
    ) {
      await logActivity({
        leadId: String(followUp.leadId),
        type: "FOLLOW_UP_UPDATED",
        description:
          `${session.name} rescheduled a follow-up for ${lead.company}`,
        metadata: {
          followUpId: String(followUp._id),
          previousDate: oldDate.toISOString(),
          previousTime: oldTime,
          newDate: followUp.date.toISOString(),
          newTime: followUp.time,
        },
      });
    }

    // Follow-up description changed
    if (
      descriptionChanged &&
      !dateChanged &&
      !timeChanged &&
      !statusChanged
    ) {
      await logActivity({
        leadId: String(followUp.leadId),
        type: "FOLLOW_UP_UPDATED",
        description:
          `${session.name} updated a follow-up for ${lead.company}`,
        metadata: {
          followUpId: String(followUp._id),
          change: "description",
        },
      });
    }

    return ok(toFollowUpDTO(followUp));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiSession(request);

    await connectDB();

    const { id } = await context.params;

    const followUp = await FollowUp.findById(id);

    if (!followUp) {
      return fail("Follow-up not found", 404);
    }

    const lead = await Lead.findById(
      followUp.leadId,
    ).lean();

    if (!lead) {
      return fail("Lead not found", 404);
    }

    const followUpId = String(followUp._id);
    const followUpDate = followUp.date.toISOString();
    const followUpTime = followUp.time;
    const description = followUp.description;

    await FollowUp.findByIdAndDelete(id);

    await logActivity({
      leadId: String(followUp.leadId),
      type: "FOLLOW_UP_DELETED",
      description:
        `${session.name} deleted a follow-up for ${lead.company}`,
      metadata: {
        followUpId,
        date: followUpDate,
        time: followUpTime,
        description,
        action: "deleted",
      },
    });

    return ok({
      message: "Follow-up deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}