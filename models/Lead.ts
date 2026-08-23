import mongoose from "mongoose";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from "@/types/crm";

const LeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    jobTitle: { type: String, default: "", trim: true },
    message: { type: String, default: "" },
    source: { type: String, enum: LEAD_SOURCES, default: "Website" },
    status: { type: String, enum: LEAD_STATUSES, default: "NEW" },
    value: { type: Number, default: 0, min: 0 },
    priority: { type: String, enum: LEAD_PRIORITIES, default: "MEDIUM" },
    followUpDate: { type: Date, default: null },
    lastContactedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

LeadSchema.index({ status: 1, createdAt: -1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ company: 1 });
LeadSchema.index({ followUpDate: 1 });
LeadSchema.index({ name: "text", email: "text", company: "text" });

export type LeadDocument = mongoose.InferSchemaType<typeof LeadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Lead =
  mongoose.models.Lead || mongoose.model<LeadDocument>("Lead", LeadSchema);
