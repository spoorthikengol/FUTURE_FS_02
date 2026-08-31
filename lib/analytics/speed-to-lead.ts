import { Activity } from "@/models/Activity";
import { Lead } from "@/models/Lead";
import { Settings } from "@/models/Settings";
import type { ActivityType, LeadStatus } from "@/types/crm";

// Activity types that count as a "meaningful first response" to a lead.
// LEAD_CONVERTED is included alongside STATUS_CHANGED because the status
// route (app/api/leads/[id]/status/route.ts) logs LEAD_CONVERTED instead
// of STATUS_CHANGED specifically for the CONVERTED transition — without
// it, a lead converted directly would never register a response.
export const MEANINGFUL_RESPONSE_TYPES: ActivityType[] = [
  "STATUS_CHANGED",
  "NOTE_ADDED",
  "FOLLOW_UP_COMPLETED",
  "LEAD_CONVERTED",
];

export const DEFAULT_SLA_THRESHOLD_MINUTES = 5;

// Statuses for which a lead with no logged response is treated as an
// outright SLA miss rather than "still waiting" — the outcome is already
// final, so there is no more time left for a response to arrive.
const TERMINAL_STATUSES_WITHOUT_WAIT: LeadStatus[] = ["LOST", "CONVERTED"];

export type SpeedToLeadState = "ON_TIME" | "LATE" | "AWAITING" | "BREACHED";

export type SpeedToLeadLead = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  createdAt: string;
  firstResponseAt: string | null;
  responseMinutes: number | null;
  state: SpeedToLeadState;
};

export type SpeedToLeadSummary = {
  totalLeads: number;
  respondedCount: number;
  onTimeCount: number;
  lateCount: number;
  waitingCount: number;
  breachedCount: number;
  averageMinutes: number | null;
  medianMinutes: number | null;
  fastestMinutes: number | null;
  slowestMinutes: number | null;
  slaCompliancePercent: number | null;
};

export type SpeedToLeadReport = {
  generatedAt: string;
  thresholdMinutes: number;
  summary: SpeedToLeadSummary;
  leads: SpeedToLeadLead[];
};

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function getSlaThresholdMinutes(): Promise<number> {
  const settings = await Settings.findOne({ key: "default" }).lean();
  return settings?.slaThresholdMinutes ?? DEFAULT_SLA_THRESHOLD_MINUTES;
}

export async function getSpeedToLeadReport(): Promise<SpeedToLeadReport> {
  const [leads, activities, thresholdMinutes] = await Promise.all([
    Lead.find().select({ name: 1, company: 1, status: 1, createdAt: 1 }).lean(),
    Activity.find({ type: { $in: MEANINGFUL_RESPONSE_TYPES } })
      .select({ leadId: 1, type: 1, createdAt: 1 })
      .lean(),
    getSlaThresholdMinutes(),
  ]);

  const activitiesByLead = new Map<string, Date[]>();
  for (const activity of activities) {
    if (!activity.leadId) continue;
    const key = String(activity.leadId);
    const bucket = activitiesByLead.get(key) ?? [];
    bucket.push(activity.createdAt);
    activitiesByLead.set(key, bucket);
  }

  const now = Date.now();

  const resolved: SpeedToLeadLead[] = leads.map((lead) => {
    const leadId = String(lead._id);
    const createdAt = lead.createdAt;
    const candidates = (activitiesByLead.get(leadId) ?? []).filter(
      (timestamp) => timestamp.getTime() > createdAt.getTime(),
    );

    let firstResponseAt: Date | null = null;
    for (const timestamp of candidates) {
      if (!firstResponseAt || timestamp.getTime() < firstResponseAt.getTime()) {
        firstResponseAt = timestamp;
      }
    }

    let responseMinutes: number | null = null;
    let state: SpeedToLeadState;

    if (firstResponseAt) {
      responseMinutes = Math.floor(
        (firstResponseAt.getTime() - createdAt.getTime()) / 60000,
      );
      state = responseMinutes <= thresholdMinutes ? "ON_TIME" : "LATE";
    } else if (TERMINAL_STATUSES_WITHOUT_WAIT.includes(lead.status as LeadStatus)) {
      // Closed (won or lost) with no logged response — the outcome is
      // final, so this is an SLA miss, not something still "awaiting".
      state = "BREACHED";
    } else {
      const elapsedMinutes = (now - createdAt.getTime()) / 60000;
      state = elapsedMinutes > thresholdMinutes ? "BREACHED" : "AWAITING";
    }

    return {
      id: leadId,
      name: lead.name,
      company: lead.company,
      status: lead.status as LeadStatus,
      createdAt: createdAt.toISOString(),
      firstResponseAt: firstResponseAt ? firstResponseAt.toISOString() : null,
      responseMinutes,
      state,
    };
  });

  const onTime = resolved.filter((lead) => lead.state === "ON_TIME");
  const late = resolved.filter((lead) => lead.state === "LATE");
  const waiting = resolved.filter((lead) => lead.state === "AWAITING");
  const breached = resolved.filter((lead) => lead.state === "BREACHED");
  const responded = [...onTime, ...late];

  const responseMinutesList = responded
    .map((lead) => lead.responseMinutes)
    .filter((value): value is number => value !== null);

  // SLA compliance counts every lead whose outcome is already decided —
  // responded on time, responded late, or breached while still waiting —
  // as either compliant (on time) or not. Leads still within the
  // threshold window (AWAITING) are excluded since their outcome isn't
  // determined yet.
  const decidedCount = onTime.length + late.length + breached.length;

  const summary: SpeedToLeadSummary = {
    totalLeads: resolved.length,
    respondedCount: responded.length,
    onTimeCount: onTime.length,
    lateCount: late.length,
    waitingCount: waiting.length,
    breachedCount: breached.length,
    averageMinutes: average(responseMinutesList),
    medianMinutes: median(responseMinutesList),
    fastestMinutes: responseMinutesList.length ? Math.min(...responseMinutesList) : null,
    slowestMinutes: responseMinutesList.length ? Math.max(...responseMinutesList) : null,
    slaCompliancePercent: decidedCount ? (onTime.length / decidedCount) * 100 : null,
  };

  return {
    generatedAt: new Date().toISOString(),
    thresholdMinutes,
    summary,
    leads: resolved,
  };
}