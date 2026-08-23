import { getAiConfig } from "@/lib/env";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";
import { Note } from "@/models/Note";
import type { LeadDTO } from "@/types/crm";

export type LeadInsights = {
  score: number;
  quality: "High Potential" | "Promising" | "Needs Nurture" | "At Risk";
  summary: string;
  keySignals: string[];
  recommendedAction: string;
  factors: { label: string; impact: "positive" | "neutral" | "negative"; detail: string }[];
  disclaimer: string;
  mode: "live" | "demo";
};

export type GeneratedEmail = {
  subject: string;
  body: string;
  mode: "live" | "demo";
};

const DISCLAIMER =
  "AI recommendation only — not a guaranteed prediction of conversion or revenue.";

function statusScore(status: LeadDTO["status"]) {
  const map = {
    NEW: 18,
    CONTACTED: 28,
    QUALIFIED: 42,
    PROPOSAL: 52,
    CONVERTED: 72,
    LOST: 8,
  };
  return map[status];
}

function fallbackInsights(
  lead: LeadDTO,
  notesCount: number,
  overdueFollowUps: number,
): LeadInsights {
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
  score = Math.max(8, Math.min(96, score));

  const quality: LeadInsights["quality"] =
    lead.status === "LOST"
      ? "At Risk"
      : score >= 75
        ? "High Potential"
        : score >= 55
          ? "Promising"
          : "Needs Nurture";

  const recommendedAction =
    overdueFollowUps > 0
      ? "Recover the overdue follow-up within 24 hours before intent cools."
      : lead.status === "NEW"
        ? "Make first contact today and confirm budget, timeline, and owner."
        : lead.status === "PROPOSAL"
          ? "Schedule a decision checkpoint and address remaining objections."
          : lead.status === "QUALIFIED"
            ? "Send a tailored proposal with clear next steps and value proof."
            : lead.status === "CONVERTED"
              ? "Plan onboarding and identify expansion opportunities."
              : "Send a concise check-in that references their original request.";

  return {
    score,
    quality,
    summary: `${lead.name} at ${lead.company} is in ${lead.status.toLowerCase()} with a deal value of $${lead.value.toLocaleString()}. Engagement, source quality, and follow-up hygiene were used to estimate fit.`,
    keySignals: [
      `${lead.source} source with ${lead.priority.toLowerCase()} priority`,
      notesCount ? `${notesCount} note${notesCount === 1 ? "" : "s"} on file` : "Limited note history",
      overdueFollowUps ? `${overdueFollowUps} overdue follow-up${overdueFollowUps === 1 ? "" : "s"}` : "Follow-up cadence is current",
      lead.message ? "Inbound message provides buying context" : "No detailed inbound message",
    ],
    recommendedAction,
    factors: [
      {
        label: "Pipeline stage",
        impact: lead.status === "LOST" ? "negative" : lead.status === "NEW" ? "neutral" : "positive",
        detail: `Current status is ${lead.status}.`,
      },
      {
        label: "Lead value",
        impact: lead.value >= 40000 ? "positive" : lead.value >= 15000 ? "neutral" : "negative",
        detail: `Estimated value is $${lead.value.toLocaleString()}.`,
      },
      {
        label: "Follow-up hygiene",
        impact: overdueFollowUps ? "negative" : "positive",
        detail: overdueFollowUps
          ? "Overdue tasks reduce conversion probability."
          : "Scheduled follow-ups are in good shape.",
      },
      {
        label: "Context depth",
        impact: notesCount + (lead.message ? 1 : 0) >= 2 ? "positive" : "neutral",
        detail: "Notes and original message inform personalization quality.",
      },
    ],
    disclaimer: DISCLAIMER,
    mode: "demo",
  };
}

function fallbackEmail(lead: LeadDTO, notes: string[], instruction?: string): GeneratedEmail {
  const subject =
    lead.status === "PROPOSAL"
      ? `Next steps for ${lead.company} × VeloraCRM`
      : `Following up, ${lead.name.split(" ")[0]}`;

  const body = `Hi ${lead.name.split(" ")[0]},

Thank you for sharing more about ${lead.company}'s goals${lead.message ? ` — especially around “${lead.message.slice(0, 110)}${lead.message.length > 110 ? "…" : ""}”` : ""}.

Based on where things stand (${lead.status.toLowerCase()}${lead.value ? ` / ~$${lead.value.toLocaleString()} potential` : ""}), I recommend we ${
    lead.status === "NEW"
      ? "book a 20-minute intro to map your current lead flow"
      : lead.status === "PROPOSAL"
        ? "lock a short decision call to walk through remaining questions"
        : "align on a concrete next step this week"
  }.

${notes[0] ? `I also noted internally: ${notes[0]}\n\n` : ""}${instruction ? `Additional focus: ${instruction}\n\n` : ""}Would ${lead.followUpDate ? "the time already on the calendar" : "tomorrow or Thursday"} work on your side?

Best,
Alex Rivera
VeloraCRM
`;

  return { subject, body: body.trim(), mode: "demo" };
}

async function completeLeadContext(leadId: string) {
  const leadDoc = await Lead.findById(leadId);
  if (!leadDoc) return null;
  const [notes, followUps] = await Promise.all([
    Note.find({ leadId }).sort({ createdAt: -1 }).limit(8).lean(),
    FollowUp.find({ leadId }).sort({ date: 1 }).lean(),
  ]);
  return { leadDoc, notes, followUps };
}

async function callLlm(prompt: string, system: string) {
  const { apiKey, baseUrl, model } = getAiConfig();
  if (!apiKey) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error("AI provider error", response.status);
    return null;
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? null;
}

export async function generateLeadInsights(lead: LeadDTO): Promise<LeadInsights> {
  const context = await completeLeadContext(lead.id);
  const notesCount = context?.notes.length ?? 0;
  const overdue = (context?.followUps ?? []).filter((item) => item.status === "OVERDUE").length;
  const fallback = fallbackInsights(lead, notesCount, overdue);

  const live = await callLlm(
    JSON.stringify({
      lead,
      notes: context?.notes.map((note) => note.content) ?? [],
      followUps: context?.followUps ?? [],
    }),
    "You are Velora AI, a CRM copilot. Return compact JSON with keys score (0-100), quality, summary, keySignals (array), recommendedAction, factors (array of {label, impact, detail}). These are recommendations, not guarantees.",
  );

  if (!live) return fallback;

  try {
    const parsed = JSON.parse(live) as Partial<LeadInsights>;
    return {
      ...fallback,
      ...parsed,
      score: Number(parsed.score ?? fallback.score),
      disclaimer: DISCLAIMER,
      mode: "live",
    };
  } catch {
    return { ...fallback, summary: live, mode: "live" };
  }
}

export async function generateLeadEmail(lead: LeadDTO, instruction?: string): Promise<GeneratedEmail> {
  const context = await completeLeadContext(lead.id);
  const notes = context?.notes.map((note) => note.content) ?? [];
  const fallback = fallbackEmail(lead, notes, instruction);

  const live = await callLlm(
    JSON.stringify({ lead, notes, followUps: context?.followUps ?? [], instruction }),
    "Write a professional B2B email. Return JSON {subject, body}. Do not claim the email was sent. Keep it concise and specific.",
  );

  if (!live) return fallback;
  try {
    const parsed = JSON.parse(live) as Partial<GeneratedEmail>;
    return {
      subject: parsed.subject || fallback.subject,
      body: parsed.body || fallback.body,
      mode: "live",
    };
  } catch {
    return { subject: fallback.subject, body: live, mode: "live" };
  }
}

export async function generateAssistantReply(input: {
  message: string;
  lead?: LeadDTO | null;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  const lead = input.lead;
  const fallback = lead
    ? `Here's a Velora AI recommendation for ${lead.name} (${lead.company}):\n\n• Status: ${lead.status}\n• Value: $${lead.value.toLocaleString()}\n• Next action: ${fallbackInsights(lead, 0, 0).recommendedAction}\n\n${DISCLAIMER}`
    : `I can help with lead summaries, next actions, conversion analysis, and follow-up suggestions. Open a lead or mention a company name to get a more specific recommendation.\n\n${DISCLAIMER}`;

  const live = await callLlm(
    JSON.stringify({
      message: input.message,
      lead,
      history: input.history.slice(-8),
    }),
    "You are Velora AI, an assistant inside VeloraCRM. Be concise, practical, and clearly label suggestions as recommendations.",
  );

  return {
    reply: live || fallback,
    mode: live ? ("live" as const) : ("demo" as const),
    disclaimer: DISCLAIMER,
  };
}
