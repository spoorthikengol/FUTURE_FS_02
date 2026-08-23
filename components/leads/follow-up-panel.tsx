"use client";

import { useState } from "react";
import { toast } from "sonner";
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

  async function createFollowUp() {
    if (!date || !description.trim()) {
      toast.error("Date and description are required");
      return;
    }
    setSaving(true);
    try {
      const item = await api<FollowUpDTO>(`/api/leads/${leadId}/followups`, {
        method: "POST",
        body: JSON.stringify({ date, time, description }),
      });
      onChange([...items, item]);
      setDescription("");
      toast.success("Follow-up scheduled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not schedule follow-up");
    } finally {
      setSaving(false);
    }
  }

  async function complete(id: string) {
    const item = await api<FollowUpDTO>(`/api/followups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    onChange(items.map((entry) => (entry.id === id ? item : entry)));
    toast.success("Follow-up completed");
  }

  const groups: { key: FollowUpDTO["status"]; label: string; className: string }[] = [
    { key: "OVERDUE", label: "Overdue", className: "border-rose-500/20 bg-rose-500/5" },
    { key: "UPCOMING", label: "Upcoming", className: "border-amber-500/20 bg-amber-500/5" },
    { key: "COMPLETED", label: "Completed", className: "border-emerald-500/20 bg-emerald-500/5" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button size="sm" onClick={createFollowUp} disabled={saving}>
            {saving ? "Scheduling..." : "Schedule follow-up"}
          </Button>
        </div>
      </div>
      {groups.map((group) => {
        const list = items.filter((item) => item.status === group.key);
        return (
          <div key={group.key} className={`rounded-xl border p-3 ${group.className}`}>
            <p className="text-xs font-medium uppercase tracking-wide">{group.label}</p>
            {list.length === 0 ? (
              <p className="mt-2 text-sm text-muted">None</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {list.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p>{item.description}</p>
                      <p className="text-xs text-muted">
                        {formatDate(item.date)} · {item.time}
                      </p>
                    </div>
                    {item.status !== "COMPLETED" ? (
                      <Button size="sm" variant="secondary" onClick={() => complete(item.id)}>
                        Complete
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
