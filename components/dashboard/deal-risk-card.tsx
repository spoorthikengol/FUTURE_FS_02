"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/client";
import { cn, formatCurrency } from "@/lib/utils";
import type { DealRiskBreakdownEntry, DealRiskLevel } from "@/lib/ai/deal-risk";
import type { LeadStatus } from "@/types/crm";

export type DealRiskCardLead = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  value: number;
  score: number;
  level: DealRiskLevel;
  reasons: string[];
  recommendedAction: string;
  breakdown: DealRiskBreakdownEntry[];
};

const LEVEL_CLASS: Record<DealRiskLevel, string> = {
  "High Risk": "bg-rose-500/10 text-rose-300",
  "Needs Attention": "bg-amber-500/10 text-amber-300",
  Healthy: "bg-emerald-500/10 text-emerald-300",
};

const LEVEL_DOT: Record<DealRiskLevel, string> = {
  "High Risk": "\u{1F534}",
  "Needs Attention": "\u{1F7E1}",
  Healthy: "\u{1F7E2}",
};

export function DealRiskCard({ lead, compact = false }: { lead: DealRiskCardLead; compact?: boolean }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  async function generateFollowUp() {
    setScheduling(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await api(`/api/leads/${lead.id}/followups`, {
        method: "POST",
        body: JSON.stringify({
          date: tomorrow.toISOString(),
          time: "09:00",
          description: `Follow up with ${lead.name} — flagged by Deal Risk Radar (${lead.level}).`,
        }),
      });
      toast.success(`Follow-up scheduled for ${lead.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule follow-up");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className={cn("space-y-2.5 rounded-xl border border-border bg-white/3 p-4 text-sm", compact && "p-3")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{lead.name}</p>
          <p className="truncate text-xs text-muted">
            {lead.company} · <StatusBadge status={lead.status} /> · {formatCurrency(lead.value)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowBreakdown(true)}
            className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground transition hover:border-accent/60 hover:text-accent"
            title="Click to see the point breakdown"
          >
            {lead.score}/100
          </button>
          <Badge className={LEVEL_CLASS[lead.level]}>
            {LEVEL_DOT[lead.level]} {lead.level}
          </Badge>
        </div>
      </div>

      {lead.reasons.length ? (
        <ul className="space-y-1">
          {lead.reasons.map((reason) => (
            <li key={reason} className="flex gap-1.5 text-xs leading-relaxed text-muted-strong">
              <span aria-hidden>⚠</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">No risk signals detected.</p>
      )}

      <p className="text-xs">
        <span className="font-medium text-foreground">Recommended: </span>
        <span className="text-muted-strong">{lead.recommendedAction}</span>
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/leads/${lead.id}`}
          className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted transition hover:border-accent/60 hover:text-accent"
        >
          Open lead
        </Link>
        <Button variant="secondary" size="sm" onClick={generateFollowUp} disabled={scheduling}>
          {scheduling ? "Scheduling…" : "Generate follow-up"}
        </Button>
      </div>

      <Modal open={showBreakdown} title={`${lead.name} — risk score breakdown`} onClose={() => setShowBreakdown(false)}>
        <div className="space-y-2">
          {lead.breakdown.length ? (
            <ul className="space-y-1.5">
              {lead.breakdown.map((entry) => (
                <li key={entry.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-strong">{entry.label}</span>
                  <span className="font-medium text-foreground">+{entry.points}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No risk signals contributed to this score.</p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Total (clamped 0–100)</span>
            <span>{lead.score}/100</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Deterministic and rule-based — computed the same way for every lead, no AI model involved.
          </p>
        </div>
      </Modal>
    </div>
  );
}