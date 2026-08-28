"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { cn, formatCurrency } from "@/lib/utils";
import type { DealRiskLead, DealRiskRadar, RiskLevel } from "@/lib/ai/deal-risk";

const LEVEL_CONFIG: Record<RiskLevel, { badge: string; dot: string; icon: typeof AlertTriangle; label: string }> = {
  "High Risk": { badge: "bg-rose-500/10 text-rose-300", dot: "bg-rose-400", icon: AlertTriangle, label: "High Risk" },
  "Needs Attention": { badge: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400", icon: Clock, label: "Needs Attention" },
  Healthy: { badge: "bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400", icon: CheckCircle2, label: "Healthy" },
};

const FILTERS: { id: "All" | RiskLevel; label: string }[] = [
  { id: "All", label: "All" },
  { id: "High Risk", label: "High Risk" },
  { id: "Needs Attention", label: "Needs Attention" },
  { id: "Healthy", label: "Healthy" },
];

const SORTS = [
  { id: "risk", label: "Risk score: highest first" },
  { id: "value", label: "Deal value: highest first" },
  { id: "stale", label: "Oldest activity" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

function friendlyError(err: unknown) {
  return err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
}

function sortLeads(leads: DealRiskLead[], sort: SortId) {
  const copy = [...leads];
  if (sort === "value") return copy.sort((a, b) => b.value - a.value);
  if (sort === "stale") return copy.sort((a, b) => b.staleDays - a.staleDays);
  return copy.sort((a, b) => b.riskScore - a.riskScore);
}

function ScoreBreakdown({ lead }: { lead: DealRiskLead }) {
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-border bg-black/20 p-2.5 text-xs">
      {lead.scoreBreakdown.length ? (
        lead.scoreBreakdown.map((entry) => (
          <div key={entry.label} className="flex items-center justify-between text-muted-strong">
            <span>{entry.label}</span>
            <span>+{entry.points}</span>
          </div>
        ))
      ) : (
        <p className="text-muted">No risk signals contributed to this score.</p>
      )}
      <div className="flex items-center justify-between border-t border-border pt-1 font-medium text-foreground">
        <span>Total</span>
        <span>{lead.riskScore}/100</span>
      </div>
    </div>
  );
}

function DealRow({
  lead,
  onFollowUp,
  busy,
  expanded,
  onToggleExpand,
}: {
  lead: DealRiskLead;
  onFollowUp: (lead: DealRiskLead) => void;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const config = LEVEL_CONFIG[lead.riskLevel];
  return (
    <div className="rounded-xl border border-border bg-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{lead.name}</p>
          <p className="truncate text-sm text-muted">{lead.company}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={lead.status} />
            <span className="text-xs text-muted-strong">{formatCurrency(lead.value)}</span>
          </div>
        </div>
        <div className="text-right">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white/5"
            aria-expanded={expanded}
            aria-label={`Why is the risk score ${lead.riskScore}?`}
          >
            <p className="text-lg font-semibold text-foreground">
              {lead.riskScore}
              <span className="text-xs font-normal text-muted">/100</span>
            </p>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          </button>
          <Badge className={config.badge}>{config.label}</Badge>
        </div>
      </div>

      {expanded ? <ScoreBreakdown lead={lead} /> : null}

      {lead.reasons.length ? (
        <ul className="mt-3 space-y-1">
          {lead.reasons.map((reason) => (
            <li key={reason} className="flex gap-1.5 text-xs text-muted-strong">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-sm">
        <span className="font-medium text-foreground">Recommended: </span>
        <span className="text-muted-strong">{lead.recommendedAction}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/leads/${lead.id}`}>
          <Button size="sm" variant="secondary">
            Open Lead
          </Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={() => onFollowUp(lead)} disabled={busy}>
          {busy ? "Scheduling..." : "Generate Follow-up"}
        </Button>
      </div>
    </div>
  );
}

export default function DealRiskPage() {
  const [data, setData] = useState<DealRiskRadar | null>(null);
  const [error, setError] = useState("");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | RiskLevel>("All");
  const [sort, setSort] = useState<SortId>("risk");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    try {
      const result = await api<DealRiskRadar>("/api/ai/deal-risk");
      setData(result);
      setError("");
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  useEffect(() => {
    let cancelled = false;
    api<DealRiskRadar>("/api/ai/deal-risk")
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(friendlyError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function generateFollowUp(lead: DealRiskLead) {
    setSchedulingId(lead.id);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().slice(0, 10);
      await api(`/api/leads/${lead.id}/followups`, {
        method: "POST",
        body: JSON.stringify({
          date,
          time: "09:00",
          description: `AI Deal Risk Radar: ${lead.recommendedAction}`,
        }),
      });
      toast.success(`Follow-up scheduled for ${lead.name}`);
      await load();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSchedulingId(null);
    }
  }

  const filteredSorted = useMemo(() => {
    if (!data) return [];
    const filtered = filter === "All" ? data.leads : data.leads.filter((lead) => lead.riskLevel === filter);
    return sortLeads(filtered, sort);
  }, [data, filter, sort]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const groups: { level: RiskLevel; leads: DealRiskLead[] }[] = [
    { level: "High Risk", leads: filteredSorted.filter((lead) => lead.riskLevel === "High Risk") },
    { level: "Needs Attention", leads: filteredSorted.filter((lead) => lead.riskLevel === "Needs Attention") },
    { level: "Healthy", leads: filteredSorted.filter((lead) => lead.riskLevel === "Healthy") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Deal Risk Radar</h1>
        <p className="text-sm text-muted">
          Deterministic risk scoring across your open pipeline, grounded in real follow-up and engagement data.
          Recommendations only — not guaranteed outcomes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["High Risk", "Needs Attention", "Healthy"] as const).map((level) => {
          const config = LEVEL_CONFIG[level];
          const count =
            level === "High Risk" ? data.summary.highRisk : level === "Needs Attention" ? data.summary.needsAttention : data.summary.healthy;
          const Icon = config.icon;
          return (
            <Card key={level} className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.badge}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xl font-semibold text-foreground">{count}</p>
                <p className="text-xs text-muted">{config.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by risk level">
          {FILTERS.map((item) => {
            const count = item.id === "All" ? data.summary.total : item.id === "High Risk" ? data.summary.highRisk : item.id === "Needs Attention" ? data.summary.needsAttention : data.summary.healthy;
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-accent/60 bg-accent-soft text-accent"
                    : "border-border text-muted-strong hover:border-accent/40 hover:text-foreground",
                )}
              >
                {item.label} ({count})
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-xs text-muted">
          Sort by
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortId)}
            className="rounded-lg border border-border bg-zinc-950/40 px-2 py-1.5 text-xs text-foreground focus:border-accent/60 focus:outline-none"
            aria-label="Sort leads"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredSorted.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            {data.leads.length === 0 ? "No open leads to evaluate yet." : "No leads match this filter."}
          </p>
        </Card>
      ) : filter === "All" ? (
        groups.map((group) =>
          group.leads.length ? (
            <Card key={group.level}>
              <CardHeader
                title={group.level}
                description={`${group.leads.length} open lead${group.leads.length === 1 ? "" : "s"}`}
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.leads.map((lead) => (
                  <DealRow
                    key={lead.id}
                    lead={lead}
                    onFollowUp={generateFollowUp}
                    busy={schedulingId === lead.id}
                    expanded={expandedId === lead.id}
                    onToggleExpand={() => setExpandedId((current) => (current === lead.id ? null : lead.id))}
                  />
                ))}
              </div>
            </Card>
          ) : null,
        )
      ) : (
        <Card>
          <CardHeader
            title={filter}
            description={`${filteredSorted.length} open lead${filteredSorted.length === 1 ? "" : "s"}`}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredSorted.map((lead) => (
              <DealRow
                key={lead.id}
                lead={lead}
                onFollowUp={generateFollowUp}
                busy={schedulingId === lead.id}
                expanded={expandedId === lead.id}
                onToggleExpand={() => setExpandedId((current) => (current === lead.id ? null : lead.id))}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}