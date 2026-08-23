import { Activity } from "@/models/Activity";
import type { ActivityType } from "@/types/crm";
import mongoose from "mongoose";

export async function logActivity(input: {
  leadId?: string | null;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  await Activity.create({
    leadId: input.leadId ? new mongoose.Types.ObjectId(input.leadId) : null,
    type: input.type,
    description: input.description,
    metadata: input.metadata ?? {},
  });
}
