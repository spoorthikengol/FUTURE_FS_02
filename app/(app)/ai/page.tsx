"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { AiResponseCard, QuickActionCard, type AssistantAnswer } from "@/components/ai/response-card";
import { MessageComposer } from "@/components/ai/message-composer";
import { QUICK_ACTION_META, type QuickActionId } from "@/lib/ai/quick-action-meta";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { AssistantReply } from "@/lib/ai/service";
import type { QuickActionResult } from "@/lib/ai/quick-actions";
import type { LeadDTO, Paginated } from "@/types/crm";

type ChatTurn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; kind: "chat"; answer: AssistantAnswer; mode: "live" | "demo"; disclaimer: string }
  | { id: string; role: "assistant"; kind: "quick-action"; result: QuickActionResult }
  | { id: string; role: "assistant"; kind: "error"; message: string; retry: () => void };

const QUICK_ACTION_ICONS: Record<QuickActionId, React.ComponentType<{ className?: string }>> = {
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

const EXAMPLE_PROMPTS = [
  "Who should I contact today?",
  "Show my top opportunities",
  "What's driving revenue?",
  "Which leads are at risk?",
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function friendlyError(err: unknown) {
  return err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
}

export default function AiPage() {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [leadsError, setLeadsError] = useState("");
  const [leadId, setLeadId] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  async function loadLeads() {
    try {
      const data = await api<Paginated<LeadDTO>>("/api/leads?pageSize=50&sort=updatedAt&order=desc");
      setLeads(data.items);
      setLeadsError("");
    } catch (err) {
      setLeadsError(friendlyError(err));
    }
  }

  useEffect(() => {
    let cancelled = false;
    api<Paginated<LeadDTO>>("/api/leads?pageSize=50&sort=updatedAt&order=desc")
      .then((data) => {
        if (cancelled) return;
        setLeads(data.items);
        setLeadsError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLeadsError(friendlyError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  const selectedLead = leads.find((lead) => lead.id === leadId) ?? null;

  async function sendChat(message: string, intent?: string) {
    if (!message.trim() || loading) return;
    setTurns((prev) => [...prev, { id: uid(), role: "user", text: message }]);
    setInput("");
    setLoading(true);

    try {
      const result = await api<AssistantReply>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          leadId: leadId || undefined,
          intent,
          history: historyRef.current.slice(-8),
        }),
      });
      const answer: AssistantAnswer = {
        headline: result.headline,
        sections: result.sections ?? [],
        relatedLeadIds: result.relatedLeadIds,
      };
      setTurns((prev) => [
        ...prev,
        { id: uid(), role: "assistant", kind: "chat", answer, mode: result.mode, disclaimer: result.disclaimer },
      ]);
      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: message },
        { role: "assistant" as const, content: result.reply },
      ].slice(-8);
    } catch (err) {
      const message2 = friendlyError(err);
      setTurns((prev) => [
        ...prev,
        { id: uid(), role: "assistant", kind: "error", message: message2, retry: () => void sendChat(message, intent) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runQuickAction(actionId: QuickActionId, label: string) {
    if (loading) return;
    setTurns((prev) => [...prev, { id: uid(), role: "user", text: label }]);
    setLoading(true);

    try {
      const result = await api<QuickActionResult>("/api/ai/quick-action", {
        method: "POST",
        body: JSON.stringify({ action: actionId, leadId: leadId || undefined }),
      });
      setTurns((prev) => [...prev, { id: uid(), role: "assistant", kind: "quick-action", result }]);
    } catch (err) {
      const message = friendlyError(err);
      setTurns((prev) => [
        ...prev,
        { id: uid(), role: "assistant", kind: "error", message, retry: () => void runQuickAction(actionId, label) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectLead(id: string) {
    setLeadId(id);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Bot className="h-6 w-6 text-accent" aria-hidden="true" /> Velora AI
        </h1>
        <p className="text-sm text-muted">
          Grounded in your live leads, pipeline, and analytics. Recommendations only — not guaranteed outcomes.
        </p>
      </div>

      <Card>
        <CardHeader title="Quick actions" description="One-click, data-grounded answers about your pipeline." />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTION_META.map((action) => {
            const Icon = QUICK_ACTION_ICONS[action.id];
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => void runQuickAction(action.id, action.label)}
                disabled={loading}
                aria-label={`${action.label} — ${action.hint}`}
                className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-black/10 p-3 text-left transition hover:border-accent/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="text-xs font-medium text-foreground">{action.label}</span>
                <span className="text-[11px] leading-snug text-muted">{action.hint}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex min-h-[480px] flex-col p-0">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {turns.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
                  <Sparkles className="h-8 w-8 text-accent" aria-hidden="true" />
                  <div>
                    <p className="text-base font-medium text-foreground">What can I help you with?</p>
                    <p className="mt-1 text-sm text-muted">
                      Ask about your pipeline, get lead-specific insights, or try one of these:
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendChat(prompt)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-strong transition hover:border-accent/60 hover:text-accent"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((turn) => {
                  if (turn.role === "user") {
                    return (
                      <div key={turn.id} className="flex justify-end gap-2">
                        <div className="max-w-[85%] rounded-xl bg-accent-soft px-3 py-2 text-sm text-foreground">
                          {turn.text}
                        </div>
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5">
                          <User className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={turn.id} className="flex gap-2">
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                        <Bot className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
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
                        <QuickActionCard result={turn.result} onSelectLead={handleSelectLead} className="max-w-[90%]" />
                      ) : (
                        <div className="max-w-[90%]">
                          <ErrorState message={turn.message} onRetry={turn.retry} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {loading ? (
                <div className="flex gap-2" role="status" aria-live="polite">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                    <Bot className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1 rounded-xl bg-white/3 px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                    <span className="sr-only">Velora AI is thinking…</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border p-3 sm:p-4">
              <Label htmlFor="ai-chat-input" className="sr-only">
                Ask Velora AI
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  id="ai-chat-input"
                  className="min-h-[44px] resize-none py-2.5"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendChat(input);
                    }
                  }}
                  placeholder={selectedLead ? `Ask about ${selectedLead.name}...` : "Ask about your pipeline, leads, or revenue..."}
                />
                <Button
                  onClick={() => void sendChat(input)}
                  disabled={loading || !input.trim()}
                  className="sm:self-end"
                  aria-label="Send message"
                >
                  {loading ? "Thinking..." : <Send className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className={cn(selectedLead && "border-accent/50")}>
            <CardHeader title="Lead context" description="Ground answers in a specific lead." />
            <Label htmlFor="ai-lead-select" className="sr-only">
              Select a lead
            </Label>
            {leadsError ? (
              <ErrorState message={leadsError} onRetry={loadLeads} />
            ) : (
              <Select id="ai-lead-select" value={leadId} onChange={(event) => setLeadId(event.target.value)}>
                <option value="">No lead selected</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} · {lead.company}
                  </option>
                ))}
              </Select>
            )}
            {selectedLead ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                <div>
                  <dt>Status</dt>
                  <dd className="text-muted-strong">{selectedLead.status}</dd>
                </div>
                <div>
                  <dt>Value</dt>
                  <dd className="text-muted-strong">${selectedLead.value.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd className="text-muted-strong">{selectedLead.source}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd className="text-muted-strong">{selectedLead.priority}</dd>
                </div>
              </dl>
            ) : null}
          </Card>

          {selectedLead ? (
            <Card>
              <CardHeader title="Generate a reply" description="Email or WhatsApp, ready to copy." />
              <MessageComposer leadId={selectedLead.id} leadName={selectedLead.name} />
            </Card>
          ) : (
            <Card>
              <CardHeader title="Generate a reply" description="Select a lead to draft an email or WhatsApp message." />
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                Choose a lead above to generate a personalized reply.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
