import mongoose from "mongoose";
import { FOLLOW_UP_STATUSES } from "@/types/crm";

const FollowUpSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    date: { type: Date, required: true, index: true },
    time: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: FOLLOW_UP_STATUSES, default: "UPCOMING" },
  },
  { timestamps: true },
);

FollowUpSchema.index({ leadId: 1, date: 1 });
FollowUpSchema.index({ status: 1, date: 1 });

export type FollowUpDocument = mongoose.InferSchemaType<typeof FollowUpSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FollowUp =
  mongoose.models.FollowUp ||
  mongoose.model<FollowUpDocument>("FollowUp", FollowUpSchema);
