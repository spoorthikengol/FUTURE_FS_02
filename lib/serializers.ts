import type { FollowUpDTO, LeadDTO, NoteDTO } from "@/types/crm";

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toLeadDTO(lead: {
  _id: unknown;
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle?: string;
  message?: string;
  source: LeadDTO["source"];
  status: LeadDTO["status"];
  value: number;
  priority: LeadDTO["priority"];
  followUpDate?: Date | null;
  lastContactedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): LeadDTO {
  return {
    id: String(lead._id),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.jobTitle ?? "",
    message: lead.message ?? "",
    source: lead.source,
    status: lead.status,
    value: lead.value,
    priority: lead.priority,
    followUpDate: iso(lead.followUpDate),
    lastContactedAt: iso(lead.lastContactedAt),
    createdAt: iso(lead.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(lead.updatedAt) ?? new Date().toISOString(),
  };
}

export function toNoteDTO(note: {
  _id: unknown;
  leadId: unknown;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}): NoteDTO {
  return {
    id: String(note._id),
    leadId: String(note.leadId),
    content: note.content,
    author: note.author,
    createdAt: iso(note.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(note.updatedAt) ?? new Date().toISOString(),
  };
}

export function toFollowUpDTO(item: {
  _id: unknown;
  leadId: unknown;
  date: Date;
  time: string;
  description: string;
  status: FollowUpDTO["status"];
  createdAt: Date;
  updatedAt: Date;
}): FollowUpDTO {
  return {
    id: String(item._id),
    leadId: String(item.leadId),
    date: iso(item.date) ?? new Date().toISOString(),
    time: item.time,
    description: item.description,
    status: item.status,
    createdAt: iso(item.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(item.updatedAt) ?? new Date().toISOString(),
  };
}
