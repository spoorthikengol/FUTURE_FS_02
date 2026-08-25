export const QUICK_ACTIONS = [
  { id: "contact_today", label: "Who should I contact today?", requiresLead: false },
  { id: "top_leads", label: "Highest conversion potential", requiresLead: false },
  { id: "risk_value", label: "High-value & at-risk leads", requiresLead: false },
  { id: "pipeline_value", label: "Current pipeline value", requiresLead: false },
  { id: "revenue_insights", label: "Revenue insights", requiresLead: false },
  { id: "source_revenue", label: "Best-performing source", requiresLead: false },
  { id: "conversion_analysis", label: "Why is my conversion rate low?", requiresLead: false },
  { id: "follow_up_recommendations", label: "Follow-up recommendations", requiresLead: false },
  { id: "prioritize", label: "Prioritize my leads", requiresLead: false },
  { id: "next_action", label: "What should I do next?", requiresLead: false },
  { id: "lead_summary", label: "Summarize this lead", requiresLead: true },
  { id: "lead_explain", label: "Why will this lead convert?", requiresLead: true },
  { id: "sentiment", label: "Analyze sentiment", requiresLead: true },
  { id: "conversation_summary", label: "Summarize conversation", requiresLead: true },
] as const;

export type IntentId = (typeof QUICK_ACTIONS)[number]["id"];
