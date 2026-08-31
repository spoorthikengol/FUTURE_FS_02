"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { ErrorState, Skeleton } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";

type ActivityItem = {
  id: string;
  leadId: string | null;
  type: string;
  description: string;
  createdAt: string;
  leadName: string | null;
  company: string | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatActivityType(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActivityIcon(type: string) {
  const value = type.toLowerCase();

  if (
    value.includes("create") ||
    value.includes("new") ||
    value.includes("lead")
  ) {
    return Sparkles;
  }

  if (
    value.includes("follow") ||
    value.includes("schedule") ||
    value.includes("reminder")
  ) {
    return CalendarDays;
  }

  return ActivityIcon;
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return formatDateTime(dateString);
}

/* -------------------------------------------------------------------------- */
/* ACTIVITY ROW                                                               */
/* -------------------------------------------------------------------------- */

function ActivityRow({
  item,
  isLast,
}: {
  item: ActivityItem;
  isLast: boolean;
}) {
  const Icon = getActivityIcon(item.type);

  return (
    <li className="relative">
      {/* Timeline connector */}
      {!isLast ? (
        <div className="absolute left-[19px] top-11 bottom-[-18px] w-px bg-border" />
      ) : null}

      <div className="group relative flex gap-4">
        {/* Timeline icon */}
        <div
          className="
            relative z-10 flex h-10 w-10 shrink-0
            items-center justify-center rounded-xl
            border border-border
            bg-[#101112]
            text-accent
            shadow-sm
            transition-all duration-200
            group-hover:border-accent/20
            group-hover:bg-accent/[0.04]
          "
        >
          <Icon
            className="h-4 w-4"
            aria-hidden="true"
          />
        </div>

        {/* Activity content */}
        <div
          className="
            min-w-0 flex-1 rounded-2xl
            border border-border
            bg-gradient-to-br from-white/[0.035] to-transparent
            p-4
            transition-all duration-200
            group-hover:-translate-y-0.5
            group-hover:border-accent/15
            group-hover:bg-white/[0.04]
          "
        >
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="
                    rounded-lg
                    border border-border
                    bg-white/[0.025]
                    px-2 py-1
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-wide
                    text-muted-strong
                  "
                >
                  {formatActivityType(item.type)}
                </span>

                <span className="text-[10px] text-muted">
                  {getRelativeTime(item.createdAt)}
                </span>
              </div>

              <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
                {item.description}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted">
              <Clock3
                className="h-3 w-3"
                aria-hidden="true"
              />

              <span>{formatDateTime(item.createdAt)}</span>
            </div>
          </div>

          {/* Related lead */}
          {item.leadId ? (
            <div
              className="
                mt-4 flex flex-col gap-3
                rounded-xl
                border border-border
                bg-black/10
                p-3
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                  Related lead
                </p>

                <div className="mt-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {item.leadName || "Unnamed lead"}
                  </p>

                  {item.company ? (
                    <p className="truncate text-[11px] text-muted">
                      {item.company}
                    </p>
                  ) : null}
                </div>
              </div>

              <Link
                href={`/leads/${item.leadId}`}
                className="shrink-0"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="
                    h-8 gap-1.5
                    border border-border
                    px-3
                    text-xs
                    hover:border-accent/20
                    hover:bg-accent/[0.04]
                  "
                >
                  Open lead

                  <ArrowUpRight
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  async function load(options?: { silent?: boolean }) {
    try {
      if (!options?.silent) {
        setRefreshing(true);
      }

      const result = await api<ActivityItem[]>(
        "/api/activity?limit=80",
      );

      setItems(result);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load activity",
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* EFFECT                                                                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    void load();

    const timer = setInterval(() => {
      void load({ silent: true });
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* DERIVED DATA                                                             */
  /* IMPORTANT: hooks MUST be above conditional returns                       */
  /* ------------------------------------------------------------------------ */

  const sortedItems = useMemo(() => {
    if (!items) return [];

    return [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
  }, [items]);

  const linkedLeadCount = useMemo(() => {
    if (!items) return 0;

    return new Set(
      items
        .filter((item) => item.leadId)
        .map((item) => item.leadId),
    ).size;
  }, [items]);

  const todayCount = useMemo(() => {
    if (!items) return 0;

    const now = new Date();

    return items.filter((item) => {
      const date = new Date(item.createdAt);

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }).length;
  }, [items]);

  const latestActivity = sortedItems[0];

  /* ------------------------------------------------------------------------ */
  /* ERROR                                                                    */
  /* ------------------------------------------------------------------------ */

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (!items) {
    return (
      <div className="space-y-5 pb-8">
        <Skeleton className="h-32" />

        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>

        <Skeleton className="h-[500px]" />
      </div>
    );
  }

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

        <div
          className="
            relative flex flex-col gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
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
                <ActivityIcon
                  className="h-5 w-5 text-accent"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h1
                  className="
                    text-2xl
                    font-semibold
                    tracking-tight
                    text-foreground
                  "
                >
                  Activity
                </h1>

                <p className="mt-0.5 text-xs text-muted">
                  A clear history of everything happening across your CRM
                </p>
              </div>
            </div>

            <p
              className="
                mt-4 max-w-2xl
                text-sm
                leading-relaxed
                text-muted-strong
              "
            >
              Stay on top of lead activity, follow-ups and important CRM
              events from one continuously updated timeline.
            </p>
          </div>

          {/* REFRESH */}
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="
              group flex shrink-0
              items-center gap-2
              self-start
              rounded-xl
              border border-border
              bg-black/10
              px-3.5 py-2.5
              text-xs
              font-medium
              text-muted-strong
              transition-all duration-200
              hover:border-accent/20
              hover:bg-white/[0.03]
              hover:text-foreground
              disabled:cursor-not-allowed
              disabled:opacity-60
              lg:self-center
            "
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-accent ${
                refreshing ? "animate-spin" : ""
              }`}
              aria-hidden="true"
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {/* ================================================================== */}
      {/* QUICK STATS                                                        */}
      {/* ================================================================== */}

      <div className="grid gap-4 sm:grid-cols-3">

        {/* TOTAL */}
        <Card
          className="
            group
            border-border
            bg-gradient-to-br
            from-white/[0.035]
            to-transparent
            transition-all duration-200
            hover:-translate-y-0.5
            hover:border-accent/15
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-border
                bg-white/[0.03]
                text-accent
              "
            >
              <ActivityIcon
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-muted
                "
              >
                Total events
              </p>

              <p
                className="
                  mt-1
                  text-xl
                  font-semibold
                  tracking-tight
                  text-foreground
                "
              >
                {items.length}
              </p>

              <p className="mt-0.5 text-[11px] text-muted">
                Recorded activity
              </p>
            </div>

          </div>
        </Card>

        {/* TODAY */}
        <Card
          className="
            group
            border-border
            bg-gradient-to-br
            from-white/[0.035]
            to-transparent
            transition-all duration-200
            hover:-translate-y-0.5
            hover:border-accent/15
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-border
                bg-white/[0.03]
                text-accent
              "
            >
              <Clock3
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-muted
                "
              >
                Today
              </p>

              <p
                className="
                  mt-1
                  text-xl
                  font-semibold
                  tracking-tight
                  text-foreground
                "
              >
                {todayCount}
              </p>

              <p className="mt-0.5 text-[11px] text-muted">
                Events recorded today
              </p>
            </div>

          </div>
        </Card>

        {/* ACTIVE LEADS */}
        <Card
          className="
            group
            border-border
            bg-gradient-to-br
            from-white/[0.035]
            to-transparent
            transition-all duration-200
            hover:-translate-y-0.5
            hover:border-accent/15
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-border
                bg-white/[0.03]
                text-accent
              "
            >
              <Sparkles
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-muted
                "
              >
                Active leads
              </p>

              <p
                className="
                  mt-1
                  text-xl
                  font-semibold
                  tracking-tight
                  text-foreground
                "
              >
                {linkedLeadCount}
              </p>

              <p className="mt-0.5 text-[11px] text-muted">
                Leads with activity
              </p>
            </div>

          </div>
        </Card>

      </div>

      {/* ================================================================== */}
      {/* ACTIVITY TIMELINE                                                  */}
      {/* ================================================================== */}

      <Card className="overflow-hidden border-border">

        {/* Timeline header */}
        <div
          className="
            flex flex-col gap-3
            border-b border-border
            px-5 py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Recent activity
            </h2>

            <p className="mt-0.5 text-xs text-muted">
              Latest CRM events and lead interactions
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />

            <span>Updates automatically</span>

            <span className="text-border">·</span>

            <span>Every 15 sec</span>
          </div>
        </div>

        {/* Empty state */}
        {sortedItems.length === 0 ? (
          <div className="px-5 py-16 text-center">

            <div
              className="
                mx-auto flex h-12 w-12
                items-center justify-center
                rounded-2xl
                border border-accent/20
                bg-accent/10
              "
            >
              <ActivityIcon
                className="h-5 w-5 text-accent"
                aria-hidden="true"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-foreground">
              No activity yet
            </p>

            <p
              className="
                mx-auto mt-1
                max-w-sm
                text-xs
                leading-relaxed
                text-muted
              "
            >
              CRM events will appear here automatically as leads are
              created, updated and followed up.
            </p>

          </div>
        ) : (
          <div className="px-5 py-5">

            <ol className="space-y-[18px]">

              {sortedItems.map((item, index) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  isLast={
                    index ===
                    sortedItems.length - 1
                  }
                />
              ))}

            </ol>

          </div>
        )}

      </Card>

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}

      {latestActivity ? (
        <div className="flex items-center justify-center gap-2 pt-1">

          <Clock3
            className="h-3 w-3 text-muted"
            aria-hidden="true"
          />

          <p className="text-[10px] text-muted">
            Latest activity{" "}
            {getRelativeTime(
              latestActivity.createdAt,
            )}
          </p>

        </div>
      ) : null}

    </div>
  );
}