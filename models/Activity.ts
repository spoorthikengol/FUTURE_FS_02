import mongoose from "mongoose";
import { ACTIVITY_TYPES } from "@/types/crm";

const ActivitySchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ActivitySchema.index({ createdAt: -1 });

export type ActivityDocument = mongoose.InferSchemaType<typeof ActivitySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Activity =
  mongoose.models.Activity ||
  mongoose.model<ActivityDocument>("Activity", ActivitySchema);
