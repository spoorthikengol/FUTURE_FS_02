import {
  buildCrmSnapshot,
  computeLeadScore,
  insightFactorsFor,
  qualityFromScore,
  recommendedActionFor,
  type LeadQuality,
} from "@/lib/ai/context";
import { computeDealRisk, type DealRiskResult } from "@/lib/ai/deal-risk";
import { QUICK_ACTIONS, type IntentId } from "@/lib/ai/actions";
import {
  classifyIntent,
  runIntent,
  type AssistantAnswer,
} from "@/lib/ai/intents";
import { getAiConfig } from "@/lib/env";
import { resolveFollowUpStatus } from "@/lib/followups";
import { toNoteDTO } from "@/lib/serializers";
import { FollowUp } from "@/models/FollowUp";
import { Lead } from "@/models/Lead";
import { Note } from "@/models/Note";
import type {
  FollowUpDTO,
  FollowUpStatus,
  LeadDTO,
} from "@/types/crm";

export type LeadInsights = {
  score: number;
  quality: LeadQuality;
  summary: string;
  keySignals: string[];
  recommendedAction: string;
  factors: {
    label: string;
    impact: "positive" | "neutral" | "negative";
    detail: string;
  }[];
  disclaimer: string;
  mode: "live" | "demo";
  dealRisk: DealRiskResult;
};

export type GeneratedEmail = {
  subject: string;
  body: string;
  mode: "live" | "demo";
};

export type GeneratedWhatsApp = {
  message: string;
  mode: "live" | "demo";
};

export type AssistantReply = AssistantAnswer & {
  reply: string;
  mode: "live" | "demo";
  disclaimer: string;
  intent: string | null;
};

const DISCLAIMER =
  "AI recommendation only — not a guaranteed prediction of conversion or revenue.";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fallbackInsights(
  lead: LeadDTO,
  notesCount: number,
  overdueFollowUps: number,
): Omit<LeadInsights, "dealRisk"> {
  const score = computeLeadScore(
    lead,
    notesCount,
    overdueFollowUps,
  );

  const quality = qualityFromScore(
    lead.status,
    score,
  );

  const recommendedAction = recommendedActionFor(
    lead,
    overdueFollowUps,
  );

  return {
    score,
    quality,

    summary:
      `${lead.name} at ${lead.company} is in ` +
      `${lead.status.toLowerCase()} with a deal value of ` +
      `$${lead.value.toLocaleString()}. ` +
      `Engagement, source quality, and follow-up hygiene were used ` +
      `to estimate fit.`,

    keySignals: [
      `${lead.source} source with ${lead.priority.toLowerCase()} priority`,

      notesCount
        ? `${notesCount} note${notesCount === 1 ? "" : "s"} on file`
        : "Limited note history",

      overdueFollowUps
        ? `${overdueFollowUps} overdue follow-up${
            overdueFollowUps === 1 ? "" : "s"
          }`
        : "Follow-up cadence is current",

      lead.message
        ? "Inbound message provides buying context"
        : "No detailed inbound message",
    ],

    recommendedAction,

    factors: insightFactorsFor(
      lead,
      overdueFollowUps,
      notesCount,
    ),

    disclaimer: DISCLAIMER,
    mode: "demo",
  };
}

function fallbackEmail(
  lead: LeadDTO,
  notes: string[],
  instruction?: string,
): GeneratedEmail {
  const firstName = lead.name.split(" ")[0];

  const subject =
    lead.status === "PROPOSAL"
      ? `Next steps for ${lead.company} × VeloraCRM`
      : `Following up, ${firstName}`;

  const messageContext = lead.message
    ? ` — especially around “${lead.message.slice(0, 110)}${
        lead.message.length > 110 ? "…" : ""
      }”`
    : "";

  const valueContext = lead.value
    ? ` / ~$${lead.value.toLocaleString()} potential`
    : "";

  const nextStep =
    lead.status === "NEW"
      ? "book a 20-minute intro to map your current lead flow"
      : lead.status === "PROPOSAL"
        ? "lock a short decision call to walk through remaining questions"
        : "align on a concrete next step this week";

  const noteSection = notes[0]
    ? `I also noted internally: ${notes[0]}\n\n`
    : "";

  const instructionSection = instruction
    ? `Additional focus: ${instruction}\n\n`
    : "";

  const followUpQuestion = lead.followUpDate
    ? "the time already on the calendar"
    : "tomorrow or Thursday";

  const body = `Hi ${firstName},

Thank you for sharing more about ${lead.company}'s goals${messageContext}.

Based on where things stand (${lead.status.toLowerCase()}${valueContext}), I recommend we ${nextStep}.

${noteSection}${instructionSection}Would ${followUpQuestion} work on your side?

Best,

Alex Rivera

VeloraCRM`;

  return {
    subject,
    body: body.trim(),
    mode: "demo",
  };
}

function fallbackWhatsApp(
  lead: LeadDTO,
  notes: string[],
  instruction?: string,
): GeneratedWhatsApp {
  const firstName = lead.name.split(" ")[0];

  const opener =
    lead.status === "NEW"
      ? `Hi ${firstName}! Thanks for reaching out to VeloraCRM.`
      : lead.status === "PROPOSAL"
        ? `Hi ${firstName}, quick check-in on the proposal for ${lead.company}.`
        : `Hi ${firstName}, following up from VeloraCRM.`;

  const middle = lead.message
    ? `Wanted to follow up on “${lead.message.slice(0, 80)}${
        lead.message.length > 80 ? "…" : ""
      }”.`
    : "Wanted to see how things are progressing on your end.";

  const noteLine = notes[0]
    ? ` One quick note from our side: ${notes[0].slice(0, 100)}.`
    : "";

  const instructionLine = instruction
    ? ` ${instruction}`
    : "";

  const closing = lead.followUpDate
    ? "Does our scheduled time still work for you?"
    : "Got 10 minutes this week for a quick call?";

  const message =
    `${opener} ${middle}${noteLine}${instructionLine} ${closing}`
      .replace(/\s+/g, " ")
      .trim();

  return {
    message,
    mode: "demo",
  };
}

async function completeLeadContext(leadId: string) {
  const leadDoc = await Lead.findById(leadId);

  if (!leadDoc) {
    return null;
  }

  const [notes, followUps] = await Promise.all([
    Note.find({
      leadId,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),

    FollowUp.find({
      leadId,
    })
      .sort({ date: 1 })
      .lean(),
  ]);

  return {
    leadDoc,
    notes,
    followUps,
  };
}

async function callLlm(
  prompt: string,
  system: string,
): Promise<string | null> {
  const {
    apiKey,
    baseUrl,
    model,
  } = getAiConfig();

  if (!apiKey) {
    return null;
  }

  // One retry with a short backoff, but only for transient failures
  // (429 rate limit, 5xx provider errors) — never for 4xx client
  // errors like a bad/expired key, which won't succeed on retry.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    // Guards against a hung provider request leaving the CRM request
    // pending indefinitely; the rest of the app must stay responsive
    // even if the AI provider never answers.
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            model,
            temperature: 0.4,

            messages: [
              {
                role: "system",
                content: system,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),

          signal: controller.signal,
        },
      );

      if (!response.ok) {
        // Never log response bodies here — some providers echo the
        // request (which could include the key in error payloads on
        // misconfigured proxies); the status code alone is enough to
        // diagnose from server logs without risking a key leak.
        console.error(
          "AI provider error",
          response.status,
        );

        const isTransient = response.status === 429 || response.status >= 500;
        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        return null;
      }

      const json = (await response.json()) as {
        choices?: {
          message?: {
            content?: string;
          };
        }[];
      };

      return (
        json.choices?.[0]?.message?.content ?? null
      );
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";

      console.error(
        isAbort
          ? "AI provider request timed out"
          : "AI provider request failed",
        isAbort ? undefined : error,
      );

      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Deal risk                                                                  */
/* -------------------------------------------------------------------------- */

function computeDealRiskForLead(
  lead: LeadDTO,
  followUps: FollowUpDTO[],
): DealRiskResult {
  return computeDealRisk(lead, followUps);
}
/* -------------------------------------------------------------------------- */
/* Lead insights                                                              */
/* -------------------------------------------------------------------------- */

export async function generateLeadInsights(
  lead: LeadDTO,
): Promise<LeadInsights> {
  const context =
    await completeLeadContext(lead.id);

  const notesCount =
    context?.notes.length ?? 0;

  const overdue =
    context?.followUps.filter(
      (item) =>
        resolveFollowUpStatus(
          item.date,
          item.time,
          item.status,
        ) === "OVERDUE",
    ).length ?? 0;

  const fallback = fallbackInsights(
    lead,
    notesCount,
    overdue,
  );

  const dealRisk =
    computeDealRiskForLead(
      lead,
      context?.followUps ?? [],
    );

  const live = await callLlm(
    JSON.stringify({
      lead,

      notes:
        context?.notes.map(
          (note) => note.content,
        ) ?? [],

      followUps:
        context?.followUps ?? [],
    }),

    "You are Velora AI, a CRM copilot. " +
      "Return compact JSON with keys score (0-100), " +
      "quality, summary, keySignals (array), " +
      "recommendedAction, factors (array of " +
      "{label, impact, detail}). " +
      "These are recommendations, not guarantees.",
  );

  if (!live) {
    return {
      ...fallback,
      dealRisk,
    };
  }

  try {
    const parsed =
      JSON.parse(live) as Partial<LeadInsights>;

    return {
      ...fallback,
      ...parsed,

      score: Number(
        parsed.score ?? fallback.score,
      ),

      disclaimer: DISCLAIMER,
      mode: "live",
      dealRisk,
    };
  } catch {
    return {
      ...fallback,
      summary: live,
      mode: "live",
      dealRisk,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Email                                                                      */
/* -------------------------------------------------------------------------- */

export async function generateLeadEmail(
  lead: LeadDTO,
  instruction?: string,
): Promise<GeneratedEmail> {
  const context =
    await completeLeadContext(lead.id);

  const notes =
    context?.notes.map(
      (note) => note.content,
    ) ?? [];

  const fallback =
    fallbackEmail(
      lead,
      notes,
      instruction,
    );

  const live = await callLlm(
    JSON.stringify({
      lead,
      notes,
      followUps:
        context?.followUps ?? [],
      instruction,
    }),

    "Write a professional B2B email. " +
      "Return JSON {subject, body}. " +
      "Do not claim the email was sent. " +
      "Keep it concise and specific.",
  );

  if (!live) {
    return fallback;
  }

  try {
    const parsed =
      JSON.parse(live) as Partial<GeneratedEmail>;

    return {
      subject:
        parsed.subject ||
        fallback.subject,

      body:
        parsed.body ||
        fallback.body,

      mode: "live",
    };
  } catch {
    return {
      subject: fallback.subject,
      body: live,
      mode: "live",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* WhatsApp                                                                   */
/* -------------------------------------------------------------------------- */

export async function generateLeadWhatsApp(
  lead: LeadDTO,
  instruction?: string,
): Promise<GeneratedWhatsApp> {
  const context =
    await completeLeadContext(lead.id);

  const notes =
    context?.notes.map(
      (note) => note.content,
    ) ?? [];

  const fallback =
    fallbackWhatsApp(
      lead,
      notes,
      instruction,
    );

  const live = await callLlm(
    JSON.stringify({
      lead,
      notes,
      followUps:
        context?.followUps ?? [],
      instruction,
    }),

    "Write a short, friendly WhatsApp message " +
      "(2-4 sentences, no markdown, conversational tone, " +
      "may use at most one emoji) for a B2B sales follow-up. " +
      "Return JSON {message}. " +
      "Do not claim the message was sent.",
  );

  if (!live) {
    return fallback;
  }

  try {
    const parsed =
      JSON.parse(live) as Partial<GeneratedWhatsApp>;

    return {
      message:
        parsed.message ||
        fallback.message,

      mode: "live",
    };
  } catch {
    return {
      message: live,
      mode: "live",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Assistant                                                                  */
/* -------------------------------------------------------------------------- */

const KNOWN_INTENTS =
  new Set<string>(
    QUICK_ACTIONS.map(
      (action) => action.id,
    ),
  );

function answerToText(
  answer: AssistantAnswer,
): string {
  const lines: string[] = [
    answer.headline,
  ];

  for (const section of answer.sections) {
    if (section.heading) {
      lines.push(
        `\n${section.heading}`,
      );
    }

    if (section.paragraphs) {
      lines.push(
        ...section.paragraphs,
      );
    }

    if (section.bullets) {
      lines.push(
        ...section.bullets.map(
          (item) => `• ${item}`,
        ),
      );
    }

    if (section.table) {
      lines.push(
        section.table.headers.join(
          " | ",
        ),
      );

      lines.push(
        ...section.table.rows.map(
          (row) => row.join(" | "),
        ),
      );
    }
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Main assistant                                                             */
/* -------------------------------------------------------------------------- */

export async function generateAssistantReply(
  input: {
    message: string;

    lead?: LeadDTO | null;

    history: {
      role: "user" | "assistant";
      content: string;
    }[];

    intent?: string | null;
  },
): Promise<AssistantReply> {
  const lead =
    input.lead ?? null;

  const snapshot =
    await buildCrmSnapshot();

  const leadSnapshot =
    lead
      ? snapshot.leads.find(
          (item) =>
            item.lead.id === lead.id,
        ) ?? null
      : null;

  const notes = leadSnapshot
    ? (
        await Note.find({
          leadId: lead!.id,
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      ).map(toNoteDTO)
    : [];

  const requestedIntent: IntentId | null =
    input.intent &&
    KNOWN_INTENTS.has(input.intent)
      ? (input.intent as IntentId)
      : null;

  const intent =
    requestedIntent ??
    classifyIntent(
      input.message,
      Boolean(leadSnapshot),
    );

  /* ---------------------------------------------------------------------- */
  /* Deterministic intent                                                   */
  /* ---------------------------------------------------------------------- */

  if (intent) {
    const answer =
      runIntent(
        intent,
        snapshot,
        leadSnapshot,
        notes,
      );

    let headline =
      answer.headline;

    let mode:
      | "live"
      | "demo" = "demo";

    const { apiKey } =
      getAiConfig();

    if (apiKey) {
      const polished =
        await callLlm(
          JSON.stringify({
            facts: answer,
            question:
              input.message,
          }),

          "You are Velora AI. " +
            "Rewrite ONLY a single friendly headline sentence " +
            "(max 30 words) using solely the facts given in 'facts'. " +
            "Do not add any number, name, or claim not present in facts. " +
            "Return plain text only, no JSON, no quotation marks.",
        );

      if (
        polished &&
        polished.trim()
      ) {
        headline =
          polished
            .trim()
            .replace(
              /^"|"$/g,
              "",
            );

        mode = "live";
      }
    }

    const finalAnswer: AssistantAnswer =
      {
        ...answer,
        headline,
      };

    return {
      ...finalAnswer,

      reply:
        answerToText(
          finalAnswer,
        ),

      mode,
      disclaimer: DISCLAIMER,
      intent,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* No recognized intent                                                   */
  /* ---------------------------------------------------------------------- */

  const fallbackText =
    leadSnapshot && lead
      ? `Here's a Velora AI recommendation for ${lead.name} (${lead.company}):

• Status: ${lead.status}
• Value: $${lead.value.toLocaleString()}
• Next action: ${recommendedActionFor(
          lead,
          leadSnapshot.overdueFollowUps,
        )}

${DISCLAIMER}`
      : `I can help with lead summaries, next actions, conversion predictions, pipeline value, revenue insights, and follow-up suggestions. Try "Which leads should I contact today?" or "What is my current pipeline value?"

Right now you have ${snapshot.totalLeads} leads and an open pipeline of $${snapshot.openPipelineValue.toLocaleString()}.

${DISCLAIMER}`;

  const topLeadsForContext =
    [...snapshot.leads]
      .sort(
        (a, b) =>
          b.score - a.score,
      )
      .slice(0, 5)
      .map((item) => ({
        name:
          item.lead.name,

        company:
          item.lead.company,

        score:
          item.score,

        status:
          item.lead.status,

        value:
          item.lead.value,
      }));

  const live =
    await callLlm(
      JSON.stringify({
        message:
          input.message,

        lead,

        history:
          input.history.slice(-8),

        crmSnapshot: {
          totalLeads:
            snapshot.totalLeads,

          openPipelineValue:
            snapshot.openPipelineValue,

          conversionRate:
            snapshot.analytics.kpis
              .conversionRate.value,

          currentRevenue:
            snapshot.analytics.forecast
              .currentRevenue,

          allTimeRevenue:
            snapshot.analytics.kpis
              .revenue.value,

          topLeads:
            topLeadsForContext,
        },
      }),

      "You are Velora AI, an assistant inside VeloraCRM. " +
        "Answer using ONLY the facts in message/lead/history/crmSnapshot. " +
        "Never invent lead names, numbers, or outcomes not present in the provided data. " +
        "If the question needs data that isn't included, clearly say the data is unavailable. " +
        "Be concise, practical, and label suggestions as recommendations, not guarantees.",
    );

  return {
    headline: live
      ? live
          .split("\n")[0]
          .slice(0, 240)
      : fallbackText
          .split("\n")[0],

    sections: [],

    reply:
      live ||
      fallbackText,

    mode:
      live
        ? "live"
        : "demo",

    disclaimer:
      DISCLAIMER,

    intent: null,
  };
}