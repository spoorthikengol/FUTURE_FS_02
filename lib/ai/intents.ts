import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import {
  HIGH_VALUE_THRESHOLD,
  insightFactorsFor,
  leadsToContactToday,
  recommendedActionFor,
  type CrmSnapshot,
  type LeadSnapshot,
} from "@/lib/ai/context";
import { QUICK_ACTIONS, type IntentId } from "@/lib/ai/actions";
import type { NoteDTO } from "@/types/crm";

export type AssistantSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
};

export type AssistantAnswer = {
  headline: string;
  sections: AssistantSection[];
  relatedLeadIds?: string[];
};

export { QUICK_ACTIONS };
export type { IntentId };

function leadLine(item: LeadSnapshot, extra?: string) {
  const base = `${item.lead.name} (${item.lead.company}) — ${item.quality}, score ${item.score}/100, ${item.lead.status}, ${formatCurrency(item.lead.value)}`;
  return extra ? `${base} — ${extra}` : base;
}

function noData(subject: string): AssistantAnswer {
  return {
    headline: `No data available for ${subject}.`,
    sections: [
      {
        paragraphs: [
          `I couldn't find any CRM records for ${subject} yet. Add leads, notes, or follow-ups and ask again.`,
        ],
      },
    ],
  };
}

function contactToday(snapshot: CrmSnapshot): AssistantAnswer {
  const due = leadsToContactToday(snapshot).sort((a, b) => b.score - a.score);
  if (!due.length) {
    return {
      headline: "Nothing urgent — no leads are due for contact today.",
      sections: [
        {
          paragraphs: [
            "No overdue follow-ups and no untouched new leads right now. Check back tomorrow or review upcoming follow-ups.",
          ],
        },
      ],
    };
  }
  const overdue = due.filter((item) => item.overdueFollowUps > 0);
  const dueToday = due.filter((item) => item.overdueFollowUps === 0 && item.nextFollowUpAt);
  const untouched = due.filter((item) => item.overdueFollowUps === 0 && !item.nextFollowUpAt);

  const sections: AssistantSection[] = [];
  if (overdue.length) {
    sections.push({
      heading: `Overdue — recover these first (${overdue.length})`,
      bullets: overdue.slice(0, 8).map((item) => leadLine(item, `${item.overdueFollowUps} overdue follow-up(s)`)),
    });
  }
  if (dueToday.length) {
    sections.push({
      heading: `Follow-ups scheduled today (${dueToday.length})`,
      bullets: dueToday.slice(0, 8).map((item) => leadLine(item)),
    });
  }
  if (untouched.length) {
    sections.push({
      heading: `New leads not yet contacted (${untouched.length})`,
      bullets: untouched.slice(0, 8).map((item) => leadLine(item)),
    });
  }

  return {
    headline: `You have ${due.length} lead${due.length === 1 ? "" : "s"} to contact today.`,
    sections,
    relatedLeadIds: due.slice(0, 8).map((item) => item.lead.id),
  };
}

function topLeads(snapshot: CrmSnapshot): AssistantAnswer {
  const ranked = [...snapshot.leads]
    .filter((item) => item.lead.status !== "LOST")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (!ranked.length) return noData("your leads");

  return {
    headline: `${ranked[0].lead.name} at ${ranked[0].lead.company} has the highest conversion potential (score ${ranked[0].score}/100).`,
    sections: [
      {
        heading: "Top 5 leads by conversion potential",
        bullets: ranked.map((item, index) => `${index + 1}. ${leadLine(item)}`),
      },
    ],
    relatedLeadIds: ranked.map((item) => item.lead.id),
  };
}

function riskAndValue(snapshot: CrmSnapshot): AssistantAnswer {
  const atRisk = snapshot.leads
    .filter(
      (item) =>
        item.lead.status !== "CONVERTED" &&
        (item.quality === "At Risk" || item.overdueFollowUps > 0),
    )
    .sort((a, b) => b.lead.value - a.lead.value)
    .slice(0, 6);
  const highValue = snapshot.leads
    .filter((item) => item.lead.value >= HIGH_VALUE_THRESHOLD && item.lead.status !== "LOST")
    .sort((a, b) => b.lead.value - a.lead.value)
    .slice(0, 6);

  const sections: AssistantSection[] = [];
  sections.push({
    heading: `At-risk leads (${atRisk.length})`,
    bullets: atRisk.length
      ? atRisk.map((item) =>
          leadLine(item, item.overdueFollowUps ? `${item.overdueFollowUps} overdue follow-up(s)` : "low engagement signals"),
        )
      : ["No leads currently show risk signals."],
  });
  sections.push({
    heading: `High-value leads — $${HIGH_VALUE_THRESHOLD.toLocaleString()}+ (${highValue.length})`,
    bullets: highValue.length ? highValue.map((item) => leadLine(item)) : ["No open leads above the high-value threshold yet."],
  });

  return {
    headline: `${atRisk.length} lead${atRisk.length === 1 ? "" : "s"} at risk, ${highValue.length} high-value lead${highValue.length === 1 ? "" : "s"} in play.`,
    sections,
    relatedLeadIds: [...atRisk, ...highValue].slice(0, 8).map((item) => item.lead.id),
  };
}

function pipelineValue(snapshot: CrmSnapshot): AssistantAnswer {
  const { analytics } = snapshot;
  const rows = (Object.keys(snapshot.valueByStatus) as (keyof typeof snapshot.valueByStatus)[])
    .filter((status) => status !== "LOST")
    .map((status) => [
      status,
      String(analytics.byStatus[status] ?? 0),
      formatCurrency(snapshot.valueByStatus[status] ?? 0),
    ]);

  return {
    headline: `Your open pipeline is worth ${formatCurrency(snapshot.openPipelineValue)} across ${snapshot.openPipelineCount} open lead${snapshot.openPipelineCount === 1 ? "" : "s"}.`,
    sections: [
      {
        paragraphs: [
          `Current revenue (converted, this period): ${formatCurrency(analytics.forecast.currentRevenue)}. All-time converted revenue: ${formatCurrency(analytics.kpis.revenue.value)}.`,
        ],
      },
      {
        heading: "Value by pipeline stage",
        table: { headers: ["Status", "Leads", "Value"], rows },
      },
    ],
  };
}

function revenueInsights(snapshot: CrmSnapshot): AssistantAnswer {
  const { analytics } = snapshot;
  const bySourceSorted = [...analytics.sources].sort((a, b) => b.revenue - a.revenue);
  const top = bySourceSorted[0];

  return {
    headline: `Current revenue is ${formatCurrency(analytics.forecast.currentRevenue)}, ${
      analytics.forecast.growthPercentage >= 0 ? "up" : "down"
    } ${formatPercent(Math.abs(analytics.forecast.growthPercentage))} vs the prior period.`,
    sections: [
      {
        heading: "Revenue snapshot",
        bullets: [
          `Current period revenue: ${formatCurrency(analytics.forecast.currentRevenue)}`,
          `Expected revenue: ${formatCurrency(analytics.forecast.expectedRevenue)}`,
          `Forecast (next period): ${formatCurrency(analytics.forecast.forecastRevenue)}`,
          `All-time converted revenue: ${formatCurrency(analytics.kpis.revenue.value)}`,
          `Revenue per lead: ${formatCurrency(analytics.roi.revenuePerLead)}`,
        ],
      },
      top
        ? {
            heading: "Revenue by source",
            table: {
              headers: ["Source", "Leads", "Revenue"],
              rows: bySourceSorted.map((row) => [row.source, String(row.count), formatCurrency(row.revenue)]),
            },
          }
        : { paragraphs: ["No source revenue recorded yet."] },
    ],
  };
}

function sourceRevenue(snapshot: CrmSnapshot): AssistantAnswer {
  const bySourceSorted = [...snapshot.analytics.sources].sort((a, b) => b.revenue - a.revenue);
  const top = bySourceSorted[0];
  if (!top || top.revenue === 0) {
    return {
      headline: "No source has generated converted revenue yet.",
      sections: [
        {
          heading: "Leads by source",
          table: {
            headers: ["Source", "Leads", "Revenue"],
            rows: bySourceSorted.map((row) => [row.source, String(row.count), formatCurrency(row.revenue)]),
          },
        },
      ],
    };
  }
  return {
    headline: `${top.source} generates the most revenue: ${formatCurrency(top.revenue)} from ${top.count} lead${top.count === 1 ? "" : "s"}.`,
    sections: [
      {
        heading: "Revenue by source",
        table: {
          headers: ["Source", "Leads", "Revenue"],
          rows: bySourceSorted.map((row) => [row.source, String(row.count), formatCurrency(row.revenue)]),
        },
      },
    ],
  };
}

function conversionAnalysis(snapshot: CrmSnapshot): AssistantAnswer {
  const { analytics } = snapshot;
  const overdue = analytics.overdueFollowUps;
  const stuckNew = snapshot.leads.filter(
    (item) => item.lead.status === "NEW" && item.daysSinceCreated >= 3,
  ).length;
  const uncontacted = snapshot.leads.filter(
    (item) => !item.lead.lastContactedAt && item.lead.status !== "NEW" && item.lead.status !== "LOST",
  ).length;

  const funnelDrop = analytics.funnel
    .filter((stage) => stage.status !== "NEW")
    .map((stage) => `${stage.status}: ${formatPercent(stage.conversionFromPrevious)} of the previous stage`);

  const reasons: string[] = [];
  if (overdue > 0) reasons.push(`${overdue} overdue follow-up(s) are letting warm leads go cold.`);
  if (stuckNew > 0) reasons.push(`${stuckNew} new lead(s) have sat for 3+ days without first contact.`);
  if (uncontacted > 0) reasons.push(`${uncontacted} lead(s) past NEW have no recorded contact date.`);
  if (!reasons.length) reasons.push("No major process gaps detected — current rate reflects deal mix and market factors rather than follow-up hygiene.");

  return {
    headline: `Conversion rate is ${formatPercent(analytics.kpis.conversionRate.value)}.`,
    sections: [
      { heading: "Likely contributing factors", bullets: reasons },
      { heading: "Funnel conversion by stage", bullets: funnelDrop },
    ],
  };
}

function followUpRecommendations(snapshot: CrmSnapshot): AssistantAnswer {
  const due = leadsToContactToday(snapshot).sort((a, b) => b.score - a.score).slice(0, 8);
  if (!due.length) return { headline: "No follow-ups need attention right now.", sections: [{ paragraphs: ["Your follow-up queue is clear."] }] };

  return {
    headline: `${due.length} lead${due.length === 1 ? "" : "s"} need follow-up action.`,
    sections: [
      {
        heading: "Recommended actions",
        bullets: due.map((item) => `${item.lead.name} (${item.lead.company}): ${recommendedActionFor(item.lead, item.overdueFollowUps)}`),
      },
    ],
    relatedLeadIds: due.map((item) => item.lead.id),
  };
}

function prioritize(snapshot: CrmSnapshot): AssistantAnswer {
  const ranked = [...snapshot.leads]
    .filter((item) => item.lead.status !== "CONVERTED" && item.lead.status !== "LOST")
    .sort((a, b) => {
      const urgencyA = a.overdueFollowUps > 0 ? 1 : 0;
      const urgencyB = b.overdueFollowUps > 0 ? 1 : 0;
      if (urgencyA !== urgencyB) return urgencyB - urgencyA;
      return b.score - a.score;
    })
    .slice(0, 10);
  if (!ranked.length) return noData("open leads");

  return {
    headline: `Focus on ${ranked[0].lead.name} (${ranked[0].lead.company}) first.`,
    sections: [
      {
        heading: "Priority order",
        bullets: ranked.map((item, index) => `${index + 1}. ${leadLine(item, item.overdueFollowUps ? "overdue" : undefined)}`),
      },
    ],
    relatedLeadIds: ranked.map((item) => item.lead.id),
  };
}

function nextActionGeneral(snapshot: CrmSnapshot): AssistantAnswer {
  const due = leadsToContactToday(snapshot).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!due.length) {
    return {
      headline: "Review your pipeline — no urgent actions right now.",
      sections: [{ paragraphs: ["Consider checking in on QUALIFIED and PROPOSAL leads to keep momentum."] }],
    };
  }
  return {
    headline: `Start with ${due[0].lead.name} at ${due[0].lead.company}.`,
    sections: [
      {
        heading: "Top 3 next actions",
        bullets: due.map((item) => `${item.lead.name} (${item.lead.company}): ${recommendedActionFor(item.lead, item.overdueFollowUps)}`),
      },
    ],
    relatedLeadIds: due.map((item) => item.lead.id),
  };
}

function nextActionForLead(item: LeadSnapshot): AssistantAnswer {
  return {
    headline: recommendedActionFor(item.lead, item.overdueFollowUps),
    sections: [
      {
        bullets: [
          `Status: ${item.lead.status}`,
          `Score: ${item.score}/100 (${item.quality})`,
          `Deal value: ${formatCurrency(item.lead.value)}`,
          item.overdueFollowUps ? `${item.overdueFollowUps} overdue follow-up(s)` : "No overdue follow-ups",
        ],
      },
    ],
    relatedLeadIds: [item.lead.id],
  };
}

function leadSummary(item: LeadSnapshot): AssistantAnswer {
  const { lead } = item;
  return {
    headline: `${lead.name} at ${lead.company} — ${item.quality} (score ${item.score}/100)`,
    sections: [
      {
        paragraphs: [
          `${lead.name} is a ${lead.status.toLowerCase()} lead from ${lead.source}, worth ${formatCurrency(lead.value)}, with ${lead.priority.toLowerCase()} priority.`,
        ],
      },
      {
        heading: "Key facts",
        bullets: [
          `Job title: ${lead.jobTitle || "Not provided"}`,
          `Last contacted: ${lead.lastContactedAt ? formatDate(lead.lastContactedAt) : "Never"}`,
          `Next follow-up: ${item.nextFollowUpAt ? formatDate(item.nextFollowUpAt) : "None scheduled"}`,
          `Notes on file: ${item.notesCount}`,
          `Created: ${formatDate(lead.createdAt)}`,
        ],
      },
      lead.message ? { heading: "Original message", paragraphs: [lead.message] } : { paragraphs: ["No inbound message recorded."] },
    ],
    relatedLeadIds: [lead.id],
  };
}

function leadExplain(item: LeadSnapshot): AssistantAnswer {
  const factors = insightFactorsFor(item.lead, item.overdueFollowUps, item.notesCount);
  return {
    headline: `${item.lead.name} scores ${item.score}/100 (${item.quality}) for conversion likelihood.`,
    sections: [
      {
        heading: "Why",
        bullets: factors.map((factor) => `${factor.label} (${factor.impact}): ${factor.detail}`),
      },
    ],
    relatedLeadIds: [item.lead.id],
  };
}

const POSITIVE_WORDS = [
  "interested",
  "excited",
  "great",
  "love",
  "perfect",
  "yes",
  "ready",
  "looking forward",
  "sounds good",
  "impressed",
  "happy",
  "thank you",
  "thanks",
];
const NEGATIVE_WORDS = [
  "not interested",
  "too expensive",
  "expensive",
  "never",
  "cancel",
  "disappointed",
  "no budget",
  "pause",
  "stop",
  "unhappy",
  "frustrated",
  "unsubscribe",
  "concerned",
  "issue",
  "problem",
];

function sentiment(item: LeadSnapshot, notes: NoteDTO[]): AssistantAnswer {
  const text = [item.lead.message, ...notes.map((note) => note.content)].join(" ").toLowerCase();
  if (!text.trim()) {
    return {
      headline: "Insufficient data",
      sections: [{ paragraphs: ["This lead has no message or notes yet to evaluate tone."] }],
      relatedLeadIds: [item.lead.id],
    };
  }
  const positiveHits = POSITIVE_WORDS.filter((word) => text.includes(word));
  const negativeHits = NEGATIVE_WORDS.filter((word) => text.includes(word));
  const scoreDiff = positiveHits.length - negativeHits.length;
  const label = scoreDiff > 0 ? "Positive" : scoreDiff < 0 ? "Negative" : "Neutral";

  return {
    headline: `Sentiment: ${label}`,
    sections: [
      {
        bullets: [
          `Positive signals found: ${positiveHits.length ? positiveHits.join(", ") : "none"}`,
          `Negative signals found: ${negativeHits.length ? negativeHits.join(", ") : "none"}`,
          `Based on the lead's message and ${notes.length} note(s).`,
        ],
      },
    ],
    relatedLeadIds: [item.lead.id],
  };
}

function conversationSummary(item: LeadSnapshot, notes: NoteDTO[]): AssistantAnswer {
  if (!notes.length) {
    return {
      headline: "Insufficient data",
      sections: [{ paragraphs: [`No notes have been logged for ${item.lead.name} yet.`] }],
      relatedLeadIds: [item.lead.id],
    };
  }
  const chronological = [...notes].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const highlights = chronological.slice(-6).map((note) => {
    const trimmed = note.content.length > 140 ? `${note.content.slice(0, 140)}…` : note.content;
    return `${formatDate(note.createdAt)} — ${note.author}: ${trimmed}`;
  });

  return {
    headline: `${notes.length} note${notes.length === 1 ? "" : "s"} on file for ${item.lead.name}.`,
    sections: [{ heading: "Conversation highlights", bullets: highlights }],
    relatedLeadIds: [item.lead.id],
  };
}

export function classifyIntent(message: string, hasLead: boolean): IntentId | null {
  const text = message.toLowerCase();

  if (hasLead) {
    if (/summar(y|ize).*(conversation|notes|history)/.test(text)) return "conversation_summary";
    if (/sentiment|how (do they feel|are they feeling)|mood|tone/.test(text)) return "sentiment";
    if (/why.*(likely|going|will).*convert/.test(text)) return "lead_explain";
    if (/summar(y|ize).*(lead|this)/.test(text) || /tell me about this lead/.test(text)) return "lead_summary";
  }

  if (/contact.*(today|now)|who should i (call|contact|reach)/.test(text)) return "contact_today";
  if (/(highest|best|most).*(conversion|potential)/.test(text) || /which lead.*convert/.test(text) || /top\s*\d*\s*leads?/.test(text)) return "top_leads";
  if (/(at risk|high.?risk|might lose|losing|high.?value)/.test(text)) return "risk_value";
  if (/pipeline (value|worth)|how much.*pipeline/.test(text)) return "pipeline_value";
  if (/which source|best source|source.*(revenue|most)/.test(text)) return "source_revenue";
  if (/revenue insight|revenue breakdown|how.*revenue/.test(text)) return "revenue_insights";
  if (/why.*conversion rate.*(low|down|poor)|conversion rate low/.test(text)) return "conversion_analysis";
  if (/follow.?up.*(recommend|should|need)/.test(text)) return "follow_up_recommendations";
  if (/prioriti[sz]e|what.*focus on/.test(text)) return "prioritize";
  if (/what should i do next|next step|next action/.test(text)) return "next_action";

  return null;
}

export function runIntent(
  intent: IntentId,
  snapshot: CrmSnapshot,
  lead: LeadSnapshot | null,
  notes: NoteDTO[],
): AssistantAnswer {
  switch (intent) {
    case "contact_today":
      return contactToday(snapshot);
    case "top_leads":
      return topLeads(snapshot);
    case "risk_value":
      return riskAndValue(snapshot);
    case "pipeline_value":
      return pipelineValue(snapshot);
    case "revenue_insights":
      return revenueInsights(snapshot);
    case "source_revenue":
      return sourceRevenue(snapshot);
    case "conversion_analysis":
      return conversionAnalysis(snapshot);
    case "follow_up_recommendations":
      return followUpRecommendations(snapshot);
    case "prioritize":
      return prioritize(snapshot);
    case "next_action":
      return lead ? nextActionForLead(lead) : nextActionGeneral(snapshot);
    case "lead_summary":
      return lead ? leadSummary(lead) : noData("the selected lead");
    case "lead_explain":
      return lead ? leadExplain(lead) : noData("the selected lead");
    case "sentiment":
      return lead ? sentiment(lead, notes) : noData("the selected lead");
    case "conversation_summary":
      return lead ? conversationSummary(lead, notes) : noData("the selected lead");
    default:
      return noData("that request");
  }
}
