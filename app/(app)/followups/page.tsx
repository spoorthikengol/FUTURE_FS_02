"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui/states";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/utils";
import type { FollowUpStatus } from "@/types/crm";

type FollowUpItem = {
  id: string;
  leadId: string;
  date: string;
  time: string;
  description: string;
  status: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
  leadName: string;
  company: string;
};

type LeadOption = {
  id: string;
  name: string;
  company: string;
};

const FILTERS = ["All", "Upcoming", "Overdue", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_CLASS: Record<FollowUpStatus, string> = {
  OVERDUE:
    "border-rose-400/20 bg-rose-400/[0.07] text-rose-300",
  UPCOMING:
    "border-amber-400/20 bg-amber-400/[0.07] text-amber-300",
  COMPLETED:
    "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300",
};

const STATUS_DOT: Record<FollowUpStatus, string> = {
  OVERDUE: "bg-rose-400",
  UPCOMING: "bg-amber-400",
  COMPLETED: "bg-emerald-400",
};

const STATUS_BORDER: Record<FollowUpStatus, string> = {
  OVERDUE: "before:bg-rose-400",
  UPCOMING: "before:bg-amber-400",
  COMPLETED: "before:bg-emerald-400",
};

const emptyForm = {
  leadId: "",
  date: "",
  time: "10:00",
  description: "",
};

function StatusBadge({ status }: { status: FollowUpStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${STATUS_CLASS[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Clock3;
  tone: "amber" | "rose" | "emerald";
}) {
  const toneClasses = {
    amber: {
      icon: "bg-amber-400/10 text-amber-300",
      glow: "group-hover:border-amber-400/20",
    },
    rose: {
      icon: "bg-rose-400/10 text-rose-300",
      glow: "group-hover:border-rose-400/20",
    },
    emerald: {
      icon: "bg-emerald-400/10 text-emerald-300",
      glow: "group-hover:border-emerald-400/20",
    },
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-card-hover hover:shadow-[0_14px_40px_-18px_rgba(0,0,0,0.7)] ${toneClasses[tone].glow}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone].icon} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/[0.02] blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}

function FollowUpCard({
  item,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
}: {
  item: FollowUpItem;
  onComplete: (item: FollowUpItem) => void;
  onReopen: (item: FollowUpItem) => void;
  onEdit: (item: FollowUpItem) => void;
  onDelete: (item: FollowUpItem) => void;
}) {
  return (
    <li
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 pl-5 transition-all duration-300 ease-out before:absolute before:bottom-0 before:left-0 before:top-0 before:w-[2px] before:opacity-50 ${STATUS_BORDER[item.status]} hover:-translate-y-0.5 hover:scale-[1.005] hover:border-white/15 hover:bg-card-hover hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.75)]`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />

            <Link
              href={`/leads/${item.leadId}`}
              className="truncate text-sm font-semibold text-foreground transition-colors duration-200 hover:text-accent"
            >
              {item.leadName}
            </Link>

            <span className="hidden text-zinc-700 sm:inline">•</span>

            <span className="truncate text-xs text-muted">
              {item.company}
            </span>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-muted-strong">
            {item.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(item.date)}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {item.time}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {item.status !== "COMPLETED" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onComplete(item)}
              className="transition-all duration-200 hover:-translate-y-px hover:scale-[1.02] hover:border-emerald-400/20 hover:text-emerald-300"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Complete
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onReopen(item)}
              className="transition-all duration-200 hover:-translate-y-px hover:scale-[1.02]"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reopen
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => onEdit(item)}
            className="transition-all duration-200 hover:-translate-y-px hover:scale-[1.02]"
          >
            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(item)}
            className="transition-all duration-200 hover:-translate-y-px hover:scale-[1.02]"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUpItem[] | null>(null);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<FollowUpItem | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  const [deleting, setDeleting] = useState<FollowUpItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function load() {
    try {
      const [followUps, leadsRes] = await Promise.all([
        api<FollowUpItem[]>("/api/followups"),
        api<{ items: LeadOption[] }>(
          "/api/leads?pageSize=100&sort=name&order=asc",
        ),
      ]);

      setItems(followUps);
      setLeads(leadsRes.items);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load follow-ups",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (!items) return [];

    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (
        filter !== "All" &&
        item.status !== filter.toUpperCase()
      ) {
        return false;
      }

      if (!q) return true;

      return (
        item.description.toLowerCase().includes(q) ||
        item.leadName.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const list = items ?? [];

    return {
      upcoming: list.filter(
        (item) => item.status === "UPCOMING",
      ).length,
      overdue: list.filter(
        (item) => item.status === "OVERDUE",
      ).length,
      completed: list.filter(
        (item) => item.status === "COMPLETED",
      ).length,
    };
  }, [items]);

  async function createFollowUp() {
    if (
      !form.leadId ||
      !form.date ||
      !form.description.trim()
    ) {
      setFormError(
        "Lead, date, and description are required.",
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const created = await api<FollowUpItem>(
        `/api/leads/${form.leadId}/followups`,
        {
          method: "POST",
          body: JSON.stringify({
            date: form.date,
            time: form.time,
            description: form.description,
          }),
        },
      );

      const lead = leads.find(
        (l) => l.id === form.leadId,
      );

      setItems((prev) => [
        ...(prev ?? []),
        {
          ...created,
          leadName: lead?.name ?? "",
          company: lead?.company ?? "",
        },
      ]);

      setForm(emptyForm);
      setShowCreate(false);

      toast.success("Follow-up created");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not create follow-up",
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(item: FollowUpItem) {
    setEditing(item);

    setEditForm({
      leadId: item.leadId,
      date: item.date.slice(0, 10),
      time: item.time,
      description: item.description,
    });
  }

  async function saveEdit() {
    if (!editing) return;

    setEditSaving(true);

    try {
      const updated = await api<FollowUpItem>(
        `/api/followups/${editing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            date: editForm.date,
            time: editForm.time,
            description: editForm.description,
          }),
        },
      );

      setItems((prev) =>
        (prev ?? []).map((item) =>
          item.id === editing.id
            ? {
                ...updated,
                leadName: item.leadName,
                company: item.company,
              }
            : item,
        ),
      );

      setEditing(null);

      toast.success("Follow-up updated");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not update follow-up",
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function complete(item: FollowUpItem) {
    try {
      const updated = await api<FollowUpItem>(
        `/api/followups/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "COMPLETED",
          }),
        },
      );

      setItems((prev) =>
        (prev ?? []).map((entry) =>
          entry.id === item.id
            ? {
                ...updated,
                leadName: entry.leadName,
                company: entry.company,
              }
            : entry,
        ),
      );

      toast.success("Follow-up completed");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not complete follow-up",
      );
    }
  }

  async function reopen(item: FollowUpItem) {
    try {
      const updated = await api<FollowUpItem>(
        `/api/followups/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "UPCOMING",
          }),
        },
      );

      setItems((prev) =>
        (prev ?? []).map((entry) =>
          entry.id === item.id
            ? {
                ...updated,
                leadName: entry.leadName,
                company: entry.company,
              }
            : entry,
        ),
      );

      toast.success("Follow-up reopened");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not reopen follow-up",
      );
    }
  }

  async function confirmDelete() {
    if (!deleting) return;

    setDeleteLoading(true);

    try {
      await api(`/api/followups/${deleting.id}`, {
        method: "DELETE",
      });

      setItems((prev) =>
        (prev ?? []).filter(
          (item) => item.id !== deleting.id,
        ),
      );

      toast.success("Follow-up deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not delete follow-up",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (!items) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-7 pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Relationship management
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Follow-ups
          </h1>

          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Stay on top of conversations and never miss an important
            customer touchpoint.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError("");
            setShowCreate(true);
          }}
          className="group self-start transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_28px_-8px_rgba(45,212,191,0.45)] sm:self-auto"
        >
          <Plus className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          Create follow-up
        </Button>
      </div>

      {/* STATS */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Upcoming"
          value={counts.upcoming}
          icon={Clock3}
          tone="amber"
        />

        <StatCard
          label="Overdue"
          value={counts.overdue}
          icon={CalendarDays}
          tone="rose"
        />

        <StatCard
          label="Completed"
          value={counts.completed}
          icon={Check}
          tone="emerald"
        />
      </div>

      {/* FILTER / SEARCH */}
      <div className="rounded-2xl border border-border bg-card/70 p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-sm">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((option) => {
              const active = filter === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-200 ease-out ${
                    active
                      ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(45,212,191,0.22)]"
                      : "text-muted hover:bg-white/[0.035] hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors duration-200"
              aria-hidden="true"
            />

            <Input
              placeholder="Search follow-ups..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 border-transparent bg-white/[0.025] pl-9 transition-all duration-200 focus:border-accent/30 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(45,212,191,0.08)]"
            />
          </div>
        </div>
      </div>

      {/* CONTENT */}
<Card className="overflow-hidden border-border/80 bg-card/80 shadow-[0_10px_40px_-30px_rgba(0,0,0,0.8)]">
  <CardHeader
    title={`${visible.length} follow-up${visible.length === 1 ? "" : "s"}${
      filter !== "All" ? ` · ${filter}` : ""
    }`}
  />

  {visible.length === 0 ? (
    <div className="px-4 pb-4">
      <EmptyState
        title="No follow-ups here"
        description={
          query || filter !== "All"
            ? "Try a different filter or search."
            : "Create your first follow-up to get started."
        }
      />
    </div>
  ) : (
    <ul className="space-y-2.5 px-4 pb-4">
      {visible.map((item) => (
        <FollowUpCard
          key={item.id}
          item={item}
          onComplete={complete}
          onReopen={reopen}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      ))}
    </ul>
  )}
</Card>

      {/* CREATE MODAL */}
      <Modal
        open={showCreate}
        title="Create follow-up"
        onClose={() => setShowCreate(false)}
      >
        <div className="space-y-4">
          <div>
            <Label>Lead</Label>

            <Select
              value={form.leadId}
              onChange={(e) =>
                setForm({
                  ...form,
                  leadId: e.target.value,
                })
              }
            >
              <option value="">Select a lead…</option>

              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} — {lead.company}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>

              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    date: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Time</Label>

              <Input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    time: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>

            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              placeholder="What needs to be discussed?"
            />
          </div>

          <FieldError message={formError} />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={createFollowUp}
              disabled={saving}
              className="transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_20px_-7px_rgba(45,212,191,0.4)]"
            >
              {saving ? "Creating…" : "Create follow-up"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={!!editing}
        title="Edit follow-up"
        onClose={() => setEditing(null)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>

              <Input
                type="date"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    date: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Time</Label>

              <Input
                type="time"
                value={editForm.time}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    time: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>

            <Textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>

            <Button
              onClick={saveEdit}
              disabled={editSaving}
            >
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE */}
      <ConfirmDialog
        open={!!deleting}
        title="Delete follow-up?"
        description={`This permanently deletes the follow-up for ${
          deleting?.leadName ?? "this lead"
        }. This can't be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}