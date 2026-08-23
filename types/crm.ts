export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "CONVERTED",
  "LOST",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "Website",
  "LinkedIn",
  "Referral",
  "Google",
  "Instagram",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const FOLLOW_UP_STATUSES = ["UPCOMING", "OVERDUE", "COMPLETED"] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "STATUS_CHANGED",
  "NOTE_ADDED",
  "FOLLOW_UP_SCHEDULED",
  "FOLLOW_UP_COMPLETED",
  "LEAD_CONVERTED",
  "AI_EMAIL_GENERATED",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager";
};

export type LeadDTO = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  value: number;
  priority: LeadPriority;
  followUpDate: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteDTO = {
  id: string;
  leadId: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
};

export type FollowUpDTO = {
  id: string;
  leadId: string;
  date: string;
  time: string;
  description: string;
  status: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
};

export type ActivityDTO = {
  id: string;
  leadId: string | null;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
