import { z } from "zod";
import { QUICK_ACTION_IDS } from "@/lib/ai/quick-action-meta";
import {
  FOLLOW_UP_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "@/types/crm";

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email");

export const loginSchema = z.object({
  email,
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    email,
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email,
  phone: z.string().trim().min(7, "Phone is required").max(40),
  company: z.string().trim().min(1, "Company is required").max(120),
  message: z.string().trim().min(8, "Message must be at least 8 characters").max(2000),
});

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  phone: z.string().trim().min(7).max(40),
  company: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().max(4000).optional().default(""),
  source: z.enum(LEAD_SOURCES).optional().default("Other"),
  status: z.enum(LEAD_STATUSES).optional().default("NEW"),
  value: z.coerce.number().min(0).optional().default(0),
  priority: z.enum(LEAD_PRIORITIES).optional().default("MEDIUM"),
  followUpDate: z.string().nullable().optional(),
  lastContactedAt: z.string().nullable().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const statusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export const noteSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const followUpSchema = z.object({
  date: z.string().min(8),
  time: z.string().min(4).max(8),
  description: z.string().trim().min(1).max(500),
  status: z.enum(FOLLOW_UP_STATUSES).optional().default("UPCOMING"),
});

export const followUpUpdateSchema = followUpSchema.partial();

export const aiEmailSchema = z.object({
  leadId: z.string().min(1),
  instruction: z.string().trim().max(500).optional(),
});

export const aiWhatsAppSchema = z.object({
  leadId: z.string().min(1),
  instruction: z.string().trim().max(500).optional(),
});

export const aiInsightsSchema = z.object({
  leadId: z.string().min(1),
});

export const aiQuickActionSchema = z.object({
  action: z.enum(QUICK_ACTION_IDS),
  leadId: z.string().min(1).optional(),
});

export const aiChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  leadId: z.string().optional(),
  intent: z.string().trim().max(64).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
});

export const settingsSchema = z.object({
  marketingSpend: z.coerce.number().min(0),
  slaThresholdMinutes: z.coerce.number().min(1).optional(),
  campaigns: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        source: z.enum(LEAD_SOURCES),
        spend: z.coerce.number().min(0),
        month: z.string().min(7),
      }),
    )
    .optional(),
});