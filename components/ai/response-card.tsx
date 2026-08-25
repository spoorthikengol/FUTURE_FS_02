"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { QuickActionResult } from "@/lib/ai/quick-actions";

export type AssistantSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
};

export type AssistantAnswer = {
  headline: string;
  sections: AssistantSection[];
  relatedLeadIds?: string[];
};

function sectionToPlainText(section: AssistantSection) {
  const lines: string[] = [];
  if (section.heading) lines.push(section.heading);
  if (section.paragraphs) lines.push(...section.paragraphs);
  if (section.bullets) lines.push(...section.bullets.map((item) => `- ${item}`));
  if (section.table) {
    lines.push(section.table.headers.join(" | "));
    lines.push(...section.table.rows.map((row) => row.join(" | ")));
  }
  return lines.join("\n");
}

export function answerToPlainText(answer: AssistantAnswer) {
  return [answer.headline, ...answer.sections.map(sectionToPlainText)].join("\n\n");
}

const QUALITY_CLASS: Record<string, string> = {
  "High Potential": "bg-emerald-500/10 text-emerald-300",
  Promising: "bg-sky-500/10 text-sky-300",
  "Needs Nurture": "bg-amber-500/10 text-amber-300",
  "At Risk": "bg-rose-500/10 text-rose-300",
};

function quickActionToPlainText(result: QuickActionResult) {
  const lines = [result.title, result.description];
  result.leads?.forEach((lead) =>
    lines.push(`- ${lead.name} (${lead.company}) — ${lead.status}, ${formatCurrency(lead.value)}, score ${lead.score}/100 — ${lead.reason}`),
  );
  result.metrics?.forEach((metric) => lines.push(`${metric.label}: ${metric.value}${metric.helpText ? ` (${metric.helpText})` : ""}`));
  if (result.table) {
    lines.push(result.table.headers.join(" | "));
    result.table.rows.forEach((row) => lines.push(row.join(" | ")));
  }
  if (result.message) lines.push(result.message);
  return lines.join("\n");
}

export function QuickActionCard({
  result,
  onSelectLead,
  className,
}: {
  result: QuickActionResult;
  onSelectLead?: (leadId: string) => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(quickActionToPlainText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("space-y-3 rounded-xl bg-white/3 p-4 text-sm text-muted-strong", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{result.title}</p>
          <p className="mt-0.5 text-xs text-muted">{result.description}</p>
        </div>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted transition hover:text-foreground"
          aria-label={`Copy ${result.title} results`}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {result.metrics?.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {result.metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-border bg-black/10 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">{metric.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground" title={metric.value}>
                {metric.value}
              </p>
              {metric.helpText ? <p className="text-[10px] text-muted">{metric.helpText}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {result.leads?.length ? (
        <ul className="space-y-2">
          {result.leads.map((lead) => (
            <li key={lead.id} className="rounded-lg border border-border bg-black/10 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{lead.name}</p>
                  <p className="truncate text-xs text-muted">{lead.company}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <StatusBadge status={lead.status} />
                  <Badge className={QUALITY_CLASS[lead.quality] ?? "bg-zinc-500/10 text-zinc-300"}>{lead.quality}</Badge>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-strong">
                  {formatCurrency(lead.value)} · Score {lead.score}/100
                </span>
                {onSelectLead ? (
                  <button
                    onClick={() => onSelectLead(lead.id)}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted transition hover:border-accent/60 hover:text-accent"
                  >
                    Open lead
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-strong">{lead.reason}</p>
            </li>
          ))}
        </ul>
      ) : result.leads ? (
        <p className="text-xs text-muted">No leads matched right now.</p>
      ) : null}

      {result.table ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-white/5">
                {result.table.headers.map((header) => (
                  <th key={header} className="whitespace-nowrap px-3 py-2 font-medium text-muted-strong">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table.rows.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-border/60 last:border-0">
                  {row.map((cell, cIndex) => (
                    <td key={cIndex} className="whitespace-nowrap px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {result.type === "text" && result.message ? <p className="leading-relaxed">{result.message}</p> : null}
    </div>
  );
}
export function AiResponseCard({
  answer,
  mode,
  disclaimer,
  onSelectLead,
  className,
}: {
  answer: AssistantAnswer;
  mode?: "live" | "demo";
  disclaimer?: string;
  onSelectLead?: (leadId: string) => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(answerToPlainText(answer));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("space-y-3 rounded-xl bg-white/3 p-4 text-sm text-muted-strong", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-foreground">{answer.headline}</p>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted transition hover:text-foreground"
          aria-label="Copy response"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {answer.sections.map((section, index) => (
        <div key={index} className="space-y-1.5">
          {section.heading ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{section.heading}</p>
          ) : null}
          {section.paragraphs?.map((paragraph, pIndex) => (
            <p key={pIndex} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="space-y-1">
              {section.bullets.map((bullet, bIndex) => (
                <li key={bIndex} className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {section.table ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-white/5">
                    {section.table.headers.map((header) => (
                      <th key={header} className="px-3 py-2 font-medium text-muted-strong">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, rIndex) => (
                    <tr key={rIndex} className="border-b border-border/60 last:border-0">
                      {row.map((cell, cIndex) => (
                        <td key={cIndex} className="px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ))}

      {answer.relatedLeadIds?.length && onSelectLead ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {answer.relatedLeadIds.map((leadId) => (
            <button
              key={leadId}
              onClick={() => onSelectLead(leadId)}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted transition hover:border-accent/60 hover:text-accent"
            >
              Open lead
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        {disclaimer ? <p className="text-[11px] text-zinc-500">{disclaimer}</p> : <span />}
        {mode ? (
          <Badge className={mode === "live" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-300"}>
            {mode === "live" ? "Connected model" : "Demo mode"}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
