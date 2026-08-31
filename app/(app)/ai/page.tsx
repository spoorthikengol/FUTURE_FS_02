"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";

import {
  AlertTriangle,
  Bot,
  Clock,
  DollarSign,
  Gem,
  ListChecks,
  PhoneCall,
  PieChart,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

import {
  AiResponseCard,
  QuickActionCard,
  type AssistantAnswer,
} from "@/components/ai/response-card";

import { MessageComposer } from "@/components/ai/message-composer";

import {
  QUICK_ACTION_META,
  type QuickActionId,
} from "@/lib/ai/quick-action-meta";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";

import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

import type { AssistantReply } from "@/lib/ai/service";
import type { QuickActionResult } from "@/lib/ai/quick-actions";
import type { LeadDTO, Paginated } from "@/types/crm";

/* =========================================================
   TYPES
========================================================= */

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatTurn =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "chat";
      answer: AssistantAnswer;
      mode: "live" | "demo";
      disclaimer: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "quick-action";
      result: QuickActionResult;
    }
  | {
      id: string;
      role: "assistant";
      kind: "error";
      message: string;
      retry: () => void;
    };

/* =========================================================
   QUICK ACTION ICONS
========================================================= */

const QUICK_ACTION_ICONS: Record<
  QuickActionId,
  ComponentType<{ className?: string }>
> = {
  contact_today: PhoneCall,
  at_risk: AlertTriangle,
  top_opportunities: TrendingUp,
  highest_value: Gem,
  pipeline_overview: PieChart,
  revenue_insights: DollarSign,
  source_performance: Target,
  follow_up_recommendations: Clock,
  next_best_action: ListChecks,
};

/* =========================================================
   EXAMPLE QUESTIONS
========================================================= */

const EXAMPLE_PROMPTS = [
  "Who should I contact today?",
  "Show my top opportunities",
  "What's driving revenue?",
  "Which leads are at risk?",
];

/* =========================================================
   HELPERS
========================================================= */

function uid(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

function friendlyError(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  return "Something went wrong. Please try again.";
}

/* =========================================================
   PAGE
========================================================= */

export default function AiPage() {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [leadsError, setLeadsError] = useState("");
  const [leadId, setLeadId] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  /*
   * IMPORTANT:
   * Explicitly type the history.
   * This fixes the "role: string" vs
   * "role: user | assistant" TypeScript error.
   */
  const historyRef = useRef<ChatHistoryMessage[]>([]);

  /* =======================================================
     LOAD LEADS
  ======================================================= */

  async function loadLeads() {
    try {
      const data = await api<Paginated<LeadDTO>>(
        "/api/leads?pageSize=50&sort=updatedAt&order=desc",
      );

      setLeads(data.items);
      setLeadsError("");
    } catch (err) {
      setLeadsError(friendlyError(err));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchLeads() {
      try {
        const data = await api<Paginated<LeadDTO>>(
          "/api/leads?pageSize=50&sort=updatedAt&order=desc",
        );

        if (cancelled) return;

        setLeads(data.items);
        setLeadsError("");
      } catch (err) {
        if (cancelled) return;

        setLeadsError(friendlyError(err));
      }
    }

    void fetchLeads();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, loading]);

  /* =======================================================
     SELECTED LEAD
  ======================================================= */

  const selectedLead =
    leads.find((lead) => lead.id === leadId) ?? null;

  /* =======================================================
     SEND CHAT
  ======================================================= */

  async function sendChat(
    message: string,
    intent?: string,
  ) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setTurns((previous) => [
      ...previous,
      {
        id: uid(),
        role: "user",
        text: trimmedMessage,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      /*
       * Make a properly typed copy of history.
       * This prevents TypeScript from widening role to "string".
       */
      const history: ChatHistoryMessage[] =
        historyRef.current.slice(-8);

      const result = await api<AssistantReply>(
        "/api/ai/chat",
        {
          method: "POST",

          body: JSON.stringify({
            message: trimmedMessage,
            leadId: leadId || undefined,
            intent: intent || undefined,
            history,
          }),
        },
      );

      const answer: AssistantAnswer = {
        headline: result.headline,
        sections: result.sections ?? [],
        relatedLeadIds: result.relatedLeadIds,
      };

      setTurns((previous) => [
        ...previous,
        {
          id: uid(),
          role: "assistant",
          kind: "chat",
          answer,
          mode: result.mode,
          disclaimer: result.disclaimer,
        },
      ]);

      /*
       * Update history using explicitly typed objects.
       */
      const userMessage: ChatHistoryMessage = {
        role: "user",
        content: trimmedMessage,
      };

      const assistantMessage: ChatHistoryMessage = {
        role: "assistant",
        content: result.reply,
      };

      historyRef.current = [
        ...historyRef.current,
        userMessage,
        assistantMessage,
      ].slice(-8);
    } catch (err) {
      const errorMessage = friendlyError(err);

      setTurns((previous) => [
        ...previous,
        {
          id: uid(),
          role: "assistant",
          kind: "error",
          message: errorMessage,
          retry: () =>
            void sendChat(trimmedMessage, intent),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     QUICK ACTION
  ======================================================= */

  async function runQuickAction(
    actionId: QuickActionId,
    label: string,
  ) {
    if (loading) {
      return;
    }

    setTurns((previous) => [
      ...previous,
      {
        id: uid(),
        role: "user",
        text: label,
      },
    ]);

    setLoading(true);

    try {
      const result = await api<QuickActionResult>(
        "/api/ai/quick-action",
        {
          method: "POST",

          body: JSON.stringify({
            action: actionId,
            leadId: leadId || undefined,
          }),
        },
      );

      setTurns((previous) => [
        ...previous,
        {
          id: uid(),
          role: "assistant",
          kind: "quick-action",
          result,
        },
      ]);
    } catch (err) {
      const errorMessage = friendlyError(err);

      setTurns((previous) => [
        ...previous,
        {
          id: uid(),
          role: "assistant",
          kind: "error",
          message: errorMessage,
          retry: () =>
            void runQuickAction(actionId, label),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     LEAD SELECT
  ======================================================= */

  function handleSelectLead(id: string) {
    setLeadId(id);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-5">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/10 via-transparent to-transparent p-5">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft shadow-[0_0_25px_rgba(20,184,166,0.15)]">
                <Bot
                  className="h-5 w-5 text-accent"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Velora AI
                </h1>

                <p className="mt-0.5 text-xs text-muted">
                  Your intelligent CRM copilot
                </p>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm text-muted">
              Grounded in your live leads, pipeline and analytics.
              Get actionable insights, prioritize opportunities and
              move deals forward faster.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-emerald-300">
              AI Ready
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <Card className="overflow-hidden">
        <CardHeader
          title="Quick actions"
          description="Instant, data-grounded intelligence from your CRM."
        />

        <div className="grid grid-cols-2 gap-2 p-4 pt-0 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTION_META.map((action) => {
            const Icon = QUICK_ACTION_ICONS[action.id];

            return (
              <button
                key={action.id}
                type="button"
                disabled={loading}
                onClick={() =>
                  void runQuickAction(
                    action.id,
                    action.label,
                  )
                }
                aria-label={`${action.label} — ${action.hint}`}
                className={cn(
                  "group relative flex min-h-[105px] flex-col items-start gap-2 overflow-hidden rounded-xl border border-border bg-black/10 p-3 text-left",
                  "transition-all duration-300",
                  "hover:-translate-y-1 hover:border-accent/60 hover:bg-accent/5",
                  "hover:shadow-[0_8px_30px_rgba(20,184,166,0.08)]",
                  "active:scale-[0.98]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-accent/5 blur-2xl transition-all duration-300 group-hover:bg-accent/15" />

                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft transition-transform duration-300 group-hover:scale-110">
                  <Icon
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  />
                </div>

                <div className="relative">
                  <span className="block text-xs font-medium text-foreground">
                    {action.label}
                  </span>

                  <span className="mt-1 block text-[10px] leading-snug text-muted">
                    {action.hint}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ===================================================
            CHAT AREA
        =================================================== */}

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex min-h-[540px] flex-col overflow-hidden p-0">
            {/* AI HEADER */}

            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">
                  <Sparkles
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">
                    AI Assistant
                  </p>

                  <p className="text-[10px] text-muted">
                    Your CRM intelligence layer
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live data
              </div>
            </div>

            {/* CHAT MESSAGES */}

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
            >
              {turns.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  {/* AI ICON */}

                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-2xl" />

                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft">
                      <Sparkles
                        className="h-7 w-7 text-accent"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* WELCOME */}

                  <div className="max-w-lg">
                    <h2 className="text-xl font-semibold tracking-tight">
                      Your CRM, now intelligent.
                    </h2>

                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Ask Velora AI about your leads, revenue,
                      pipeline or next best actions. Get answers
                      grounded in your actual CRM data.
                    </p>
                  </div>

                  {/* CAPABILITIES */}

                  <div className="mt-6 grid w-full max-w-xl grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-black/10 p-3">
                      <TrendingUp className="mx-auto h-4 w-4 text-accent" />

                      <p className="mt-2 text-[10px] font-medium">
                        Opportunities
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-black/10 p-3">
                      <Target className="mx-auto h-4 w-4 text-accent" />

                      <p className="mt-2 text-[10px] font-medium">
                        Lead insights
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-black/10 p-3">
                      <Zap className="mx-auto h-4 w-4 text-accent" />

                      <p className="mt-2 text-[10px] font-medium">
                        Next actions
                      </p>
                    </div>
                  </div>

                  {/* EXAMPLE QUESTIONS */}

                  <div className="mt-7 flex max-w-2xl flex-wrap justify-center gap-2">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          void sendChat(prompt)
                        }
                        className="group rounded-full border border-border bg-black/10 px-3.5 py-2 text-xs text-muted-strong transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/5 hover:text-accent disabled:opacity-50"
                      >
                        <span className="mr-1.5 text-accent opacity-60 group-hover:opacity-100">
                          ✦
                        </span>

                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((turn) => {
                  /* USER MESSAGE */

                  if (turn.role === "user") {
                    return (
                      <div
                        key={turn.id}
                        className="flex justify-end gap-2"
                      >
                        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-accent/20 bg-accent-soft px-4 py-2.5 text-sm text-foreground shadow-sm">
                          {turn.text}
                        </div>

                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-white/5">
                          <User
                            className="h-3.5 w-3.5 text-muted"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    );
                  }

                  /* ASSISTANT MESSAGE */

                  return (
                    <div
                      key={turn.id}
                      className="flex gap-2"
                    >
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft">
                        <Bot
                          className="h-3.5 w-3.5 text-accent"
                          aria-hidden="true"
                        />
                      </div>

                      {turn.kind === "chat" ? (
                        <AiResponseCard
                          answer={turn.answer}
                          mode={turn.mode}
                          disclaimer={turn.disclaimer}
                          onSelectLead={handleSelectLead}
                          className="max-w-[90%]"
                        />
                      ) : turn.kind === "quick-action" ? (
                        <QuickActionCard
                          result={turn.result}
                          onSelectLead={handleSelectLead}
                          className="max-w-[90%]"
                        />
                      ) : (
                        <div className="max-w-[90%]">
                          <ErrorState
                            message={turn.message}
                            onRetry={turn.retry}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* =================================================
                  THINKING
              ================================================= */}

              {loading ? (
                <div
                  className="flex gap-2"
                  role="status"
                  aria-live="polite"
                >
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft">
                    <Bot
                      className="h-3.5 w-3.5 animate-pulse text-accent"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="rounded-2xl rounded-tl-md border border-border bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
                      </div>

                      <span className="text-[11px] text-muted">
                        Analyzing your CRM...
                      </span>
                    </div>

                    <span className="sr-only">
                      Velora AI is thinking
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* =================================================
                COMPOSER
            ================================================= */}

            <div className="border-t border-border bg-black/10 p-3 sm:p-4">
              <Label
                htmlFor="ai-chat-input"
                className="sr-only"
              >
                Ask Velora AI
              </Label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  id="ai-chat-input"
                  className="min-h-[46px] resize-none rounded-xl py-2.5"
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      void sendChat(input);
                    }
                  }}
                  placeholder={
                    selectedLead
                      ? `Ask anything about ${selectedLead.name}...`
                      : "Ask Velora AI about your pipeline, leads or revenue..."
                  }
                />

                <Button
                  onClick={() =>
                    void sendChat(input)
                  }
                  disabled={
                    loading || !input.trim()
                  }
                  className="h-[46px] rounded-xl px-4 sm:self-end"
                  aria-label="Send message"
                >
                  {loading ? (
                    <span className="text-xs">
                      Thinking...
                    </span>
                  ) : (
                    <Send
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              </div>

              <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-muted">
                <Sparkles className="h-2.5 w-2.5" />

                Velora AI uses your CRM data to provide recommendations
              </div>
            </div>
          </Card>
        </div>

        {/* =====================================================
            RIGHT SIDEBAR
        ===================================================== */}

        <div className="flex flex-col gap-4">
          {/* ===================================================
              LEAD CONTEXT
          =================================================== */}

          <Card
            className={cn(
              "transition-all duration-300",
              selectedLead &&
                "border-accent/50 shadow-[0_0_25px_rgba(20,184,166,0.06)]",
            )}
          >
            <CardHeader
              title="Lead context"
              description="Ground AI answers in a specific lead."
            />

            <Label
              htmlFor="ai-lead-select"
              className="sr-only"
            >
              Select a lead
            </Label>

            {leadsError ? (
              <ErrorState
                message={leadsError}
                onRetry={loadLeads}
              />
            ) : (
              <Select
                id="ai-lead-select"
                value={leadId}
                onChange={(event) =>
                  setLeadId(event.target.value)
                }
              >
                <option value="">
                  No lead selected
                </option>

                {leads.map((lead) => (
                  <option
                    key={lead.id}
                    value={lead.id}
                  >
                    {lead.name} · {lead.company}
                  </option>
                ))}
              </Select>
            )}

            {selectedLead ? (
              <div className="mt-3 rounded-xl border border-accent/20 bg-accent-soft/30 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">
                    <User className="h-4 w-4 text-accent" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {selectedLead.name}
                    </p>

                    <p className="truncate text-[10px] text-muted">
                      {selectedLead.company}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs text-muted">
                  <div>
                    <dt>Status</dt>

                    <dd className="mt-0.5 text-muted-strong">
                      {selectedLead.status}
                    </dd>
                  </div>

                  <div>
                    <dt>Value</dt>

                    <dd className="mt-0.5 text-muted-strong">
                      $
                      {selectedLead.value.toLocaleString()}
                    </dd>
                  </div>

                  <div>
                    <dt>Source</dt>

                    <dd className="mt-0.5 text-muted-strong">
                      {selectedLead.source}
                    </dd>
                  </div>

                  <div>
                    <dt>Priority</dt>

                    <dd className="mt-0.5 text-muted-strong">
                      {selectedLead.priority}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </Card>

          {/* ===================================================
              REPLY GENERATOR
          =================================================== */}

          {selectedLead ? (
            <Card className="border-accent/20">
              <CardHeader
                title="Generate a reply"
                description="Create a personalized customer message."
              />

              <MessageComposer
                leadId={selectedLead.id}
                leadName={selectedLead.name}
              />
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Generate a reply"
                description="Email or WhatsApp, ready to copy."
              />

              <div className="rounded-xl border border-dashed border-border bg-black/10 p-5 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                  <Send className="h-4 w-4 text-muted" />
                </div>

                <p className="mt-3 text-xs font-medium text-muted-strong">
                  Select a lead first
                </p>

                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Velora AI will generate a personalized
                  email or WhatsApp reply based on the lead.
                </p>
              </div>
            </Card>
          )}

          {/* ===================================================
              PRO TIP
          =================================================== */}

          <div className="rounded-xl border border-border bg-gradient-to-br from-accent/5 to-transparent p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>

              <div>
                <p className="text-xs font-medium">
                  Pro tip
                </p>

                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Select a lead before asking questions to
                  unlock deeper AI insights about conversion
                  potential, sentiment and next best action.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}