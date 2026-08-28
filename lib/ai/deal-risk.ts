import type { CrmSnapshot, LeadSnapshot } from "@/lib/ai/context";
import { HIGH_VALUE_THRESHOLD, recommendedActionFor } from "@/lib/ai/context";
import type { LeadDTO } from "@/types/crm";

export type RiskLevel = "Healthy" | "Needs Attention" | "High Risk";

export type RiskBreakdownItem = {
  label: string;
  points: number;
  description: string;
};

export type DealRiskLead = {
  id: string;
  name: string;
  company: string;
  status: LeadDTO["status"];
  value: number;

  riskScore: number;
  score: number;
  riskLevel: RiskLevel;

  reasons: string[];
  recommendedAction: string;

  scoreBreakdown: RiskBreakdownItem[];

  staleDays: number;
  daysSinceCreated: number;
  daysSinceContact: number | null;
};

export type DealRiskSummary = {
  total: number;
  highRisk: number;
  needsAttention: number;
  healthy: number;
};

export type DealRiskRadar = {
  generatedAt: string;
  summary: DealRiskSummary;
  leads: DealRiskLead[];
};

export type DealRiskLevel = RiskLevel;
export type DealRiskBreakdownEntry = RiskBreakdownItem;
export type DealRiskResult = DealRiskLead;

function clamp(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function daysSince(date: string | Date | null | undefined): number {
  if (!date) return 0;

  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp)) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)),
  );
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 60) return "High Risk";
  if (score >= 30) return "Needs Attention";
  return "Healthy";
}

export function computeRiskBreakdown(
  snapshot: LeadSnapshot,
): RiskBreakdownItem[] {
  const lead = snapshot.lead;

  const breakdown: RiskBreakdownItem[] = [];

  /*
   * Stale activity
   *
   * Prefer last contact/activity information from the snapshot.
   * If there is no contact date, use lead creation age.
   */
  const staleDays =
    snapshot.daysSinceContact !== null
      ? snapshot.daysSinceContact
      : snapshot.daysSinceCreated;

  if (staleDays >= 3) {
    breakdown.push({
      label: "Stale activity",
      points: Math.min(30, Math.floor(staleDays / 2) * 5),
      description: `Last activity was ${staleDays} days ago.`,
    });
  }

  /*
   * Stage stagnation
   */
  if (
    ["NEW", "CONTACTED", "PROPOSAL"].includes(lead.status) &&
    snapshot.daysSinceCreated >= 5
  ) {
    breakdown.push({
      label: "Stage stagnation",
      points: Math.min(
        20,
        Math.floor(snapshot.daysSinceCreated / 5) * 5,
      ),
      description: `Lead remains in ${lead.status} stage after ${snapshot.daysSinceCreated} days.`,
    });
  }

  /*
   * Overdue follow-ups
   */
  if (snapshot.overdueFollowUps > 0) {
    breakdown.push({
      label: "Overdue follow-up",
      points: Math.min(25, snapshot.overdueFollowUps * 10),
      description:
        snapshot.overdueFollowUps === 1
          ? "There is 1 overdue follow-up."
          : `There are ${snapshot.overdueFollowUps} overdue follow-ups.`,
    });
  }

  /*
   * No notes
   */
  if (snapshot.notesCount === 0) {
    breakdown.push({
      label: "No notes",
      points: 10,
      description: "No notes recorded for this lead.",
    });
  }

  /*
   * No follow-up scheduled
   */
  if (!snapshot.nextFollowUpAt && snapshot.upcomingFollowUps === 0) {
    breakdown.push({
      label: "No follow-up scheduled",
      points: 10,
      description: "No follow-up is currently scheduled.",
    });
  }

  /*
   * No contact
   */
  if (!lead.lastContactedAt && lead.status !== "NEW") {
    breakdown.push({
      label: "No contact recorded",
      points: 10,
      description: "No contact has been recorded for this lead.",
    });
  }

  /*
   * High-value opportunity with risk signals
   */
  if (
    typeof lead.value === "number" &&
    Number.isFinite(lead.value) &&
    lead.value >= HIGH_VALUE_THRESHOLD &&
    breakdown.length > 0
  ) {
    breakdown.push({
      label: "High-value opportunity",
      points: 5,
      description: `High-value $${lead.value.toLocaleString()} opportunity has risk signals.`,
    });
  }

  return breakdown;
}

export function computeRiskScore(snapshot: LeadSnapshot): number {
  return clamp(
    computeRiskBreakdown(snapshot).reduce(
      (total, item) => total + item.points,
      0,
    ),
  );
}

export function buildRiskReasons(
  snapshot: LeadSnapshot,
  breakdown: RiskBreakdownItem[],
): string[] {
  return breakdown.map((item) => item.description || item.label);
}

function toDealRiskLead(snapshot: LeadSnapshot): DealRiskLead {
  const lead = snapshot.lead;

  const scoreBreakdown = computeRiskBreakdown(snapshot);

  const riskScore = clamp(
    scoreBreakdown.reduce((sum, item) => sum + item.points, 0),
  );

  const riskLevel = riskLevelFromScore(riskScore);

  /*
   * recommendedActionFor expects the complete LeadDTO
   * plus overdue follow-up count.
   */
  const recommendedAction = recommendedActionFor(
    lead,
    snapshot.overdueFollowUps,
  );

  const staleDays =
    snapshot.daysSinceContact !== null
      ? snapshot.daysSinceContact
      : snapshot.daysSinceCreated;

  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    status: lead.status,
    value: lead.value,

    riskScore,
    score: riskScore,
    riskLevel,

    reasons: buildRiskReasons(snapshot, scoreBreakdown),
    recommendedAction,

    scoreBreakdown,

    staleDays,
    daysSinceCreated: snapshot.daysSinceCreated,
    daysSinceContact: snapshot.daysSinceContact,
  };
}

/**
 * Used by service.ts.
 *
 * IMPORTANT:
 * computeDealRisk accepts a LeadSnapshot, not a partial object.
 * This keeps Deal Risk based on the same CRM snapshot as the rest
 * of the AI system.
 */
export function computeDealRisk(
  snapshot: LeadSnapshot,
): DealRiskResult {
  return toDealRiskLead(snapshot);
}

/**
 * Builds the complete Deal Risk page dataset.
 *
 * Optional leadId allows the API route to request one specific lead:
 *
 * buildDealRiskRadar(snapshot, leadId)
 *
 * Without leadId, all open leads are returned.
 */
export function buildDealRiskRadar(
  snapshot: CrmSnapshot,
  leadId?: string,
): DealRiskRadar {
  let leads = snapshot.leads.filter(
    (item) =>
      item.lead.status !== "CONVERTED" &&
      item.lead.status !== "LOST",
  );

  if (leadId) {
    leads = leads.filter((item) => item.lead.id === leadId);
  }

  const riskLeads = leads.map(toDealRiskLead);

  const highRisk = riskLeads.filter(
    (lead) => lead.riskLevel === "High Risk",
  ).length;

  const needsAttention = riskLeads.filter(
    (lead) => lead.riskLevel === "Needs Attention",
  ).length;

  const healthy = riskLeads.filter(
    (lead) => lead.riskLevel === "Healthy",
  ).length;

  return {
    generatedAt: snapshot.generatedAt,
    summary: {
      total: riskLeads.length,
      highRisk,
      needsAttention,
      healthy,
    },
    leads: riskLeads,
  };
}