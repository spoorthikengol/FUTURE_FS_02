"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import {
  LeadForm,
  emptyLeadForm,
  type LeadFormValue,
} from "@/components/leads/lead-form";
import { ResponseBadge } from "@/components/leads/response-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/client";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadDTO,
  type Paginated,
} from "@/types/crm";

import type {
  SpeedToLeadLead,
  SpeedToLeadReport,
  SpeedToLeadState,
} from "@/lib/analytics/speed-to-lead";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const FIELD_FOCUS =
  "focus:shadow-[0_0_0_3px_rgba(45,212,191,0.12)]";

const RESPONSE_DOT_CLASS: Record<SpeedToLeadState, string> = {
  ON_TIME: "bg-emerald-400",
  LATE: "bg-amber-400",
  AWAITING: "bg-sky-400",
  BREACHED: "bg-rose-400",
};

/* -------------------------------------------------------------------------- */
/* RESPONSE CELL                                                              */
/* -------------------------------------------------------------------------- */

function ResponseCell({
  state,
  responseMinutes,
}: {
  state: SpeedToLeadState;
  responseMinutes: number | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          RESPONSE_DOT_CLASS[state],
        )}
        aria-hidden="true"
      />

      <ResponseBadge
        state={state}
        responseMinutes={responseMinutes}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* LOADING SKELETON                                                           */
/* -------------------------------------------------------------------------- */

function LeadsTableSkeleton() {
  const rows = Array.from({ length: 6 });

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-border shadow-[0_1px_0_rgba(255,255,255,0.03)] md:block">
        <div className="border-b border-border bg-white/[0.02] px-4 py-2.5">
          <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
        </div>

        <div className="divide-y divide-border">
          {rows.map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 px-4 py-3.5"
            >
              <div className="w-40 space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-white/5" />
                <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
              </div>

              <div className="h-3 w-20 flex-1 animate-pulse rounded bg-white/5" />

              <div className="h-5 w-16 animate-pulse rounded-full bg-white/5" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-white/5" />
              <div className="h-3 w-14 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-20 animate-pulse rounded bg-white/5" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="grid gap-3 md:hidden">
        {rows.map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="h-3.5 w-32 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-24 animate-pulse rounded bg-white/5" />

            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-white/5" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY STATE                                                                */
/* -------------------------------------------------------------------------- */

function LeadsEmptyState({
  onCreate,
}: {
  onCreate?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-strong">
        <Users
          className="h-4.5 w-4.5"
          aria-hidden="true"
        />
      </span>

      <h3 className="mt-3 text-sm font-medium text-foreground">
        No leads found
      </h3>

      <p className="mt-1 max-w-xs text-sm text-muted">
        Try adjusting your search or filters.
      </p>

      {onCreate ? (
        <Button
          className="mt-4"
          size="sm"
          onClick={onCreate}
        >
          Create lead
        </Button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function LeadsPage() {
  const router = useRouter();

  const [data, setData] =
    useState<Paginated<LeadDTO> | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");

  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] =
    useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);

  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] =
    useState(false);

  const [deleteId, setDeleteId] =
    useState<string | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  const [speedToLead, setSpeedToLead] =
    useState<SpeedToLeadReport | null>(null);

  const [awaitingOnly, setAwaitingOnly] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* QUERY                                                                    */
  /* ------------------------------------------------------------------------ */

  const query = useMemo(() => {
    const params = new URLSearchParams({
      q,
      sort,
      order,
      page: String(page),
      pageSize: "10",
    });

    if (status) {
      params.set("status", status);
    }

    if (source) {
      params.set("source", source);
    }

    if (priority) {
      params.set("priority", priority);
    }

    return params.toString();
  }, [
    q,
    status,
    source,
    priority,
    sort,
    order,
    page,
  ]);

  /* ------------------------------------------------------------------------ */
  /* LOAD LEADS                                                               */
  /* ------------------------------------------------------------------------ */

  async function load() {
    try {
      setData(
        await api<Paginated<LeadDTO>>(
          `/api/leads?${query}`,
        ),
      );

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load leads",
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOAD SPEED TO LEAD                                                       */
  /* ------------------------------------------------------------------------ */

  async function loadSpeedToLead() {
    try {
      const result =
        await api<SpeedToLeadReport>(
          "/api/analytics/speed-to-lead",
        );

      setSpeedToLead(result);
    } catch {
      // Speed-to-lead is non-critical.
      // Leads still work normally without it.
    }
  }

  /* ------------------------------------------------------------------------ */
  /* EFFECTS                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    void load();
  }, [query]);

  useEffect(() => {
    void loadSpeedToLead();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* SPEED MAP                                                                */
  /* ------------------------------------------------------------------------ */

  const speedById = useMemo(() => {
    const map = new Map<
      string,
      SpeedToLeadLead
    >();

    for (
      const lead of speedToLead?.leads ?? []
    ) {
      map.set(lead.id, lead);
    }

    return map;
  }, [speedToLead]);

  /* ------------------------------------------------------------------------ */
  /* AWAITING LEADS                                                           */
  /* ------------------------------------------------------------------------ */

  const awaitingLeads = useMemo(
    () =>
      (speedToLead?.leads ?? []).filter(
        (lead) =>
          lead.state === "AWAITING" ||
          lead.state === "BREACHED",
      ),
    [speedToLead],
  );

  /* ------------------------------------------------------------------------ */
  /* CREATE LEAD                                                              */
  /* ------------------------------------------------------------------------ */

  async function createLead(
    value: LeadFormValue,
  ) {
    try {
      await api("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          ...value,
          followUpDate: value.followUpDate
            ? new Date(
                value.followUpDate,
              ).toISOString()
            : null,
        }),
      });

      toast.success("Lead created");

      setCreateOpen(false);

      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create lead",
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE LEAD                                                              */
  /* ------------------------------------------------------------------------ */

  async function removeLead() {
    if (!deleteId) return;

    setDeleting(true);

    try {
      await api(
        `/api/leads/${deleteId}`,
        {
          method: "DELETE",
        },
      );

      toast.success("Lead deleted");

      setDeleteId(null);

      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Delete failed",
      );
    } finally {
      setDeleting(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Leads
          </h1>

          <p className="mt-1 text-sm text-muted">
            Manage and track every customer relationship.
          </p>
        </div>

        <Button
          onClick={() =>
            setCreateOpen(true)
          }
          className="transition-all duration-200 ease-out hover:-translate-y-px hover:scale-[1.02] hover:shadow-[0_8px_20px_-6px_rgba(45,212,191,0.45)]"
        >
          New lead
        </Button>
      </div>

      {/* ================================================================== */}
      {/* SEARCH + FILTERS                                                   */}
      {/* ================================================================== */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
            aria-hidden="true"
          />

          <Input
            placeholder="Search leads..."
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className={cn(
              "pl-9",
              FIELD_FOCUS,
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:shrink-0">
          {/* STATUS */}
          <Select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className={cn(
              "lg:w-36",
              FIELD_FOCUS,
            )}
          >
            <option value="">
              All statuses
            </option>

            {LEAD_STATUSES.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </Select>

          {/* SOURCE */}
          <Select
            value={source}
            onChange={(e) => {
              setPage(1);
              setSource(e.target.value);
            }}
            className={cn(
              "lg:w-36",
              FIELD_FOCUS,
            )}
          >
            <option value="">
              All sources
            </option>

            {LEAD_SOURCES.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </Select>

          {/* PRIORITY */}
          <Select
            value={priority}
            onChange={(e) => {
              setPage(1);
              setPriority(e.target.value);
            }}
            className={cn(
              "lg:w-36",
              FIELD_FOCUS,
            )}
          >
            <option value="">
              All priorities
            </option>

            {LEAD_PRIORITIES.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </Select>

          {/* SORT */}
          <Select
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [
                nextSort,
                nextOrder,
              ] = e.target.value.split(":");

              setSort(nextSort);

              setOrder(
                nextOrder as
                  | "asc"
                  | "desc",
              );
            }}
            className={cn(
              "lg:w-36",
              FIELD_FOCUS,
            )}
          >
            <option value="createdAt:desc">
              Newest
            </option>

            <option value="createdAt:asc">
              Oldest
            </option>

            <option value="value:desc">
              Value high-low
            </option>

            <option value="value:asc">
              Value low-high
            </option>

            <option value="name:asc">
              Name A-Z
            </option>
          </Select>
        </div>
      </div>

      {/* ================================================================== */}
      {/* AWAITING FIRST RESPONSE                                           */}
      {/* ================================================================== */}

      <button
        type="button"
        onClick={() =>
          setAwaitingOnly(
            (value) => !value,
          )
        }
        aria-pressed={awaitingOnly}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out hover:scale-[1.01]",
          awaitingOnly
            ? "border-accent/60 bg-accent-soft text-accent"
            : awaitingLeads.length > 0
              ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-200 hover:border-amber-500/50"
              : "border-border text-muted-strong hover:border-white/20 hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            awaitingOnly ||
              awaitingLeads.length > 0
              ? "bg-amber-400"
              : "bg-zinc-600",
          )}
          aria-hidden="true"
        />

        Awaiting first response (
        {awaitingLeads.length})
      </button>

      {/* ================================================================== */}
      {/* ERROR                                                              */}
      {/* ================================================================== */}

      {error ? (
        <ErrorState
          message={error}
          onRetry={load}
        />
      ) : null}

      {/* ================================================================== */}
      {/* AWAITING ONLY                                                      */}
      {/* ================================================================== */}

      {awaitingOnly ? (
        awaitingLeads.length === 0 ? (
          <LeadsEmptyState />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {awaitingLeads.map(
              (lead) => (
                <div
                  key={lead.id}
                  onClick={() =>
                    router.push(
                      `/leads/${lead.id}`,
                    )
                  }
                  className="cursor-pointer space-y-2.5 rounded-xl border border-border bg-card p-4 text-sm transition-all duration-200 ease-out hover:-translate-y-px hover:scale-[1.01] hover:border-white/15 hover:bg-card-hover hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        className="truncate font-medium text-foreground transition-colors hover:text-accent"
                      >
                        {lead.name}
                      </Link>

                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                        {lead.company}

                        <StatusBadge
                          status={lead.status}
                        />
                      </p>
                    </div>

                    <ResponseCell
                      state={lead.state}
                      responseMinutes={
                        lead.responseMinutes
                      }
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        )
      ) : !data ? (
        /* ================================================================= */
        /* LOADING                                                          */
        /* ================================================================= */

        <LeadsTableSkeleton />
      ) : data.items.length === 0 ? (
        /* ================================================================= */
        /* EMPTY                                                            */
        /* ================================================================= */

        <LeadsEmptyState
          onCreate={() =>
            setCreateOpen(true)
          }
        />
      ) : (
        <>
          {/* ============================================================= */}
          {/* DESKTOP TABLE                                                 */}
          {/* ============================================================= */}

          <div className="hidden overflow-hidden rounded-xl border border-border shadow-[0_1px_0_rgba(255,255,255,0.03)] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Lead
                  </th>

                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Company
                  </th>

                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Status
                  </th>

                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Priority
                  </th>

                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Value
                  </th>

                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Source
                  </th>

                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Follow-up
                  </th>

                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Response
                  </th>

                  <th className="px-4 py-2.5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {data.items.map(
                  (lead) => {
                    const speed =
                      speedById.get(
                        lead.id,
                      );

                    return (
                      <tr
                        key={lead.id}
                        onClick={() =>
                          router.push(
                            `/leads/${lead.id}`,
                          )
                        }
                        className="group cursor-pointer transition-colors duration-200 ease-out hover:bg-white/[0.03]"
                      >
                        {/* LEAD */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/leads/${lead.id}`}
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                            className="font-medium text-foreground transition-colors group-hover:text-accent"
                          >
                            {lead.name}
                          </Link>

                          <p className="mt-0.5 text-xs text-muted">
                            {lead.email}
                          </p>
                        </td>

                        {/* COMPANY */}
                        <td className="px-4 py-3 text-foreground/90">
                          {lead.company}
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={
                              lead.status
                            }
                          />
                        </td>

                        {/* PRIORITY */}
                        <td className="px-4 py-3">
                          <PriorityBadge
                            priority={
                              lead.priority
                            }
                          />
                        </td>

                        {/* VALUE */}
                        <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                          {formatCurrency(
                            lead.value,
                          )}
                        </td>

                        {/* SOURCE */}
                        <td className="px-4 py-3 text-muted-strong">
                          {lead.source}
                        </td>

                        {/* FOLLOW-UP */}
                        <td className="px-4 py-3 text-muted-strong">
                          {formatDate(
                            lead.followUpDate,
                          )}
                        </td>

                        {/* RESPONSE */}
                        <td className="px-4 py-3">
                          {speed ? (
                            <ResponseCell
                              state={
                                speed.state
                              }
                              responseMinutes={
                                speed.responseMinutes
                              }
                            />
                          ) : (
                            <span className="text-muted">
                              —
                            </span>
                          )}
                        </td>

                        {/* DELETE */}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            aria-label={`Delete ${lead.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(
                                lead.id,
                              );
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition-colors duration-200 ease-out hover:bg-rose-500/10 hover:text-danger"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>

            {/* DESKTOP PAGINATION */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
              <span>
                {data.total} leads · page{" "}
                {data.page} of{" "}
                {data.totalPages}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (p) => p - 1,
                    )
                  }
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-muted-strong transition-colors duration-200 ease-out hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />

                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    page >=
                    data.totalPages
                  }
                  onClick={() =>
                    setPage(
                      (p) => p + 1,
                    )
                  }
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-muted-strong transition-colors duration-200 ease-out hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next

                  <ChevronRight
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* MOBILE CARDS                                                   */}
          {/* ============================================================= */}

          <div className="grid gap-3 md:hidden">
            {data.items.map(
              (lead) => {
                const speed =
                  speedById.get(
                    lead.id,
                  );

                return (
                  <div
                    key={lead.id}
                    onClick={() =>
                      router.push(
                        `/leads/${lead.id}`,
                      )
                    }
                    className="cursor-pointer space-y-3 rounded-xl border border-border bg-card p-4 text-sm transition-all duration-200 ease-out hover:-translate-y-px hover:scale-[1.01] hover:border-white/15 hover:bg-card-hover hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/leads/${lead.id}`}
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                          className="truncate font-medium text-foreground hover:text-accent"
                        >
                          {lead.name}
                        </Link>

                        <p className="truncate text-xs text-muted">
                          {lead.company}
                        </p>
                      </div>

                      <button
                        type="button"
                        aria-label={`Delete ${lead.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(
                            lead.id,
                          );
                        }}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors duration-200 ease-out hover:bg-rose-500/10 hover:text-danger"
                      >
                        <Trash2
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge
                        status={
                          lead.status
                        }
                      />

                      <PriorityBadge
                        priority={
                          lead.priority
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-strong">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(
                          lead.value,
                        )}
                      </span>

                      <span>
                        Follow-up{" "}
                        {formatDate(
                          lead.followUpDate,
                        )}
                      </span>
                    </div>

                    {speed ? (
                      <ResponseCell
                        state={
                          speed.state
                        }
                        responseMinutes={
                          speed.responseMinutes
                        }
                      />
                    ) : null}
                  </div>
                );
              },
            )}

            {/* MOBILE PAGINATION */}
            <div className="flex items-center justify-between border-t border-border px-1 pt-3 text-xs text-muted">
              <span>
                {data.total} leads · page{" "}
                {data.page} of{" "}
                {data.totalPages}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (p) => p - 1,
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-strong transition-colors duration-200 ease-out hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={
                    page >=
                    data.totalPages
                  }
                  onClick={() =>
                    setPage(
                      (p) => p + 1,
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-strong transition-colors duration-200 ease-out hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* CREATE LEAD MODAL                                                 */}
      {/* ================================================================== */}

      <Modal
        open={createOpen}
        title="Create lead"
        onClose={() =>
          setCreateOpen(false)
        }
      >
        <LeadForm
          initial={emptyLeadForm}
          submitLabel="Create lead"
          onSubmit={createLead}
        />
      </Modal>

      {/* ================================================================== */}
      {/* DELETE CONFIRMATION                                               */}
      {/* ================================================================== */}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete lead"
        description="This permanently removes the lead, notes, and follow-ups from MongoDB."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={removeLead}
        onClose={() =>
          setDeleteId(null)
        }
      />
    </div>
  );
}