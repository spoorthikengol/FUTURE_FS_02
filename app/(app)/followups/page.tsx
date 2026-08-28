"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
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

type LeadOption = { id: string; name: string; company: string };

const FILTERS = ["All", "Upcoming", "Overdue", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_CLASS: Record<FollowUpStatus, string> = {
  OVERDUE: "bg-rose-500/10 text-rose-300",
  UPCOMING: "bg-amber-500/10 text-amber-300",
  COMPLETED: "bg-emerald-500/10 text-emerald-300",
};

const emptyForm = { leadId: "", date: "", time: "10:00", description: "" };

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
        api<{ items: LeadOption[] }>("/api/leads?pageSize=100&sort=name&order=asc"),
      ]);
      setItems(followUps);
      setLeads(leadsRes.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load follow-ups");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "All" && item.status !== filter.toUpperCase()) return false;
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
      upcoming: list.filter((item) => item.status === "UPCOMING").length,
      overdue: list.filter((item) => item.status === "OVERDUE").length,
      completed: list.filter((item) => item.status === "COMPLETED").length,
    };
  }, [items]);

  async function createFollowUp() {
    if (!form.leadId || !form.date || !form.description.trim()) {
      setFormError("Lead, date, and description are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const created = await api<FollowUpItem>(`/api/leads/${form.leadId}/followups`, {
        method: "POST",
        body: JSON.stringify({ date: form.date, time: form.time, description: form.description }),
      });
      const lead = leads.find((l) => l.id === form.leadId);
      setItems((prev) => [...(prev ?? []), { ...created, leadName: lead?.name ?? "", company: lead?.company ?? "" }]);
      setForm(emptyForm);
      setShowCreate(false);
      toast.success("Follow-up created");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create follow-up");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(item: FollowUpItem) {
    setEditing(item);
    setEditForm({ leadId: item.leadId, date: item.date.slice(0, 10), time: item.time, description: item.description });
  }

  async function saveEdit() {
    if (!editing) return;
    setEditSaving(true);
    try {
      const updated = await api<FollowUpItem>(`/api/followups/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ date: editForm.date, time: editForm.time, description: editForm.description }),
      });
      setItems((prev) =>
        (prev ?? []).map((item) =>
          item.id === editing.id ? { ...updated, leadName: item.leadName, company: item.company } : item,
        ),
      );
      setEditing(null);
      toast.success("Follow-up updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update follow-up");
    } finally {
      setEditSaving(false);
    }
  }

  async function complete(item: FollowUpItem) {
    try {
      const updated = await api<FollowUpItem>(`/api/followups/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      setItems((prev) =>
        (prev ?? []).map((entry) =>
          entry.id === item.id ? { ...updated, leadName: entry.leadName, company: entry.company } : entry,
        ),
      );
      toast.success("Follow-up completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete follow-up");
    }
  }

  async function reopen(item: FollowUpItem) {
    try {
      const updated = await api<FollowUpItem>(`/api/followups/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "UPCOMING" }),
      });
      setItems((prev) =>
        (prev ?? []).map((entry) =>
          entry.id === item.id ? { ...updated, leadName: entry.leadName, company: entry.company } : entry,
        ),
      );
      toast.success("Follow-up reopened");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reopen follow-up");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api(`/api/followups/${deleting.id}`, { method: "DELETE" });
      setItems((prev) => (prev ?? []).filter((item) => item.id !== deleting.id));
      toast.success("Follow-up deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete follow-up");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Follow-ups</h1>
          <p className="text-sm text-muted">
            {counts.overdue} overdue · {counts.upcoming} upcoming · {counts.completed} completed
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create follow-up</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === option
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search title, lead, or notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader title={`${visible.length} follow-up${visible.length === 1 ? "" : "s"}`} />
        {visible.length === 0 ? (
          <EmptyState
            title="No follow-ups here"
            description={query || filter !== "All" ? "Try a different filter or search." : "Create your first follow-up to get started."}
          />
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-white/3 p-4 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={STATUS_CLASS[item.status]}>{item.status}</Badge>
                    <Link href={`/leads/${item.leadId}`} className="font-medium text-foreground hover:text-accent">
                      {item.leadName}
                    </Link>
                    <span className="text-xs text-muted">{item.company}</span>
                  </div>
                  <p className="mt-1 text-muted-strong">{item.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(item.date)} · {item.time}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.status !== "COMPLETED" ? (
                    <Button size="sm" variant="secondary" onClick={() => complete(item)}>
                      Complete
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => reopen(item)}>
                      Reopen
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(item)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={showCreate} title="Create follow-up" onClose={() => setShowCreate(false)}>
        <div className="space-y-3">
          <div>
            <Label>Lead</Label>
            <Select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
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
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <FieldError message={formError} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={createFollowUp} disabled={saving}>
              {saving ? "Creating…" : "Create follow-up"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editing} title="Edit follow-up" onClose={() => setEditing(null)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete follow-up?"
        description={`This permanently deletes the follow-up for ${deleting?.leadName ?? "this lead"}. This can't be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}