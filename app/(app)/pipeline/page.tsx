"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PipelineBoard } from "@/components/pipeline/board";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import type { LeadDTO, LeadStatus, Paginated } from "@/types/crm";

export default function PipelinePage() {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api<Paginated<LeadDTO>>("/api/leads?pageSize=50&sort=updatedAt");
      setLeads(data.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onStatusChange(id: string, status: LeadStatus) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    try {
      const updated = await api<LeadDTO>(`/api/leads/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setLeads((current) => current.map((lead) => (lead.id === id ? updated : lead)));
      toast.success(`Moved to ${status}`);
    } catch (err) {
      setLeads(previous);
      toast.error(err instanceof Error ? err.message : "Status update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="text-sm text-muted">Drag cards between stages. Changes persist to MongoDB and write an activity event.</p>
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {loading ? <Skeleton className="h-96" /> : <PipelineBoard leads={leads} onStatusChange={onStatusChange} />}
    </div>
  );
}
