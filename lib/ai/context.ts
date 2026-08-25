import { getAnalytics } from "@/lib/analytics/metrics";
import { resolveFollowUpStatus } from "@/lib/followups";
import { toLeadDTO } from "@/lib/serializers";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";
import { Note } from "@/models/Note";
import type { LeadDTO } from "@/types/crm";

export type LeadQuality = "High Potential" | "Promising" | "Needs Nurture" | "At Risk";

export const HIGH_VALUE_THRESHOLD = 40000;

/**
 * Shared lead-scoring heuristic. Extracted so both the per-lead AI insights
 * endpoint and the CRM-wide assistant context use the exact same formula --
 * scores must never drift between the two surfaces.
 */
function statusScore(status: LeadDTO["status"]) {
  const map: Record<LeadDTO["status"], number> = {
    NEW: 18,
    CONTACTED: 28,
    QUALIFIED: 42,
    PROPOSAL: 52,
    CONVERTED: 72,
    LOST: 8,
  };
  return map[status];
}

export function computeLeadScore(lead: LeadDTO, notesCount: number, overdueFollowUps: number) {
  let score = statusScore(lead.status);
  score += Math.min(20, Math.round(lead.value / 8000));
  if (lead.priority === "URGENT") score += 8;
  if (lead.priority === "HIGH") score += 5;
  if (lead.priority === "LOW") score -= 4;
  if (notesCount >= 2) score += 6;
  if (lead.message.length > 40) score += 4;
  if (overdueFollowUps > 0) score -= 12;
  if (!lead.lastContactedAt && lead.status !== "NEW") score -= 6;
  if (lead.source === "Referral" || lead.source === "LinkedIn") score += 4;
  return Math.max(8, Math.min(96, score));
}

export function qualityFromScore(status: LeadDTO["status"], score: number): LeadQuality {
  if (status === "LOST") return "At Risk";
  if (score >= 75) return "High Potential";
  if (score >= 55) return "Promising";
  return "Needs Nurture";
}

export function recommendedActionFor(lead: LeadDTO, overdueFollowUps: number) {
  if (overdueFollowUps > 0) {
    return "Recover the overdue follow-up within 24 hours before intent cools.";
  }
  switch (lead.status) {
    case "NEW":
      return "Make first contact today and confirm budget, timeline, and owner.";
    case "PROPOSAL":
      return "Schedule a decision checkpoint and address remaining objections.";
    case "QUALIFIED":
      return "Send a tailored proposal with clear next steps and value proof.";
    case "CONVERTED":
      return "Plan onboarding and identify expansion opportunities.";
    default:
      return "Send a concise check-in that references their original request.";
  }
}

export function insightFactorsFor(lead: LeadDTO, overdueFollowUps: number, notesCount: number) {
  return [
    {
      label: "Pipeline stage",
      impact: (lead.status === "LOST" ? "negative" : lead.status === "NEW" ? "neutral" : "positive") as
        | "positive"
        | "neutral"
        | "negative",
      detail: `Current status is ${lead.status}.`,
    },
    {
      label: "Lead value",
      impact: (lead.value >= HIGH_VALUE_THRESHOLD
        ? "positive"
        : lead.value >= 15000
          ? "neutral"
          : "negative") as "positive" | "neutral" | "negative",
      detail: `Estimated value is $${lead.value.toLocaleString()}.`,
    },
    {
      label: "Follow-up hygiene",
      impact: (overdueFollowUps ? "negative" : "positive") as "positive" | "neutral" | "negative",
      detail: overdueFollowUps
        ? "Overdue tasks reduce conversion probability."
        : "Scheduled follow-ups are in good shape.",
    },
    {
      label: "Context depth",
      impact: (notesCount + (lead.message ? 1 : 0) >= 2 ? "positive" : "neutral") as
        | "positive"
        | "neutral"
        | "negative",
      detail: "Notes and original message inform personalization quality.",
    },
  ];
}

export type LeadSnapshot = {
  lead: LeadDTO;
  score: number;
  quality: LeadQuality;
  notesCount: number;
  overdueFollowUps: number;
  upcomingFollowUps: number;
  nextFollowUpAt: string | null;
  daysSinceCreated: number;
  daysSinceContact: number | null;
};

export type CrmSnapshot = {
  generatedAt: string;
  leads: LeadSnapshot[];
  totalLeads: number;
  openPipelineValue: number;
  openPipelineCount: number;
  valueByStatus: Record<LeadDTO["status"], number>;
  analytics: Awaited<ReturnType<typeof getAnalytics>>;
};

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Builds a single, consistent snapshot of the live CRM data (leads, scores,
 * follow-up hygiene, and analytics) for the AI assistant to reason over.
 * Every number the assistant surfaces should trace back to this snapshot --
 * never to model-invented figures.
 */
export async function buildCrmSnapshot(): Promise<CrmSnapshot> {
  const [leadDocs, followUps, noteAgg, analytics] = await Promise.all([
    Lead.find().sort({ createdAt: -1 }).lean(),
    FollowUp.find().lean(),
    Note.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$leadId", count: { $sum: 1 } } },
    ]),
    getAnalytics(),
  ]);

  const noteCountMap = new Map<string, number>(
    noteAgg.map((row) => [String(row._id), row.count]),
  );

  const followUpsByLead = new Map<string, typeof followUps>();
  for (const item of followUps) {
    const key = String(item.leadId);
    const list = followUpsByLead.get(key) ?? [];
    list.push(item);
    followUpsByLead.set(key, list);
  }

  const now = Date.now();
  const leads: LeadSnapshot[] = leadDocs.map((doc) => {
    const dto = toLeadDTO(doc);
    const leadFollowUps = followUpsByLead.get(dto.id) ?? [];
    const resolved = leadFollowUps.map((item) =>
      resolveFollowUpStatus(item.date, item.time, item.status),
    );
    const overdueFollowUps = resolved.filter((status) => status === "OVERDUE").length;
    const upcomingFollowUps = resolved.filter((status) => status === "UPCOMING").length;
    const nextUpcoming = leadFollowUps
      .filter((_, index) => resolved[index] === "UPCOMING")
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
    const notesCount = noteCountMap.get(dto.id) ?? 0;
    const score = computeLeadScore(dto, notesCount, overdueFollowUps);
    const quality = qualityFromScore(dto.status, score);

    return {
      lead: dto,
      score,
      quality,
      notesCount,
      overdueFollowUps,
      upcomingFollowUps,
      nextFollowUpAt: nextUpcoming ? new Date(nextUpcoming.date).toISOString() : null,
      daysSinceCreated: Math.max(0, Math.floor((now - new Date(dto.createdAt).getTime()) / 86400000)),
      daysSinceContact: dto.lastContactedAt
        ? Math.max(0, Math.floor((now - new Date(dto.lastContactedAt).getTime()) / 86400000))
        : null,
    };
  });

  const openLeads = leads.filter(
    (item) => item.lead.status !== "CONVERTED" && item.lead.status !== "LOST",
  );
  const openPipelineValue = openLeads.reduce((sum, item) => sum + item.lead.value, 0);

  const valueByStatus = leads.reduce(
    (acc, item) => {
      acc[item.lead.status] = (acc[item.lead.status] ?? 0) + item.lead.value;
      return acc;
    },
    {} as Record<LeadDTO["status"], number>,
  );

  return {
    generatedAt: new Date().toISOString(),
    leads,
    totalLeads: leads.length,
    openPipelineValue,
    openPipelineCount: openLeads.length,
    valueByStatus,
    analytics,
  };
}

export function leadsToContactToday(snapshot: CrmSnapshot) {
  return snapshot.leads.filter((item) => {
    if (item.overdueFollowUps > 0) return true;
    if (item.nextFollowUpAt && isToday(new Date(item.nextFollowUpAt))) return true;
    if (item.lead.status === "NEW" && !item.lead.lastContactedAt) return true;
    return false;
  });
}
