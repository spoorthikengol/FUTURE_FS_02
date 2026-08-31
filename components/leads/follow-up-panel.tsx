"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Clock3,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/utils";
import type { FollowUpDTO } from "@/types/crm";

export function FollowUpPanel({
  leadId,
  items,
  onChange,
}: {
  leadId: string;
  items: FollowUpDTO[];
  onChange: (items: FollowUpDTO[]) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  async function createFollowUp() {
    if (!date || !description.trim()) {
      toast.error("Date and description are required");
      return;
    }

    setSaving(true);

    try {
      const item = await api<FollowUpDTO>(
        `/api/leads/${leadId}/followups`,
        {
          method: "POST",
          body: JSON.stringify({
            date,
            time,
            description,
          }),
        },
      );

      onChange([...items, item]);
      setDescription("");

      toast.success("Follow-up scheduled");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not schedule follow-up",
      );
    } finally {
      setSaving(false);
    }
  }

  async function complete(id: string) {
    setCompletingId(id);

    try {
      const item = await api<FollowUpDTO>(
        `/api/followups/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "COMPLETED",
          }),
        },
      );

      onChange(
        items.map((entry) =>
          entry.id === id ? item : entry,
        ),
      );

      toast.success("Follow-up completed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not complete follow-up",
      );
    } finally {
      setCompletingId(null);
    }
  }

  const groups: {
    key: FollowUpDTO["status"];
    label: string;
    description: string;
    accent: string;
    dot: string;
    badge: string;
  }[] = [
    {
      key: "OVERDUE",
      label: "Overdue",
      description: "Needs attention",
      accent: "border-rose-500/20 bg-rose-500/[0.025]",
      dot: "bg-rose-400",
      badge: "bg-rose-500/10 text-rose-300",
    },
    {
      key: "UPCOMING",
      label: "Upcoming",
      description: "Next customer touchpoints",
      accent: "border-amber-500/20 bg-amber-500/[0.025]",
      dot: "bg-amber-400",
      badge: "bg-amber-500/10 text-amber-300",
    },
    {
      key: "COMPLETED",
      label: "Completed",
      description: "Recently finished",
      accent: "border-emerald-500/20 bg-emerald-500/[0.025]",
      dot: "bg-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Schedule follow-up */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.025)] transition-all duration-300 hover:border-white/[0.12]">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent/[0.07] text-accent">
              <Plus className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Schedule follow-up
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-muted">
                Create the next customer touchpoint and keep your pipeline moving.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Date</Label>

              <div className="relative mt-1.5">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9 transition-all duration-200 focus:border-accent/40 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.08)]"
                />
              </div>
            </div>

            <div>
              <Label>Time</Label>

              <div className="relative mt-1.5">
                <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-9 transition-all duration-200 focus:border-accent/40 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.08)]"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Description</Label>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Follow up on proposal and confirm next steps..."
                className="mt-1.5 min-h-[88px] resize-none transition-all duration-200 focus:border-accent/40 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.08)]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 md:col-span-2">
              <p className="hidden text-[11px] text-muted sm:block">
                Keep follow-ups specific and action-oriented.
              </p>

              <Button
                size="sm"
                onClick={createFollowUp}
                disabled={saving}
                className="ml-auto transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_8px_22px_-7px_rgba(45,212,191,0.42)] active:scale-[0.98]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />

                {saving ? "Scheduling..." : "Schedule follow-up"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Follow-up groups */}
      <div className="space-y-4">
        {groups.map((group) => {
          const list = items.filter(
            (item) => item.status === group.key,
          );

          return (
            <section
              key={group.key}
              className={`rounded-2xl border p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.13] hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)] ${group.accent}`}
            >
              {/* Section header */}
              <div className="flex items-center justify-between gap-3 px-1 py-1">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor] ${group.dot}`}
                    aria-hidden="true"
                  />

                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.09em] text-foreground/85">
                      {group.label}
                    </h3>

                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {group.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-semibold tabular-nums ${group.badge}`}
                >
                  {list.length}
                </span>
              </div>

              {/* Empty state */}
              {list.length === 0 ? (
                <div className="mt-3 flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-white/[0.07] bg-black/[0.08]">
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-strong">
                      Nothing here
                    </p>

                    <p className="mt-0.5 text-[11px] text-muted">
                      Your {group.label.toLowerCase()} follow-ups will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.map((item) => {
                    const isCompleting =
                      completingId === item.id;

                    return (
                      <li
                        key={item.id}
                        className="group/item relative flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-white/[0.055] bg-black/[0.14] p-3.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:border-white/[0.14] hover:bg-white/[0.025] hover:shadow-[0_10px_25px_-14px_rgba(0,0,0,0.7)]"
                      >
                        {/* Accent line */}
                        <span
                          className={`absolute bottom-2 left-0 top-2 w-px opacity-0 transition-opacity duration-200 group-hover/item:opacity-100 ${group.dot}`}
                          aria-hidden="true"
                        />

                        <div className="min-w-0 pl-1">
                          <p className="truncate text-sm font-medium leading-snug text-foreground">
                            {item.description}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(item.date)}
                            </span>

                            <span className="text-zinc-700">
                              ·
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {item.time}
                            </span>
                          </div>
                        </div>

                        {item.status !== "COMPLETED" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isCompleting}
                            onClick={() => complete(item.id)}
                            className="shrink-0 transition-all duration-200 ease-out hover:-translate-y-px hover:scale-[1.03] hover:border-emerald-400/20 hover:bg-emerald-500/10 hover:text-emerald-300 active:scale-[0.97]"
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" />

                            {isCompleting
                              ? "Completing..."
                              : "Complete"}
                          </Button>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                            <Check className="h-3 w-3" />
                            Done
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}