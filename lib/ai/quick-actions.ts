import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  HIGH_VALUE_THRESHOLD,
  leadsToContactToday,
  recommendedActionFor,
  type CrmSnapshot,
  type LeadQuality,
  type LeadSnapshot,
} from "@/lib/ai/context";
import { QUICK_ACTION_IDS, type QuickActionId } from "@/lib/ai/quick-action-meta";
import type { LeadStatus } from "@/types/crm";

export { QUICK_ACTION_IDS };
export type { QuickActionId };

export type QuickActionLead = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  value: number;
  score: number;
  quality: LeadQuality;
  reason: string;
};

export type QuickActionMetric = { label: string; value: string; helpText?: string };

/**
 * Every quick-action handler returns this shape. Numbers and lead records
 * are plain, typed data computed straight from the CRM snapshot -- never
 * text the frontend has to parse to recover a figure. `type` tells the
 * client which fields are populated for this action.
 */
export type QuickActionResult = {
  id: QuickActionId;
  title: string;
  description: string;
  type: "lead-list" | "metric-group" | "table" | "text";
  leads?: QuickActionLead[];
  metrics?: QuickActionMetric[];
  table?: { headers: string[]; rows: string[][] };
  message?: string;
  generatedAt: string;
};

function toQuickActionLead(item: LeadSnapshot, reason: string): QuickActionLead {
  return {
    id: item.lead.id,
    name: item.lead.name,
    company: item.lead.company,
    status: item.lead.status,
    value: item.lead.value,
    score: item.score,
    quality: item.quality,
    reason,
  };
}

function contactToday(snapshot: CrmSnapshot): QuickActionResult {
  const due = leadsToContactToday(snapshot).sort((a, b) => b.score - a.score);
  const leads = due.map((item) =>
    toQuickActionLead(
      item,
      item.overdueFollowUps > 0
        ? `${item.overdueFollowUps} overdue follow-up${item.overdueFollowUps === 1 ? "" : "s"}`
        : item.nextFollowUpAt
          ? "Follow-up scheduled today"
          : "New lead, not yet contacted",
    ),
  );
  return {
    id: "contact_today",
    title: "Contact today",
    description: leads.length
      ? `${leads.length} lead${leads.length === 1 ? "" : "s"} need outreach today.`
      : "No leads are due for contact today.",
    type: "lead-list",
    leads,
    generatedAt: snapshot.generatedAt,
  };
}

function atRisk(snapshot: CrmSnapshot): QuickActionResult {
  const risky = snapshot.leads
    .filter(
      (item) =>
        item.lead.status !== "CONVERTED" &&
        item.lead.status !== "LOST" &&
        (item.quality === "At Risk" || item.overdueFollowUps > 0),
    )
    .sort((a, b) => b.lead.value - a.lead.value);
  const leads = risky.map((item) =>
    toQuickActionLead(
      item,
      item.overdueFollowUps > 0
        ? `${item.overdueFollowUps} overdue follow-up${item.overdueFollowUps === 1 ? "" : "s"}`
        : "Low conversion score",
    ),
  );
  return {
    id: "at_risk",
    title: "At-risk leads",
    description: leads.length
      ? `${leads.length} lead${leads.length === 1 ? "" : "s"} show risk signals.`
      : "No leads currently show risk signals.",
    type: "lead-list",
    leads,
    generatedAt: snapshot.generatedAt,
  };
}

function topOpportunities(snapshot: CrmSnapshot): QuickActionResult {
  const ranked = [...snapshot.leads]
    .filter((item) => item.lead.status !== "LOST" && item.lead.status !== "CONVERTED")
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return {
    id: "top_opportunities",
    title: "Top opportunities",
    description: ranked.length
      ? `Ranked by conversion-potential score, highest first.`
      : "No open leads yet.",
    type: "lead-list",
    leads: ranked.map((item) => toQuickActionLead(item, `Score ${item.score}/100`)),
    generatedAt: snapshot.generatedAt,
  };
}

function highestValue(snapshot: CrmSnapshot): QuickActionResult {
  const ranked = [...snapshot.leads]
    .filter((item) => item.lead.status !== "LOST" && item.lead.status !== "CONVERTED")
    .sort((a, b) => b.lead.value - a.lead.value)
    .slice(0, 8);
  return {
    id: "highest_value",
    title: "Highest-value leads",
    description: ranked.length
      ? `Sorted by deal value, highest first (${formatCurrency(HIGH_VALUE_THRESHOLD)}+ counts as high value).`
      : "No open leads yet.",
    type: "lead-list",
    leads: ranked.map((item) => toQuickActionLead(item, formatCurrency(item.lead.value))),
    generatedAt: snapshot.generatedAt,
  };
}

function pipelineOverview(snapshot: CrmSnapshot): QuickActionResult {
  const { analytics } = snapshot;
  const rows = (Object.keys(snapshot.valueByStatus) as LeadStatus[])
    .filter((status) => status !== "LOST")
    .map((status) => [status, String(analytics.byStatus[status] ?? 0), formatCurrency(snapshot.valueByStatus[status] ?? 0)]);

  return {
    id: "pipeline_overview",
    title: "Pipeline overview",
    description: `${snapshot.openPipelineCount} open lead${snapshot.openPipelineCount === 1 ? "" : "s"} worth ${formatCurrency(snapshot.openPipelineValue)}.`,
    type: "table",
    metrics: [
      { label: "Open pipeline value", value: formatCurrency(snapshot.openPipelineValue) },
      { label: "Open leads", value: String(snapshot.openPipelineCount) },
      { label: "Current revenue", value: formatCurrency(analytics.forecast.currentRevenue) },
      { label: "Conversion rate", value: formatPercent(analytics.kpis.conversionRate.value) },
    ],
    table: { headers: ["Status", "Leads", "Value"], rows },
    generatedAt: snapshot.generatedAt,
  };
}

function revenueInsights(snapshot: CrmSnapshot): QuickActionResult {
  const { analytics } = snapshot;
  const bySourceSorted = [...analytics.sources].sort((a, b) => b.revenue - a.revenue);

  return {
    id: "revenue_insights",
    title: "Revenue insights",
    description: `Current revenue is ${formatCurrency(analytics.forecast.currentRevenue)}, ${
      analytics.forecast.growthPercentage >= 0 ? "up" : "down"
    } ${formatPercent(Math.abs(analytics.forecast.growthPercentage))} vs. the prior period.`,
    type: "metric-group",
    metrics: [
      { label: "Current revenue", value: formatCurrency(analytics.forecast.currentRevenue) },
      { label: "Expected revenue", value: formatCurrency(analytics.forecast.expectedRevenue) },
      { label: "Forecast (next period)", value: formatCurrency(analytics.forecast.forecastRevenue) },
      { label: "All-time converted revenue", value: formatCurrency(analytics.kpis.revenue.value) },
      { label: "Revenue per lead", value: formatCurrency(analytics.roi.revenuePerLead) },
    ],
    table: {
      headers: ["Source", "Leads", "Revenue"],
      rows: bySourceSorted.map((row) => [row.source, String(row.count), formatCurrency(row.revenue)]),
    },
    generatedAt: snapshot.generatedAt,
  };
}

function buildSourceMetrics(
  bestRevenue: { source: string; revenue: number } | undefined,
  bestRoi: { source: string; roi: number } | undefined,
): QuickActionMetric[] {
  const metrics: QuickActionMetric[] = [];
  if (bestRevenue) {
    metrics.push({ label: "Top revenue source", value: bestRevenue.source, helpText: formatCurrency(bestRevenue.revenue) });
  }
  if (bestRoi) {
    metrics.push({ label: "Best ROI source", value: bestRoi.source, helpText: formatPercent(bestRoi.roi) });
  }
  return metrics;
}

function sourcePerformance(snapshot: CrmSnapshot): QuickActionResult {
  const { analytics } = snapshot;
  const bestRoi = [...analytics.roiBySource].sort((a, b) => b.roi - a.roi)[0];
  const bestRevenue = [...analytics.sources].sort((a, b) => b.revenue - a.revenue)[0];

  return {
    id: "source_performance",
    title: "Source performance",
    description:
      bestRevenue && bestRevenue.revenue > 0
        ? `${bestRevenue.source} generates the most revenue (${formatCurrency(bestRevenue.revenue)}).${
            bestRoi && bestRoi.roi > 0 ? ` ${bestRoi.source} has the best ROI (${formatPercent(bestRoi.roi)}).` : ""
          }`
        : "No converted revenue recorded yet by source.",
    type: "table",
    metrics: buildSourceMetrics(bestRevenue, bestRoi),
    table: {
      headers: ["Source", "Leads", "Revenue", "Marketing spend", "ROI", "Cost / lead"],
      rows: analytics.roiBySource.map((row) => {
        const sourceCount = analytics.sources.find((source) => source.source === row.source)?.count ?? 0;
        return [
          row.source,
          String(sourceCount),
          formatCurrency(row.revenue),
          formatCurrency(row.spend),
          row.spend ? formatPercent(row.roi) : "No spend data",
          row.costPerLead ? formatCurrency(row.costPerLead) : "—",
        ];
      }),
    },
    generatedAt: snapshot.generatedAt,
  };
}

function followUpRecommendations(snapshot: CrmSnapshot): QuickActionResult {
  const due = leadsToContactToday(snapshot).sort((a, b) => b.score - a.score);
  return {
    id: "follow_up_recommendations",
    title: "Follow-up recommendations",
    description: due.length
      ? `${due.length} lead${due.length === 1 ? "" : "s"} need a follow-up action.`
      : "No follow-ups need attention right now.",
    type: "lead-list",
    leads: due.map((item) => toQuickActionLead(item, recommendedActionFor(item.lead, item.overdueFollowUps))),
    generatedAt: snapshot.generatedAt,
  };
}

function nextBestAction(snapshot: CrmSnapshot, lead: LeadSnapshot | null): QuickActionResult {
  if (lead && (lead.lead.status === "CONVERTED" || lead.lead.status === "LOST")) {
    return {
      id: "next_best_action",
      title: `Next best action — ${lead.lead.name}`,
      description: `${lead.lead.name} is ${lead.lead.status.toLowerCase()} — no further action needed.`,
      type: "text",
      message: `${lead.lead.name} is ${lead.lead.status.toLowerCase()} — no further action needed.`,
      generatedAt: snapshot.generatedAt,
    };
  }
  if (lead) {
    return {
      id: "next_best_action",
      title: `Next best action — ${lead.lead.name}`,
      description: recommendedActionFor(lead.lead, lead.overdueFollowUps),
      type: "lead-list",
      leads: [toQuickActionLead(lead, recommendedActionFor(lead.lead, lead.overdueFollowUps))],
      generatedAt: snapshot.generatedAt,
    };
  }
  const due = leadsToContactToday(snapshot).sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    id: "next_best_action",
    title: "Next best actions",
    description: due.length
      ? `Top ${due.length} action${due.length === 1 ? "" : "s"} to take right now.`
      : "No urgent actions right now — review QUALIFIED and PROPOSAL leads to keep momentum.",
    type: "lead-list",
    leads: due.map((item) => toQuickActionLead(item, recommendedActionFor(item.lead, item.overdueFollowUps))),
    generatedAt: snapshot.generatedAt,
  };
}

export function runQuickAction(
  action: QuickActionId,
  snapshot: CrmSnapshot,
  lead: LeadSnapshot | null,
): QuickActionResult {
  switch (action) {
    case "contact_today":
      return contactToday(snapshot);
    case "at_risk":
      return atRisk(snapshot);
    case "top_opportunities":
      return topOpportunities(snapshot);
    case "highest_value":
      return highestValue(snapshot);
    case "pipeline_overview":
      return pipelineOverview(snapshot);
    case "revenue_insights":
      return revenueInsights(snapshot);
    case "source_performance":
      return sourcePerformance(snapshot);
    case "follow_up_recommendations":
      return followUpRecommendations(snapshot);
    case "next_best_action":
      return nextBestAction(snapshot, lead);
    default:
      action satisfies never;
      throw new Error("Unknown quick action");
  }
}