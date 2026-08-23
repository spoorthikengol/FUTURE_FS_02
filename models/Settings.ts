import mongoose from "mongoose";
import { LEAD_SOURCES, type LeadSource } from "@/types/crm";

export type Campaign = {
  id: string;
  name: string;
  source: LeadSource;
  spend: number;
  month: string;
};

const CampaignSchema = new mongoose.Schema<Campaign>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    source: { type: String, enum: LEAD_SOURCES, required: true },
    spend: { type: Number, required: true, min: 0 },
    month: { type: String, required: true },
  },
  { _id: false },
);

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    marketingSpend: { type: Number, default: 48500 },
    campaigns: { type: [CampaignSchema], default: [] },
  },
  { timestamps: true },
);

export type SettingsDocument = mongoose.InferSchemaType<typeof SettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Settings =
  mongoose.models.Settings ||
  mongoose.model<SettingsDocument>("Settings", SettingsSchema);