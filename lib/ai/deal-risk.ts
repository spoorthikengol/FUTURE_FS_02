import type {
  FollowUpDTO,
  LeadDTO,
  LeadStatus,
} from "@/types/crm";

export type DealRiskLevel =
  | "High Risk"
  | "Needs Attention"
  | "Healthy";

/*
 * Backward-compatible alias.
 * app/(app)/deal-risk/page.tsx imports RiskLevel.
 */
export type RiskLevel = DealRiskLevel;

export type DealRiskBreakdownEntry = {
  label: string;
  points: number;
  description?: string;
};

type RiskBreakdownItem = DealRiskBreakdownEntry;

export type LeadSnapshot = {
  lead: LeadDTO;
  score?: number;
  quality?: string;
  notesCount?: number;
  overdueFollowUps: number;
  upcomingFollowUps?: number;
  nextFollowUpAt?: string | null;
  oldestOverdueDays?: number | null;
  daysSinceCreated: number;
  daysSinceContact: number | null;
  followUps?: FollowUpDTO[];
};
export type DealRiskLead = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  value: number;

  riskScore: number;
  score: number;
  riskLevel: DealRiskLevel;

  reasons: string[];
  recommendedAction: string;

  scoreBreakdown: RiskBreakdownItem[];
  breakdown: DealRiskBreakdownEntry[];

  staleDays: number;
  daysSinceCreated: number;
  daysSinceContact: number | null;
};

export type DealRiskRadar = {
  generatedAt: string;
  leads: DealRiskLead[];
  summary: {
    total: number;
    highRisk: number;
    needsAttention: number;
    healthy: number;
  };
};

export type CrmSnapshotLike = {
  leads: Array<{
    lead: LeadDTO;
    overdueFollowUps: number;
    daysSinceCreated: number;
    daysSinceContact: number | null;
    followUps?: FollowUpDTO[];
  }>;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function riskLevelFromScore(score: number): DealRiskLevel {
  if (score >= 60) return "High Risk";
  if (score >= 30) return "Needs Attention";
  return "Healthy";
}

function recommendedActionFor(
  lead: LeadDTO,
  overdueFollowUps: number,
): string {
  if (overdueFollowUps > 0) {
    return "Complete the overdue follow-up and re-engage the lead.";
  }

  if (lead.status === "LOST") {
    return "Review the loss reason before attempting further outreach.";
  }

  if (lead.status === "CONVERTED") {
    return "Maintain the relationship and look for expansion opportunities.";
  }

  if (lead.status === "NEW") {
    return "Contact the lead and qualify the opportunity.";
  }

  return "Schedule the next follow-up and keep the opportunity moving.";
}

export function computeRiskBreakdown(
  snapshot: LeadSnapshot,
): RiskBreakdownItem[] {
  const { lead } = snapshot;
  const breakdown: RiskBreakdownItem[] = [];

  if (snapshot.overdueFollowUps > 0) {
    breakdown.push({
      label: "Overdue follow-up",
      points: 30,
      description: `${snapshot.overdueFollowUps} follow-up${
        snapshot.overdueFollowUps === 1 ? "" : "s"
      } overdue.`,
    });
  }

  if (
    snapshot.daysSinceContact !== null &&
    snapshot.daysSinceContact >= 30
  ) {
    breakdown.push({
      label: "No recent contact",
      points: 25,
      description: `No contact recorded for ${snapshot.daysSinceContact} days.`,
    });
  } else if (
    snapshot.daysSinceContact !== null &&
    snapshot.daysSinceContact >= 14
  ) {
    breakdown.push({
      label: "Stale contact",
      points: 15,
      description: `Last contact was ${snapshot.daysSinceContact} days ago.`,
    });
  }

  if (snapshot.daysSinceCreated >= 60) {
    breakdown.push({
      label: "Aging opportunity",
      points: 15,
      description: `Lead has been open for ${snapshot.daysSinceCreated} days.`,
    });
  } else if (snapshot.daysSinceCreated >= 30) {
    breakdown.push({
      label: "Aging opportunity",
      points: 8,
      description: `Lead has been open for ${snapshot.daysSinceCreated} days.`,
    });
  }

  if (lead.status === "NEW") {
    breakdown.push({
      label: "Not yet qualified",
      points: 10,
      description: "Lead has not progressed beyond the new stage.",
    });
  }

  if (lead.status === "CONTACTED") {
    breakdown.push({
      label: "Early-stage opportunity",
      points: 5,
      description: "Lead has been contacted but is not yet qualified.",
    });
  }

  if (lead.priority === "LOW") {
    breakdown.push({
      label: "Low priority",
      points: 5,
      description: "Lead is currently marked as low priority.",
    });
  }

  if (
    typeof lead.value === "number" &&
    Number.isFinite(lead.value) &&
    lead.value >= 40000 &&
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

export function computeRiskScore(
  snapshot: LeadSnapshot,
): number {
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
  return breakdown.map(
    (item: RiskBreakdownItem) =>
      item.description || item.label,
  );
}

function toDealRiskLead(
  snapshot: LeadSnapshot,
): DealRiskLead {
  const lead = snapshot.lead;

  const scoreBreakdown =
    computeRiskBreakdown(snapshot);

  const riskScore = clamp(
    scoreBreakdown.reduce(
      (sum, item) => sum + item.points,
      0,
    ),
  );

  const riskLevel =
    riskLevelFromScore(riskScore);

  const recommendedAction =
    recommendedActionFor(
      lead,
      snapshot.overdueFollowUps,
    );

  const staleDays =
    snapshot.daysSinceContact !== null
      ? snapshot.daysSinceContact
      : snapshot.daysSinceCreated;

  const reasons =
    buildRiskReasons(
      snapshot,
      scoreBreakdown,
    );

  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    status: lead.status,
    value: lead.value,

    riskScore,
    score: riskScore,
    riskLevel,

    reasons,
    recommendedAction,

    scoreBreakdown,

    /*
     * DealRiskCard expects `breakdown`.
     */
    breakdown: scoreBreakdown,

    staleDays,
    daysSinceCreated:
      snapshot.daysSinceCreated,
    daysSinceContact:
      snapshot.daysSinceContact,
  };
}

export function buildDealRiskRadar(
  snapshot: CrmSnapshotLike,
): DealRiskRadar {
  const leads = snapshot.leads
  .filter(
    (leadSnapshot: LeadSnapshot) =>
      !["CONVERTED", "LOST"].includes(
        leadSnapshot.lead.status,
      ),
  )
  .map(
    (leadSnapshot: LeadSnapshot) =>
      toDealRiskLead(leadSnapshot),
  );
  const highRisk = leads.filter(
    (lead) =>
      lead.riskLevel === "High Risk",
  ).length;

  const needsAttention = leads.filter(
    (lead) =>
      lead.riskLevel === "Needs Attention",
  ).length;

  const healthy = leads.filter(
    (lead) =>
      lead.riskLevel === "Healthy",
  ).length;

  return {
    generatedAt:
      new Date().toISOString(),

    leads,

    summary: {
      total: leads.length,
      highRisk,
      needsAttention,
      healthy,
    },
  };
}

export function buildDealRiskForLead(
  snapshot: LeadSnapshot,
): DealRiskLead {
  return toDealRiskLead(snapshot);
}

/*
 * Direct deal-risk calculation for a single LeadDTO.
 *
 * This is kept separate from LeadSnapshot so existing
 * service.ts calls can use it directly.
 */
export type DealRiskResult = {
  riskScore: number;
  score: number;
  riskLevel: DealRiskLevel;
  reasons: string[];
  recommendedAction: string;
  scoreBreakdown: DealRiskBreakdownEntry[];
  breakdown: DealRiskBreakdownEntry[];
};

export function computeDealRisk(
  lead: LeadDTO,
  followUps: FollowUpDTO[] = [],
): DealRiskResult {
  const now = new Date();

  const normalizedFollowUps =
    Array.isArray(followUps)
      ? followUps
      : [];

  const overdueFollowUps =
    normalizedFollowUps.filter(
      (item: FollowUpDTO) => {
        if (item.status === "OVERDUE") {
          return true;
        }

        if (item.status === "COMPLETED") {
          return false;
        }

        const date = new Date(item.date);

        if (Number.isNaN(date.getTime())) {
          return false;
        }

        if (item.time) {
          const [hours, minutes] =
            item.time.split(":").map(Number);

          if (
            Number.isFinite(hours) &&
            Number.isFinite(minutes)
          ) {
            date.setHours(
              hours,
              minutes,
              0,
              0,
            );
          }
        }

        return date < now;
      },
    ).length;

  const createdAt = new Date(
    lead.createdAt,
  );

  const daysSinceCreated =
    Number.isNaN(createdAt.getTime())
      ? 0
      : Math.max(
          0,
          Math.floor(
            (now.getTime() -
              createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );

  const lastContacted = lead.lastContactedAt
    ? new Date(lead.lastContactedAt)
    : null;

  const daysSinceContact =
    lastContacted &&
    !Number.isNaN(lastContacted.getTime())
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() -
              lastContacted.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const snapshot: LeadSnapshot = {
    lead,
    followUps: normalizedFollowUps,
    overdueFollowUps,
    daysSinceCreated,
    daysSinceContact,
  };

  const result =
    toDealRiskLead(snapshot);

  return {
    riskScore: result.riskScore,
    score: result.score,
    riskLevel: result.riskLevel,
    reasons: result.reasons,
    recommendedAction:
      result.recommendedAction,
    scoreBreakdown:
      result.scoreBreakdown,
    breakdown: result.breakdown,
  };
}