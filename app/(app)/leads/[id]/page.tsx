"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DealRiskCard } from "@/components/dashboard/deal-risk-card";
import { EmailGenerator } from "@/components/leads/email-generator";
import { FollowUpPanel } from "@/components/leads/follow-up-panel";
import { LeadForm, leadToForm } from "@/components/leads/lead-form";
import { NotesTimeline } from "@/components/leads/notes-timeline";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { FollowUpDTO, LeadDTO, NoteDTO } from "@/types/crm";
import type { DealRiskBreakdownEntry, DealRiskLevel } from "@/lib/ai/deal-risk";

type Insights = {
  score: number;
  quality: string;
  summary: string;
  keySignals: string[];
  recommendedAction: string;
  factors: { label: string; impact: string; detail: string }[];
  disclaimer: string;
  mode: string;
  dealRisk: {
    score: number;
    level: DealRiskLevel;
    reasons: string[];
    recommendedAction: string;
    breakdown: DealRiskBreakdownEntry[];
  };
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDTO | null>(null);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpDTO[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function load() {
    try {
      const payload = await api<{ lead: LeadDTO; notes: NoteDTO[]; followUps: FollowUpDTO[] }>(
        `/api/leads/${params.id}`,
      );
      setLead(payload.lead);
      setNotes(payload.notes);
      setFollowUps(payload.followUps);
      setInsights(
        await api<Insights>("/api/ai/insights", {
          method: "POST",
          body: JSON.stringify({ leadId: params.id }),
        }),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!lead) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-muted">Lead profile</p>
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <p className="text-sm text-muted">
            {lead.jobTitle ? `${lead.jobTitle} · ` : ""}
            {lead.company}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((value) => !value)}>
            {editing ? "Close editor" : "Edit lead"}
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader title="Contact and company" />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Email</dt><dd>{lead.email}</dd></div>
            <div><dt className="text-xs text-muted">Phone</dt><dd>{lead.phone}</dd></div>
            <div><dt className="text-xs text-muted">Company</dt><dd>{lead.company}</dd></div>
            <div><dt className="text-xs text-muted">Job title</dt><dd>{lead.jobTitle || "—"}</dd></div>
            <div><dt className="text-xs text-muted">Status</dt><dd><StatusBadge status={lead.status} /></dd></div>
            <div><dt className="text-xs text-muted">Priority</dt><dd><PriorityBadge priority={lead.priority} /></dd></div>
            <div><dt className="text-xs text-muted">Source</dt><dd>{lead.source}</dd></div>
            <div><dt className="text-xs text-muted">Lead value</dt><dd>{formatCurrency(lead.value)}</dd></div>
            <div><dt className="text-xs text-muted">Follow-up</dt><dd>{formatDateTime(lead.followUpDate)}</dd></div>
            <div><dt className="text-xs text-muted">Last contact</dt><dd>{formatDateTime(lead.lastContactedAt)}</dd></div>
            <div><dt className="text-xs text-muted">Created</dt><dd>{formatDateTime(lead.createdAt)}</dd></div>
            <div><dt className="text-xs text-muted">Updated</dt><dd>{formatDateTime(lead.updatedAt)}</dd></div>
          </dl>
          {lead.message ? (
            <p className="mt-4 rounded-xl bg-white/3 p-3 text-sm text-muted-strong">{lead.message}</p>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="AI lead score" description="Recommendation only — not a guaranteed prediction." />
          {insights ? (
            <div>
              <p className="text-3xl font-semibold">
                {insights.score} <span className="text-lg text-muted">/ 100</span>
              </p>
              <p className="mt-1 text-sm text-accent">{insights.quality}</p>
              <p className="mt-3 text-sm text-muted-strong">{insights.summary}</p>
              <p className="mt-4 text-sm font-medium">{insights.recommendedAction}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {insights.keySignals.map((signal) => (
                  <li key={signal} className="text-muted">• {signal}</li>
                ))}
              </ul>
              <div className="mt-4 space-y-2">
                {insights.factors.map((factor) => (
                  <div key={factor.label} className="rounded-lg border border-border p-2 text-xs">
                    <p className="font-medium">
                      {factor.label} · {factor.impact}
                    </p>
                    <p className="text-muted">{factor.detail}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-zinc-500">{insights.disclaimer}</p>
            </div>
          ) : (
            <Skeleton className="h-40" />
          )}
        </Card>
      </div>

      {insights ? (
        <Card>
          <CardHeader title="Deal Risk" description="Deterministic and rule-based — not an AI guess." />
          <DealRiskCard
            lead={{
              id: lead.id,
              name: lead.name,
              company: lead.company,
              status: lead.status,
              value: lead.value,
              ...insights.dealRisk,
            }}
          />
        </Card>
      ) : null}

      {editing ? (
        <Card>
          <CardHeader title="Edit lead" />
          <LeadForm
            initial={leadToForm(lead)}
            submitLabel="Save changes"
            onSubmit={async (value) => {
              const updated = await api<LeadDTO>(`/api/leads/${lead.id}`, {
                method: "PUT",
                body: JSON.stringify({
                  ...value,
                  followUpDate: value.followUpDate ? new Date(value.followUpDate).toISOString() : null,
                }),
              });
              setLead(updated);
              setEditing(false);
              toast.success("Lead updated");
            }}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Notes" />
          <NotesTimeline leadId={lead.id} notes={notes} onChange={setNotes} />
        </Card>
        <Card>
          <CardHeader title="Follow-ups" />
          <FollowUpPanel leadId={lead.id} items={followUps} onChange={setFollowUps} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Generate email reply" />
        <EmailGenerator leadId={lead.id} />
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this lead?"
        description="Notes and follow-ups will also be removed."
        confirmLabel="Delete"
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await api(`/api/leads/${lead.id}`, { method: "DELETE" });
          toast.success("Lead deleted");
          router.push("/leads");
        }}
      />
    </div>
  );
}