"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  DealRiskLead,
  DealRiskRadar,
  RiskLevel,
} from "@/lib/ai/deal-risk";

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

const LEVEL_CONFIG: Record<
  RiskLevel,
  {
    badge: string;
    dot: string;
    icon: typeof AlertTriangle;
    label: string;
    description: string;
  }
> = {
  "High Risk": {
    badge: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    dot: "bg-rose-400",
    icon: AlertTriangle,
    label: "High Risk",
    description: "Immediate attention recommended",
  },

  "Needs Attention": {
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    dot: "bg-amber-400",
    icon: Clock,
    label: "Needs Attention",
    description: "Follow-up recommended",
  },

  Healthy: {
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
    label: "Healthy",
    description: "Pipeline engagement looks healthy",
  },
};

const FILTERS: {
  id: "All" | RiskLevel;
  label: string;
}[] = [
  { id: "All", label: "All" },
  { id: "High Risk", label: "High Risk" },
  { id: "Needs Attention", label: "Needs Attention" },
  { id: "Healthy", label: "Healthy" },
];

const SORTS = [
  {
    id: "risk",
    label: "Risk score: highest first",
  },
  {
    id: "value",
    label: "Deal value: highest first",
  },
  {
    id: "stale",
    label: "Oldest activity",
  },
] as const;

type SortId = (typeof SORTS)[number]["id"];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function friendlyError(err: unknown) {
  return err instanceof Error && err.message
    ? err.message
    : "Something went wrong. Please try again.";
}

function sortLeads(leads: DealRiskLead[], sort: SortId) {
  const copy = [...leads];

  if (sort === "value") {
    return copy.sort((a, b) => b.value - a.value);
  }

  if (sort === "stale") {
    return copy.sort((a, b) => b.staleDays - a.staleDays);
  }

  return copy.sort((a, b) => b.riskScore - a.riskScore);
}

/* -------------------------------------------------------------------------- */
/* SCORE RING                                                                 */
/* -------------------------------------------------------------------------- */

function RiskScoreRing({
  score,
  size = "large",
}: {
  score: number;
  size?: "small" | "large";
}) {
  const safeScore = Math.max(0, Math.min(100, score));

  const ringSize =
    size === "large" ? "h-20 w-20" : "h-14 w-14";

  const textSize =
    size === "large" ? "text-xl" : "text-sm";

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full p-[2px]",
        ringSize,
      )}
      style={{
        background: `conic-gradient(
          ${
            safeScore >= 70
              ? "rgb(251 113 133)"
              : safeScore >= 40
                ? "rgb(251 191 36)"
                : "rgb(52 211 153)"
          } ${safeScore * 3.6}deg,
          rgba(255,255,255,0.06) ${safeScore * 3.6}deg
        )`,
      }}
      aria-label={`Risk score ${safeScore} out of 100`}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950">
        <div className="text-center">
          <div
            className={cn(
              "font-semibold leading-none text-foreground",
              textSize,
            )}
          >
            {safeScore}
          </div>

          <div className="mt-0.5 text-[9px] text-muted">
            /100
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SCORE BREAKDOWN                                                            */
/* -------------------------------------------------------------------------- */

function ScoreBreakdown({
  lead,
}: {
  lead: DealRiskLead;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Target className="h-3.5 w-3.5 text-accent" />

        <span className="text-xs font-medium text-foreground">
          Risk score breakdown
        </span>
      </div>

      {lead.scoreBreakdown.length ? (
        <div className="space-y-2">
          {lead.scoreBreakdown.map((entry) => (
            <div
              key={entry.label}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-xs text-muted-strong">
                {entry.label}
              </span>

              <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
                +{entry.points}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">
          No risk signals contributed to this score.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs font-medium text-foreground">
          Total risk score
        </span>

        <span className="text-sm font-semibold text-foreground">
          {lead.riskScore}
          <span className="text-xs font-normal text-muted">
            /100
          </span>
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DEAL CARD                                                                  */
/* -------------------------------------------------------------------------- */

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
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border border-border",
        "bg-gradient-to-br from-white/[0.035] to-transparent",
        "p-4 transition-all duration-200",
        "hover:-translate-y-0.5",
        "hover:border-border",
        "hover:bg-white/[0.045]",
      )}
    >
      {/* No colored top line */}

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.03] text-muted"
            >
              <Icon
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {lead.name}
              </p>

              <p className="truncate text-xs text-muted">
                {lead.company}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />

            <span className="text-xs font-medium text-muted-strong">
              {formatCurrency(lead.value)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="rounded-xl p-1 transition hover:bg-white/5"
          aria-expanded={expanded}
          aria-label={`View risk score details for ${lead.name}`}
        >
          <RiskScoreRing
            score={lead.riskScore}
            size="small"
          />
        </button>
      </div>

      {/* STATUS */}
      <div className="mt-3 flex items-center justify-between">
        <Badge className="border border-border bg-white/[0.03] text-muted-strong">
        
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-muted" />

          {config.label}
        </Badge>

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-[11px] text-muted transition hover:text-foreground"
        >
          {expanded ? "Hide details" : "Why?"}

          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* BREAKDOWN */}
      {expanded ? (
        <ScoreBreakdown lead={lead} />
      ) : null}

      {/* REASONS */}
      {lead.reasons.length ? (
        <div className="mt-4 space-y-2">
          {lead.reasons.map((reason) => (
            <div
              key={reason}
              className="flex gap-2 rounded-lg bg-white/[0.02] px-2.5 py-2"
            >
              <AlertTriangle
                className="mt-0.5 h-3 w-3 shrink-0 text-amber-400"
                aria-hidden="true"
              />

              <span className="text-[11px] leading-relaxed text-muted-strong">
                {reason}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* AI RECOMMENDATION */}
      <div className="mt-4 rounded-xl border border-accent/10 bg-accent/[0.035] p-3">
        <div className="flex gap-2">
          <Sparkles
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
            aria-hidden="true"
          />

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-accent">
              AI recommendation
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-strong">
              {lead.recommendedAction}
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/leads/${lead.id}`}
          className="flex-1"
        >
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
          >
            Open Lead

            <ArrowUpRight
              className="ml-1 h-3.5 w-3.5"
            />
          </Button>
        </Link>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onFollowUp(lead)}
          disabled={busy}
          className="flex-1"
        >
          {busy
            ? "Scheduling..."
            : "Follow-up"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  type,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof AlertTriangle;
  type:
    | "danger"
    | "warning"
    | "success"
    | "neutral";
}) {
  const styles = {
    danger: {
      icon: "bg-rose-500/10 text-rose-300 border-rose-500/20",
      glow: "from-rose-500/[0.08]",
    },

    warning: {
      icon: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      glow: "from-amber-500/[0.07]",
    },

    success: {
      icon: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      glow: "from-emerald-500/[0.07]",
    },

    neutral: {
      icon: "bg-accent/10 text-accent border-accent/20",
      glow: "from-accent/[0.06]",
    },
  };

  const style = styles[type];

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        "hover:border-border",
        `bg-gradient-to-br ${style.glow} to-transparent`,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">
            {title}
          </p>

          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-muted">
            {subtitle}
          </p>
        </div>

        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            style.icon,
          )}
        >
          <Icon
            className="h-4.5 w-4.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function DealRiskPage() {
  const [data, setData] =
    useState<DealRiskRadar | null>(null);

  const [error, setError] = useState("");

  const [schedulingId, setSchedulingId] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<"All" | RiskLevel>("All");

  const [sort, setSort] =
    useState<SortId>("risk");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  async function load() {
    try {
      const result =
        await api<DealRiskRadar>(
          "/api/ai/deal-risk",
        );

      setData(result);
      setError("");
    } catch (err) {
      setError(
        friendlyError(err),
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    api<DealRiskRadar>(
      "/api/ai/deal-risk",
    )
      .then((result) => {
        if (cancelled) return;

        setData(result);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setError(
          friendlyError(err),
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* FOLLOW UP                                                                */
  /* ------------------------------------------------------------------------ */

  async function generateFollowUp(
    lead: DealRiskLead,
  ) {
    setSchedulingId(lead.id);

    try {
      const tomorrow =
        new Date();

      tomorrow.setDate(
        tomorrow.getDate() + 1,
      );

      const date =
        tomorrow
          .toISOString()
          .slice(0, 10);

      await api(
        `/api/leads/${lead.id}/followups`,
        {
          method: "POST",

          body: JSON.stringify({
            date,
            time: "09:00",
            description:
              `AI Deal Risk Radar: ${lead.recommendedAction}`,
          }),
        },
      );

      toast.success(
        `Follow-up scheduled for ${lead.name}`,
      );

      await load();
    } catch (err) {
      toast.error(
        friendlyError(err),
      );
    } finally {
      setSchedulingId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* FILTER + SORT                                                            */
  /* ------------------------------------------------------------------------ */

  const filteredSorted =
    useMemo(() => {
      if (!data) return [];

      const filtered =
        filter === "All"
          ? data.leads
          : data.leads.filter(
              (lead) =>
                lead.riskLevel ===
                filter,
            );

      return sortLeads(
        filtered,
        sort,
      );
    }, [
      data,
      filter,
      sort,
    ]);

  /* ------------------------------------------------------------------------ */
  /* METRICS                                                                  */
  /* ------------------------------------------------------------------------ */

  const metrics =
    useMemo(() => {
      if (!data) {
        return {
          atRiskValue: 0,
          totalValue: 0,
          averageRisk: 0,
          riskPercentage: 0,
        };
      }

      const totalValue =
        data.leads.reduce(
          (sum, lead) =>
            sum + lead.value,
          0,
        );

      const atRiskValue =
        data.leads
          .filter(
            (lead) =>
              lead.riskLevel ===
                "High Risk" ||
              lead.riskLevel ===
                "Needs Attention",
          )
          .reduce(
            (sum, lead) =>
              sum + lead.value,
            0,
          );

      const averageRisk =
        data.leads.length > 0
          ? Math.round(
              data.leads.reduce(
                (sum, lead) =>
                  sum +
                  lead.riskScore,
                0,
              ) /
                data.leads.length,
            )
          : 0;

      const riskPercentage =
        totalValue > 0
          ? Math.round(
              (atRiskValue /
                totalValue) *
                100,
            )
          : 0;

      return {
        atRiskValue,
        totalValue,
        averageRisk,
        riskPercentage,
      };
    }, [data]);

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={load}
      />
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>

        <Skeleton className="h-64" />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* GROUPS                                                                   */
  /* ------------------------------------------------------------------------ */

  const groups: {
    level: RiskLevel;
    leads: DealRiskLead[];
  }[] = [
    {
      level: "High Risk",
      leads:
        filteredSorted.filter(
          (lead) =>
            lead.riskLevel ===
            "High Risk",
        ),
    },

    {
      level: "Needs Attention",
      leads:
        filteredSorted.filter(
          (lead) =>
            lead.riskLevel ===
            "Needs Attention",
        ),
    },

    {
      level: "Healthy",
      leads:
        filteredSorted.filter(
          (lead) =>
            lead.riskLevel ===
            "Healthy",
        ),
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6 pb-8">

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/[0.06] via-transparent to-transparent p-5 sm:p-6">

        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/[0.05] blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <div className="flex items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
                <ShieldAlert
                  className="h-5 w-5 text-accent"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  AI Deal Risk Radar
                </h1>

                <p className="mt-0.5 text-xs text-muted">
                  Intelligent risk monitoring for your active pipeline
                </p>
              </div>

            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-strong">
              Deterministic risk scoring grounded in real
              follow-up and engagement data. Use these insights
              to prioritize where your team should focus next.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2">

            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>

            <span className="text-xs font-medium text-accent">
              Live pipeline data
            </span>

          </div>

        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="High risk"
          value={data.summary.highRisk}
          subtitle="Immediate attention recommended"
          icon={AlertTriangle}
          type="danger"
        />

        <SummaryCard
          title="Needs attention"
          value={data.summary.needsAttention}
          subtitle="Follow-up recommended"
          icon={Clock}
          type="warning"
        />

        <SummaryCard
          title="Healthy"
          value={data.summary.healthy}
          subtitle="Engagement looks healthy"
          icon={CheckCircle2}
          type="success"
        />

        <SummaryCard
          title="Pipeline at risk"
          value={formatCurrency(
            metrics.atRiskValue,
          )}
          subtitle={`${metrics.riskPercentage}% of evaluated pipeline`}
          icon={DollarSign}
          type="neutral"
        />

      </div>

      {/* PORTFOLIO HEALTH */}
      <Card className="overflow-hidden">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
              <TrendingUp
                className="h-4.5 w-4.5 text-accent"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-muted">
                Portfolio health
              </p>

              <p className="mt-0.5 text-sm font-medium text-foreground">
                Average risk score:{" "}
                <span className="text-accent">
                  {metrics.averageRisk}/100
                </span>
              </p>
            </div>

          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 lg:max-w-xl">

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">

              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  metrics.averageRisk >= 70
                    ? "bg-rose-400"
                    : metrics.averageRisk >= 40
                      ? "bg-amber-400"
                      : "bg-emerald-400",
                )}
                style={{
                  width: `${Math.min(
                    100,
                    metrics.averageRisk,
                  )}%`,
                }}
              />

            </div>

            <span className="shrink-0 text-[11px] text-muted">
              {data.summary.total} leads evaluated
            </span>

          </div>

        </div>

      </Card>

      {/* FILTERS */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between">

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by risk level"
        >

          {FILTERS.map((item) => {

            const count =
              item.id === "All"
                ? data.summary.total
                : item.id ===
                    "High Risk"
                  ? data.summary.highRisk
                  : item.id ===
                      "Needs Attention"
                    ? data.summary.needsAttention
                    : data.summary.healthy;

            const active =
              filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setFilter(item.id)
                }
                aria-pressed={active}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium transition-all",

                  active
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-transparent text-muted-strong hover:border-border hover:bg-white/[0.03] hover:text-foreground",
                )}
              >
                {item.label}

                <span className="ml-1 opacity-60">
                  {count}
                </span>
              </button>
            );
          })}

        </div>

        <label className="flex items-center gap-2 text-xs text-muted">

          <span>
            Sort by
          </span>

          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target
                  .value as SortId,
              )
            }
            className="rounded-xl border border-border bg-zinc-950/70 px-3 py-2 text-xs text-foreground outline-none transition focus:border-accent/50"
            aria-label="Sort leads"
          >

            {SORTS.map((option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.label}
              </option>
            ))}

          </select>

        </label>

      </div>

      {/* EMPTY STATE */}
      {filteredSorted.length === 0 ? (

        <Card className="py-12 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
            <CheckCircle2 className="h-6 w-6 text-accent" />
          </div>

          <p className="mt-4 text-sm font-medium text-foreground">
            {data.leads.length === 0
              ? "No open leads to evaluate yet."
              : "No leads match this filter."}
          </p>

          <p className="mt-1 text-xs text-muted">
            Try another risk category to continue.
          </p>

        </Card>

      ) : filter === "All" ? (

        groups.map((group) => {

          if (!group.leads.length) {
            return null;
          }

          const config =
            LEVEL_CONFIG[group.level];

          const Icon =
            config.icon;

          return (
            <section
              key={group.level}
              className="space-y-3"
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border",
                      config.badge,
                    )}
                  >
                    <Icon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </div>

                  <div>

                    <h2 className="text-sm font-semibold text-foreground">
                      {group.level}
                    </h2>

                    <p className="text-[10px] text-muted">
                      {config.description}
                    </p>

                  </div>

                </div>

                <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted">
                  {group.leads.length}{" "}
                  {group.leads.length === 1
                    ? "lead"
                    : "leads"}
                </span>

              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

                {group.leads.map(
                  (lead) => (
                    <DealRow
                      key={lead.id}
                      lead={lead}
                      onFollowUp={
                        generateFollowUp
                      }
                      busy={
                        schedulingId ===
                        lead.id
                      }
                      expanded={
                        expandedId ===
                        lead.id
                      }
                      onToggleExpand={() =>
                        setExpandedId(
                          (current) =>
                            current ===
                            lead.id
                              ? null
                              : lead.id,
                        )
                      }
                    />
                  ),
                )}

              </div>

            </section>
          );
        })

      ) : (

        <section className="space-y-3">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-sm font-semibold text-foreground">
                {filter}
              </h2>

              <p className="mt-0.5 text-[10px] text-muted">
                {LEVEL_CONFIG[filter].description}
              </p>

            </div>

            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted">
              {filteredSorted.length}{" "}
              {filteredSorted.length === 1
                ? "lead"
                : "leads"}
            </span>

          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

            {filteredSorted.map(
              (lead) => (
                <DealRow
                  key={lead.id}
                  lead={lead}
                  onFollowUp={
                    generateFollowUp
                  }
                  busy={
                    schedulingId ===
                    lead.id
                  }
                  expanded={
                    expandedId ===
                    lead.id
                  }
                  onToggleExpand={() =>
                    setExpandedId(
                      (current) =>
                        current ===
                        lead.id
                          ? null
                          : lead.id,
                    )
                  }
                />
              ),
            )}

          </div>

        </section>
      )}

      {/* FOOTER */}
      <div className="flex items-center justify-center gap-2 pt-2 text-center">

        <Sparkles
          className="h-3 w-3 text-accent"
          aria-hidden="true"
        />

        <p className="text-[10px] text-muted">
          Velora AI risk recommendations are based on available
          CRM activity data and are not guaranteed outcomes.
        </p>

      </div>

    </div>
  );
}