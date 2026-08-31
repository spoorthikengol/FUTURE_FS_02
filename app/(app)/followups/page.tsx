"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Sun,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

type DateBucket = "OVERDUE" | "TODAY" | "TOMORROW" | "THIS_WEEK" | "LATER" | "COMPLETED";

const DATE_BUCKET_ORDER: DateBucket[] = ["OVERDUE", "TODAY", "TOMORROW", "THIS_WEEK", "LATER", "COMPLETED"];
const DATE_BUCKET_LABEL: Record<DateBucket, string> = {
  OVERDUE: "Overdue",
  TODAY: "Today",
  TOMORROW: "Tomorrow",
  THIS_WEEK: "This week",
  LATER: "Later",
  COMPLETED: "Completed",
};
const DATE_BUCKET_DOT: Record<DateBucket, string> = {
  OVERDUE: "bg-rose-400",
  TODAY: "bg-accent",
  TOMORROW: "bg-amber-400",
  THIS_WEEK: "bg-amber-400/70",
  LATER: "bg-zinc-500",
  COMPLETED: "bg-emerald-400",
};

// Local-calendar-day helpers. Deliberately NOT using date.toISOString().slice(0, 10)
// anywhere a user-facing local date is derived -- toISOString() converts to UTC
// first, which shifts the calendar day by one in negative UTC-offset timezones
// (e.g. a browser in UTC-5 clicking "today" late in the evening would compute
// tomorrow's UTC date). These helpers stay in local time throughout.
function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function bucketForItem(item: FollowUpItem, today: Date): DateBucket {
  if (item.status === "COMPLETED") return "COMPLETED";
  if (item.status === "OVERDUE") return "OVERDUE";
  // UPCOMING
  const itemDay = startOfLocalDay(new Date(item.date));
  if (isSameLocalDay(itemDay, today)) return "TODAY";
  const tomorrow = addLocalDays(today, 1);
  if (isSameLocalDay(itemDay, tomorrow)) return "TOMORROW";
  const weekEnd = addLocalDays(today, 7);
  if (itemDay.getTime() > tomorrow.getTime() && itemDay.getTime() <= weekEnd.getTime()) return "THIS_WEEK";
  return "LATER";
}

// Human-friendly date phrasing layered on top of the exact date/time,
// which is always shown alongside this (never replaced) in the UI.
// Reuses the same local-day primitives as bucketForItem above, so it
// stays consistent with the existing grouping and stays timezone-safe.
function smartDateLabel(item: FollowUpItem, today: Date): string {
  const itemDay = startOfLocalDay(new Date(item.date));
  const diffDays = Math.round((itemDay.getTime() - today.getTime()) / 86_400_000);

  if (item.status === "OVERDUE") {
    const overdueDays = Math.max(1, -diffDays);
    return overdueDays === 1 ? "Overdue by 1 day" : `Overdue by ${overdueDays} days`;
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return "";
}

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
  helper,
}: {
  label: string;
  value: string | number;
  icon: typeof Clock3;
  tone: "amber" | "rose" | "emerald" | "accent";
  helper?: string;
}) {
  const toneClasses = {
    amber: {
      icon: "bg-amber-400/10 text-amber-300",
      glow: "group-hover:border-amber-400/20",
      border: "border-border",
    },
    rose: {
      icon: "bg-rose-400/10 text-rose-300",
      glow: "group-hover:border-rose-400/20",
      border: "border-border",
    },
    emerald: {
      icon: "bg-emerald-400/10 text-emerald-300",
      glow: "group-hover:border-emerald-400/20",
      border: "border-border",
    },
    // Today's own subtle identity, built from the existing accent
    // token rather than a new color, so it reads as distinct from
    // Upcoming without introducing brightness.
    accent: {
      icon: "bg-accent/10 text-accent",
      glow: "group-hover:border-accent/30",
      border: "border-accent/15",
    },
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${toneClasses[tone].border} bg-card p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-card-hover hover:shadow-[0_14px_40px_-18px_rgba(0,0,0,0.7)] ${toneClasses[tone].glow}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {helper ? <p className="mt-0.5 text-[11px] text-muted">{helper}</p> : null}
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
  today,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
}: {
  item: FollowUpItem;
  today: Date;
  onComplete: (item: FollowUpItem) => void;
  onReopen: (item: FollowUpItem) => void;
  onEdit: (item: FollowUpItem) => void;
  onDelete: (item: FollowUpItem) => void;
}) {
  const dateLabel = smartDateLabel(item, today);

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
              {dateLabel ? <span className="text-muted-strong">· {dateLabel}</span> : null}
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

function MonthCalendar({
  month,
  items,
  today,
  onPrevMonth,
  onNextMonth,
  onToday,
  onScheduleDay,
  onOpenFollowUp,
}: {
  month: Date;
  items: FollowUpItem[];
  today: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onScheduleDay: (day: Date) => void;
  onOpenFollowUp: (item: FollowUpItem) => void;
}) {
  const days = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstOfMonth = new Date(year, m, 1);
    const gridStart = addLocalDays(firstOfMonth, -firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const day = addLocalDays(gridStart, i);
      const dayItems = items
        .filter((item) => isSameLocalDay(startOfLocalDay(new Date(item.date)), day))
        .sort((a, b) => a.time.localeCompare(b.time));
      return { day, inMonth: day.getMonth() === m, items: dayItems };
    });
  }, [month, items]);

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card className="border-border/80 bg-card/80 p-4 shadow-[0_10px_40px_-30px_rgba(0,0,0,0.8)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border text-[11px]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="bg-card px-2 py-1.5 text-center font-medium text-muted" aria-hidden="true">
            {label}
          </div>
        ))}
        {days.map(({ day, inMonth, items: dayItems }) => {
          const isToday = isSameLocalDay(day, today);
          const dateLabel = day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
          return (
            <div key={day.toISOString()} className={`min-h-[86px] bg-card p-1 ${inMonth ? "" : "opacity-40"}`}>
              <button
                type="button"
                onClick={() => onScheduleDay(day)}
                aria-label={
                  dayItems.length > 0
                    ? `${dateLabel}, ${dayItems.length} follow-up${dayItems.length === 1 ? "" : "s"}. Schedule another follow-up.`
                    : `${dateLabel}. Schedule a follow-up.`
                }
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] transition-colors duration-150 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  isToday ? "bg-accent/15 font-semibold text-accent" : "text-muted"
                }`}
              >
                {day.getDate()}
              </button>
              <div className="mt-1 space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenFollowUp(item)}
                    aria-label={`${item.time}, ${item.leadName}, ${item.status.toLowerCase()}. Open follow-up.`}
                    className="flex w-full items-center gap-1 truncate rounded-md bg-white/[0.05] px-1.5 py-0.5 text-left text-[10px] text-muted-strong transition-colors duration-150 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DATE_BUCKET_DOT[bucketForItem(item, today)]}`} aria-hidden="true" />
                    <span className="truncate">
                      {item.time} {item.leadName}
                    </span>
                  </button>
                ))}
                {dayItems.length > 3 ? (
                  <p className="px-1.5 text-[10px] text-muted">+{dayItems.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUpItem[] | null>(null);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

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

  const today = useMemo(() => startOfLocalDay(new Date()), []);

  const groupedVisible = useMemo(() => {
    const groups: Record<DateBucket, FollowUpItem[]> = {
      OVERDUE: [],
      TODAY: [],
      TOMORROW: [],
      THIS_WEEK: [],
      LATER: [],
      COMPLETED: [],
    };
    for (const item of visible) groups[bucketForItem(item, today)].push(item);
    return groups;
  }, [visible, today]);

  // Follow-up Intelligence: every value here is derived from `items`,
  // the same real data already loaded for the list/calendar — no
  // separate dataset, no fake numbers, no new API calls.
  const intelligence = useMemo(() => {
    const list = items ?? [];
    const total = list.length;
    const completedCount = list.filter((item) => item.status === "COMPLETED").length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : null;

    const todayCount = list.filter(
      (item) => item.status !== "COMPLETED" && bucketForItem(item, today) === "TODAY",
    ).length;

    const overdueItems = list
      .filter((item) => item.status === "OVERDUE")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const todayItems = list
      .filter((item) => item.status !== "COMPLETED" && bucketForItem(item, today) === "TODAY")
      .sort((a, b) => a.time.localeCompare(b.time));

    // Leads with more than one overdue follow-up — a real, honestly
    // derivable signal from the currently-loaded data (no extra fetch).
    const overdueByLead = new Map<string, { leadName: string; count: number }>();
    for (const item of overdueItems) {
      const entry = overdueByLead.get(item.leadId) ?? { leadName: item.leadName, count: 0 };
      entry.count += 1;
      overdueByLead.set(item.leadId, entry);
    }
    const leadsWithMultipleOverdue = [...overdueByLead.entries()]
      .filter(([, entry]) => entry.count > 1)
      .map(([leadId, entry]) => ({ leadId, ...entry }));

    // Momentum: only shown when there is real recent-completion data to
    // back it — completed items carry a real `updatedAt` from the
    // backend (set when the status was last saved), so "completed in
    // the last 7 days" is an honest read of existing data, not a guess.
    const sevenDaysAgoMs = today.getTime() - 6 * 86_400_000;
    const completedRecently = list.filter(
      (item) => item.status === "COMPLETED" && new Date(item.updatedAt).getTime() >= sevenDaysAgoMs,
    ).length;

    return {
      total,
      completedCount,
      completionRate,
      todayCount,
      overdueItems,
      todayItems,
      leadsWithMultipleOverdue,
      completedRecently,
    };
  }, [items, today]);

  function openCreateForDay(day: Date) {
    setFormError("");
    setForm({ ...emptyForm, date: toLocalDateInputValue(day) });
    setShowCreate(true);
  }

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
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Today"
          value={intelligence.todayCount}
          icon={Sun}
          tone="accent"
        />

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

        <StatCard
          label="Completion rate"
          value={intelligence.completionRate !== null ? `${intelligence.completionRate}%` : "—"}
          icon={TrendingUp}
          tone="emerald"
          helper={
            intelligence.total > 0
              ? `${intelligence.completedCount} of ${intelligence.total}`
              : "No follow-ups yet"
          }
        />
      </div>

      {/* FOLLOW-UP HEALTH */}
      {intelligence.total > 0 &&
      (intelligence.overdueItems.length > 0 ||
        intelligence.todayItems.length > 0 ||
        intelligence.leadsWithMultipleOverdue.length > 0 ||
        intelligence.completedRecently > 0) ? (
        <Card className="border-border/80 bg-card/80 p-4 shadow-[0_10px_40px_-30px_rgba(0,0,0,0.8)]">
          <h2 className="text-sm font-medium text-foreground">Follow-up health</h2>
          <p className="mt-1 text-xs text-muted">
            {intelligence.completedCount} of {intelligence.total} follow-ups completed
            {intelligence.completionRate !== null ? ` · ${intelligence.completionRate}% completion rate` : ""}
            {intelligence.completedRecently > 0
              ? ` · ${intelligence.completedRecently} completed in the last 7 days`
              : ""}
          </p>

          <ul className="mt-3 space-y-1">
            {intelligence.overdueItems.length > 0 ? (
              <li>
                <button
                  type="button"
                  onClick={() => openEdit(intelligence.overdueItems[0])}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-muted-strong transition-colors duration-150 hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                    {intelligence.overdueItems.length === 1
                      ? "1 follow-up is overdue"
                      : `${intelligence.overdueItems.length} follow-ups are overdue`}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
                </button>
              </li>
            ) : null}

            {intelligence.todayItems.length > 0 ? (
              <li>
                <button
                  type="button"
                  onClick={() => openEdit(intelligence.todayItems[0])}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-muted-strong transition-colors duration-150 hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {intelligence.todayItems.length === 1
                      ? "1 follow-up is due today"
                      : `${intelligence.todayItems.length} follow-ups are due today`}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
                </button>
              </li>
            ) : null}

            {intelligence.leadsWithMultipleOverdue.map((entry) => (
              <li key={entry.leadId}>
                <Link
                  href={`/leads/${entry.leadId}`}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-muted-strong transition-colors duration-150 hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                    {entry.leadName} has {entry.count} overdue follow-ups
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* FILTER / SEARCH */}
      <div className="rounded-2xl border border-border bg-card/70 p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-sm">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex rounded-xl border border-border/70 p-0.5" role="group" aria-label="View">
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  view === "list" ? "bg-white/[0.08] text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                aria-pressed={view === "calendar"}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  view === "calendar" ? "bg-white/[0.08] text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                Calendar
              </button>
            </div>
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
      {view === "calendar" ? (
        <MonthCalendar
          month={calendarMonth}
          items={visible}
          today={today}
          onPrevMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
          onNextMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
          onToday={() => setCalendarMonth(new Date())}
          onScheduleDay={openCreateForDay}
          onOpenFollowUp={openEdit}
        />
      ) : visible.length === 0 ? (
        <Card className="overflow-hidden border-border/80 bg-card/80 shadow-[0_10px_40px_-30px_rgba(0,0,0,0.8)]">
          <div className="px-4 pb-4 pt-4">
            <EmptyState
              title="No follow-ups here"
              description={
                query || filter !== "All"
                  ? "Try a different filter or search."
                  : "Create your first follow-up to get started."
              }
            />
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {DATE_BUCKET_ORDER.filter((bucket) => groupedVisible[bucket].length > 0).map((bucket) => (
            <section key={bucket}>
              <div className="mb-2.5 flex items-center gap-2 px-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${DATE_BUCKET_DOT[bucket]}`} aria-hidden="true" />
                <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-strong">
                  {DATE_BUCKET_LABEL[bucket]}
                </h2>
                <span className="text-xs text-muted">{groupedVisible[bucket].length}</span>
              </div>
              <Card className="overflow-hidden border-border/80 bg-card/80 shadow-[0_10px_40px_-30px_rgba(0,0,0,0.8)]">
                <ul className="space-y-2.5 p-4">
                  {groupedVisible[bucket].map((item) => (
                    <FollowUpCard
                      key={item.id}
                      item={item}
                      today={today}
                      onComplete={complete}
                      onReopen={reopen}
                      onEdit={openEdit}
                      onDelete={setDeleting}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

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