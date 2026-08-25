export const QUICK_ACTION_IDS = [
  "contact_today",
  "at_risk",
  "top_opportunities",
  "highest_value",
  "pipeline_overview",
  "revenue_insights",
  "source_performance",
  "follow_up_recommendations",
  "next_best_action",
] as const;

export type QuickActionId = (typeof QUICK_ACTION_IDS)[number];

export const QUICK_ACTION_META: { id: QuickActionId; label: string; hint: string }[] = [
  { id: "contact_today", label: "Contact Today", hint: "Leads due for outreach right now" },
  { id: "at_risk", label: "At Risk", hint: "Leads showing risk signals" },
  { id: "top_opportunities", label: "Top Opportunities", hint: "Ranked by conversion potential" },
  { id: "highest_value", label: "Highest Value", hint: "Sorted by deal value" },
  { id: "pipeline_overview", label: "Pipeline Overview", hint: "Open pipeline by stage" },
  { id: "revenue_insights", label: "Revenue Insights", hint: "Current, expected & forecast revenue" },
  { id: "source_performance", label: "Source Performance", hint: "Revenue & ROI by source" },
  { id: "follow_up_recommendations", label: "Follow-up Recommendations", hint: "Who needs a follow-up" },
  { id: "next_best_action", label: "Next Best Action", hint: "What to do right now" },
];
