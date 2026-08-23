"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LeadForm, emptyLeadForm, type LeadFormValue } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadDTO,
  type Paginated,
} from "@/types/crm";

export default function LeadsPage() {
  const [data, setData] = useState<Paginated<LeadDTO> | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      q,
      sort,
      order,
      page: String(page),
      pageSize: "10",
    });
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (priority) params.set("priority", priority);
    return params.toString();
  }, [q, status, source, priority, sort, order, page]);

  async function load() {
    try {
      setData(await api<Paginated<LeadDTO>>(`/api/leads?${query}`));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    }
  }

  useEffect(() => {
    void load();
  }, [query]);

  async function createLead(value: LeadFormValue) {
    await api("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        ...value,
        followUpDate: value.followUpDate ? new Date(value.followUpDate).toISOString() : null,
      }),
    });
    toast.success("Lead created");
    setCreateOpen(false);
    await load();
  }

  async function removeLead() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api(`/api/leads/${deleteId}`, { method: "DELETE" });
      toast.success("Lead deleted");
      setDeleteId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">Search, filter, and manage every relationship.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New lead</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Input placeholder="Search name, email, company" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={source} onChange={(e) => { setPage(1); setSource(e.target.value); }}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }}>
          <option value="">All priorities</option>
          {LEAD_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select
          value={`${sort}:${order}`}
          onChange={(e) => {
            const [nextSort, nextOrder] = e.target.value.split(":");
            setSort(nextSort);
            setOrder(nextOrder as "asc" | "desc");
          }}
        >
          <option value="createdAt:desc">Newest</option>
          <option value="createdAt:asc">Oldest</option>
          <option value="value:desc">Value high-low</option>
          <option value="value:asc">Value low-high</option>
          <option value="name:asc">Name A-Z</option>
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {!data ? (
        <Skeleton className="h-80" />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No leads match these filters"
          description="Create a lead or submit the public contact form to populate the pipeline."
          action={<Button onClick={() => setCreateOpen(true)}>Create lead</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/3 text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((lead) => (
                <tr key={lead.id} className="border-t border-border hover:bg-white/3">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:text-accent">
                      {lead.name}
                    </Link>
                    <p className="text-xs text-muted">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">{lead.company}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={lead.priority} /></td>
                  <td className="px-4 py-3">{formatCurrency(lead.value)}</td>
                  <td className="px-4 py-3">{lead.source}</td>
                  <td className="px-4 py-3">{formatDate(lead.followUpDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-danger" onClick={() => setDeleteId(lead.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
            <span>
              {data.total} leads · page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={createOpen} title="Create lead" onClose={() => setCreateOpen(false)}>
        <LeadForm initial={emptyLeadForm} submitLabel="Create lead" onSubmit={createLead} />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete lead"
        description="This permanently removes the lead, notes, and follow-ups from MongoDB."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={removeLead}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
