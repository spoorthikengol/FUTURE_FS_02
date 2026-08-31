"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  Timer,
  TrendingDown,
  Zap,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { ResponseBadge } from "@/components/leads/response-badge";
import { api } from "@/lib/client";
import {
  cn,
  formatDateTime,
  formatDuration,
} from "@/lib/utils";

import type {
  SpeedToLeadLead,
  SpeedToLeadReport,
  SpeedToLeadState,
} from "@/lib/analytics/speed-to-lead";

/* -------------------------------------------------------------------------- */
/* FILTERS                                                                    */
/* -------------------------------------------------------------------------- */

const FILTERS: {
  id: "All" | SpeedToLeadState;
  label: string;
}[] = [
  { id: "All", label: "All leads" },
  { id: "AWAITING", label: "Awaiting" },
  { id: "BREACHED", label: "Breached" },
  { id: "LATE", label: "Responded late" },
  { id: "ON_TIME", label: "On time" },
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function friendlyError(err: unknown) {
  return err instanceof Error && err.message
    ? err.message
    : "Something went wrong. Please try again.";
}

/* -------------------------------------------------------------------------- */
/* PREMIUM METRIC CARD                                                        */
/* -------------------------------------------------------------------------- */

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Timer;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden",
        "!border-border",
        "bg-gradient-to-br from-white/[0.035] to-transparent",
        "transition-all duration-200",
        "hover:-translate-y-0.5",
        "hover:!border-border",
        "hover:bg-white/[0.045]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-muted">
            {subtitle}
          </p>
        </div>

        <div
          className="
            flex h-10 w-10 shrink-0 items-center justify-center
            rounded-xl
            border border-accent/15
            bg-accent/10
            text-accent
            transition-transform duration-200
            group-hover:scale-105
          "
        >
          <Icon
            className="h-4 w-4"
            aria-hidden="true"
          />
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* SLA SCORE                                                                  */
/* -------------------------------------------------------------------------- */

function SlaScore({
  percentage,
}: {
  percentage: number | null;
}) {
  const score =
    percentage === null
      ? 0
      : Math.max(
          0,
          Math.min(100, percentage),
        );

  return (
    <Card
      className="
        relative overflow-hidden
        !border-border
        bg-gradient-to-br
        from-accent/[0.06]
        via-transparent
        to-transparent
      "
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-xl
              border border-accent/20
              bg-accent/10
            "
          >
            <Gauge
              className="h-5 w-5 text-accent"
              aria-hidden="true"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-muted">
              SLA performance
            </p>

            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {percentage !== null
                ? `${percentage.toFixed(0)}% within target`
                : "No response data yet"}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 lg:max-w-2xl">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="
                h-full rounded-full
                bg-accent
                transition-all duration-700
              "
              style={{
                width: `${score}%`,
              }}
            />
          </div>

          <span className="shrink-0 text-xs font-medium text-muted-strong">
            {score.toFixed(0)}%
          </span>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* LEAD CARD                                                                  */
/* -------------------------------------------------------------------------- */

function LeadRow({
  lead,
}: {
  lead: SpeedToLeadLead;
}) {
  const isBreached =
    lead.state === "BREACHED";

  const isAwaiting =
    lead.state === "AWAITING";

  const isLate =
    lead.state === "LATE";

  const isOnTime =
    lead.state === "ON_TIME";

  return (
    <div
      className={cn(
        /* Base */
        "group relative overflow-hidden rounded-2xl",

        /* IMPORTANT:
           Completely neutral card border.
           This prevents red/yellow/green vertical
           status lines from appearing on the card.
        */
        "!border !border-border !border-l-border !border-r-border",

        /* Surface */
        "bg-gradient-to-br from-white/[0.035] to-transparent",
        "p-4",

        /* Premium interaction */
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5",
        "hover:!border-border",
        "hover:bg-white/[0.045]",
        "hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {/* Neutral icon container */}
            <div
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl
                border border-border
                bg-white/[0.035]
                text-accent
              "
            >
              <Zap
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
        </div>

        {/* Response badge */}
        <ResponseBadge
          state={lead.state}
          responseMinutes={
            lead.responseMinutes
          }
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* STATUS / CREATED                                                    */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={lead.status} />

        <span className="h-1 w-1 rounded-full bg-border" />

        <span className="text-[11px] text-muted">
          Created{" "}
          {formatDateTime(
            lead.createdAt,
          )}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RESPONSE INFORMATION                                                */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {/* Response */}
        <div
          className="
            rounded-xl
            border border-border
            bg-black/10
            p-3
            transition-colors
            duration-200
            group-hover:bg-white/[0.025]
          "
        >
          <div className="flex items-center gap-1.5">
            <Clock
              className="h-3.5 w-3.5 text-muted"
              aria-hidden="true"
            />

            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Response
            </span>
          </div>

          <p className="mt-1.5 text-sm font-semibold text-foreground">
            {lead.responseMinutes !== null
              ? formatDuration(
                  lead.responseMinutes,
                )
              : "Awaiting"}
          </p>
        </div>

        {/* Status */}
        <div
          className={cn(
            "rounded-xl border border-border p-3",
            "transition-colors duration-200",

            /* Subtle status backgrounds only.
               NO vertical card lines. */
            isBreached
              ? "bg-rose-500/[0.045]"
              : isLate
                ? "bg-amber-500/[0.045]"
                : isOnTime
                  ? "bg-emerald-500/[0.035]"
                  : "bg-black/10",
          )}
        >
          <div className="flex items-center gap-1.5">
            {isOnTime ? (
              <CheckCircle2
                className="h-3.5 w-3.5 text-muted"
                aria-hidden="true"
              />
            ) : isBreached ||
              isLate ? (
              <AlertTriangle
                className="h-3.5 w-3.5 text-muted"
                aria-hidden="true"
              />
            ) : (
              <Timer
                className="h-3.5 w-3.5 text-muted"
                aria-hidden="true"
              />
            )}

            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Status
            </span>
          </div>

          <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
            {isBreached
              ? "SLA breached"
              : isAwaiting
                ? "Waiting"
                : isLate
                  ? "Late response"
                  : "Within SLA"}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ACTION                                                              */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-4">
        <Link
          href={`/leads/${lead.id}`}
          className="block"
        >
          <Button
            size="sm"
            variant="secondary"
            className="
              w-full
              justify-between
              border-border
              transition-all
              duration-200
              hover:border-accent/20
              hover:bg-white/[0.04]
            "
          >
            <span>Open Lead</span>

            <ArrowUpRight
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FILTER BAR                                                                 */
/* -------------------------------------------------------------------------- */

function FilterBar({
  filter,
  setFilter,
  counts,
}: {
  filter:
    | "All"
    | SpeedToLeadState;

  setFilter: (
    filter:
      | "All"
      | SpeedToLeadState,
  ) => void;

  counts: Record<
    "All" | SpeedToLeadState,
    number
  >;
}) {
  return (
    <div
      className="
        rounded-2xl
        border border-border
        bg-black/10
        p-2
      "
    >
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Filter by response state"
      >
        {FILTERS.map((item) => {
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
                "rounded-xl border px-3 py-2 text-xs font-medium",
                "transition-all duration-200",

                active
                  ? "border-accent/30 bg-accent/10 text-accent shadow-sm"
                  : "border-transparent text-muted-strong hover:border-border hover:bg-white/[0.03] hover:text-foreground",
              )}
            >
              {item.label}

              <span
                className={cn(
                  "ml-1.5",
                  active
                    ? "text-accent/70"
                    : "text-muted",
                )}
              >
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function SpeedToLeadPage() {
  const [data, setData] =
    useState<SpeedToLeadReport | null>(
      null,
    );

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<
      "All" | SpeedToLeadState
    >("All");

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  async function load() {
    try {
      const result =
        await api<SpeedToLeadReport>(
          "/api/analytics/speed-to-lead",
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
    void load();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* FILTER + SORT                                                            */
  /* ------------------------------------------------------------------------ */

  const filteredLeads = useMemo(() => {
    if (!data) return [];

    const filtered =
      filter === "All"
        ? data.leads
        : data.leads.filter(
            (lead) =>
              lead.state === filter,
          );

    const order: Record<
      SpeedToLeadState,
      number
    > = {
      BREACHED: 0,
      AWAITING: 1,
      LATE: 2,
      ON_TIME: 3,
    };

    return [...filtered].sort(
      (a, b) => {
        if (
          order[a.state] !==
          order[b.state]
        ) {
          return (
            order[a.state] -
            order[b.state]
          );
        }

        return (
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime()
        );
      },
    );
  }, [data, filter]);

  /* ------------------------------------------------------------------------ */
  /* ERROR                                                                    */
  /* ------------------------------------------------------------------------ */

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={load}
      />
    );
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (!data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>

        <Skeleton className="h-24" />

        <Skeleton className="h-64" />
      </div>
    );
  }

  const { summary } = data;

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const counts: Record<
    "All" | SpeedToLeadState,
    number
  > = {
    All: summary.totalLeads,
    AWAITING:
      summary.waitingCount,
    BREACHED:
      summary.breachedCount,
    LATE:
      summary.lateCount,
    ON_TIME:
      summary.onTimeCount,
  };

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6 pb-8">

      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <section
        className="
          relative overflow-hidden
          rounded-2xl
          border border-border
          bg-gradient-to-br
          from-accent/[0.07]
          via-transparent
          to-transparent
          p-5 sm:p-6
        "
      >
        <div
          className="
            pointer-events-none
            absolute -right-24 -top-24
            h-56 w-56
            rounded-full
            bg-accent/[0.05]
            blur-3xl
          "
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-10 w-10 shrink-0
                  items-center justify-center
                  rounded-xl
                  border border-accent/20
                  bg-accent/10
                "
              >
                <Zap
                  className="h-5 w-5 text-accent"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Speed to Lead
                </h1>

                <p className="mt-0.5 text-xs text-muted">
                  Response performance across your active pipeline
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-strong">
              Monitor how quickly your
              team responds to incoming
              leads. Identify missed
              opportunities and keep
              every conversation within
              your response-time target.
            </p>
          </div>

          {/* SLA TARGET */}

          <div
            className="
              flex shrink-0 items-center gap-2
              rounded-xl
              border border-border
              bg-black/10
              px-3 py-2.5
            "
          >
            <span className="flex h-2 w-2 rounded-full bg-accent" />

            <span className="text-xs font-medium text-muted-strong">
              SLA target
            </span>

            <span className="text-xs font-semibold text-foreground">
              {data.thresholdMinutes} min
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* METRICS                                                            */}
      {/* ================================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Median response"
          value={
            summary.medianMinutes !== null
              ? formatDuration(
                  summary.medianMinutes,
                )
              : "—"
          }
          subtitle="Typical first response"
          icon={Timer}
        />

        <MetricCard
          title="Average response"
          value={
            summary.averageMinutes !== null
              ? formatDuration(
                  summary.averageMinutes,
                )
              : "—"
          }
          subtitle="Across responded leads"
          icon={Clock}
        />

        <MetricCard
          title="SLA compliance"
          value={
            summary.slaCompliancePercent !==
            null
              ? `${summary.slaCompliancePercent.toFixed(0)}%`
              : "—"
          }
          subtitle="Responses within target"
          icon={CheckCircle2}
        />

        <MetricCard
          title="Breached"
          value={
            summary.breachedCount
          }
          subtitle="Leads beyond SLA"
          icon={AlertTriangle}
        />
      </div>

      {/* ================================================================== */}
      {/* SLA PERFORMANCE                                                    */}
      {/* ================================================================== */}

      <SlaScore
        percentage={
          summary.slaCompliancePercent
        }
      />

      {/* ================================================================== */}
      {/* QUICK STATS                                                        */}
      {/* ================================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="!border-border bg-black/10">
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-9 w-9
                items-center justify-center
                rounded-xl
                border border-border
                bg-white/[0.03]
              "
            >
              <TrendingDown
                className="h-4 w-4 text-muted"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Fastest
              </p>

              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {summary.fastestMinutes !==
                null
                  ? formatDuration(
                      summary.fastestMinutes,
                    )
                  : "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!border-border bg-black/10">
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-9 w-9
                items-center justify-center
                rounded-xl
                border border-border
                bg-white/[0.03]
              "
            >
              <Clock
                className="h-4 w-4 text-muted"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Slowest
              </p>

              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {summary.slowestMinutes !==
                null
                  ? formatDuration(
                      summary.slowestMinutes,
                    )
                  : "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!border-border bg-black/10">
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-9 w-9
                items-center justify-center
                rounded-xl
                border border-border
                bg-white/[0.03]
              "
            >
              <CheckCircle2
                className="h-4 w-4 text-muted"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Responded
              </p>

              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {summary.respondedCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* FILTERS                                                            */}
      {/* ================================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterBar
          filter={filter}
          setFilter={setFilter}
          counts={counts}
        />

        <div className="flex items-center gap-2 px-1 text-[11px] text-muted">
          <span>
            {filteredLeads.length}{" "}
            {filteredLeads.length === 1
              ? "lead"
              : "leads"}
          </span>

          <ChevronRight className="h-3 w-3" />

          <span>
            Priority sorted
          </span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LEADS                                                              */}
      {/* ================================================================== */}

      {filteredLeads.length === 0 ? (
        <Card className="!border-border py-14 text-center">
          <div
            className="
              mx-auto flex h-12 w-12
              items-center justify-center
              rounded-2xl
              border border-accent/20
              bg-accent/10
            "
          >
            <CheckCircle2
              className="h-6 w-6 text-accent"
              aria-hidden="true"
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-foreground">
            {data.leads.length === 0
              ? "No leads yet"
              : "No leads match this filter"}
          </p>

          <p className="mt-1 text-xs text-muted">
            {data.leads.length === 0
              ? "New leads will appear here automatically."
              : "Try another response category."}
          </p>
        </Card>
      ) : (
        <Card
          className="
            overflow-hidden
            !border-border
          "
        >
          <CardHeader
            title={
              filter === "All"
                ? "Lead response activity"
                : FILTERS.find(
                    (item) =>
                      item.id === filter,
                  )?.label ??
                  "Leads"
            }
            description={
              filter === "All"
                ? "Prioritized by response urgency"
                : `${filteredLeads.length} ${
                    filteredLeads.length ===
                    1
                      ? "lead"
                      : "leads"
                  } in this category`
            }
          />

          <div className="grid gap-3 p-1 md:grid-cols-2 xl:grid-cols-3">
            {filteredLeads.map(
              (lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                />
              ),
            )}
          </div>
        </Card>
      )}

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}

      <div className="flex items-center justify-center gap-2 pt-2">
        <Timer
          className="h-3 w-3 text-muted"
          aria-hidden="true"
        />

        <p className="text-[10px] text-muted">
          Response times are calculated
          from available CRM activity
          timestamps. SLA performance is
          deterministic and does not use
          an AI model.
        </p>
      </div>
    </div>
  );
}