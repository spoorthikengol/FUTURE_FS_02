"use client";

import { Check, Copy, ExternalLink, Sparkles } from "lucide-react";
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
  if (section.bullets) {
    lines.push(...section.bullets.map((item) => `- ${item}`));
  }

  if (section.table) {
    lines.push(section.table.headers.join(" | "));
    lines.push(...section.table.rows.map((row) => row.join(" | ")));
  }

  return lines.join("\n");
}

export function answerToPlainText(answer: AssistantAnswer) {
  return [
    answer.headline,
    ...answer.sections.map(sectionToPlainText),
  ].join("\n\n");
}

const QUALITY_CLASS: Record<string, string> = {
  "High Potential":
    "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
  Promising:
    "border-sky-400/20 bg-sky-400/[0.08] text-sky-300",
  "Needs Nurture":
    "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
  "At Risk":
    "border-rose-400/20 bg-rose-400/[0.08] text-rose-300",
};

function CopyButton({
  onCopy,
  copied,
  label = "Copy",
}: {
  onCopy: () => void;
  copied: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 rounded-lg",
        "border border-border/80 bg-white/[0.025] px-2.5 py-1.5",
        "text-[11px] font-medium text-muted transition-all duration-200",
        "hover:-translate-y-px hover:border-white/15 hover:bg-white/[0.05]",
        "hover:text-foreground hover:shadow-[0_5px_18px_-10px_rgba(0,0,0,0.8)]",
        copied && "border-emerald-400/20 text-emerald-300",
      )}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3 transition-transform group-hover:scale-110" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

function PremiumTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-black/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-white/[0.025]">
              {headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors duration-150 hover:bg-white/[0.025]"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="whitespace-nowrap px-3.5 py-2.5 text-muted-strong"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function quickActionToPlainText(result: QuickActionResult) {
  const lines = [result.title, result.description];

  result.leads?.forEach((lead) =>
    lines.push(
      `- ${lead.name} (${lead.company}) — ${lead.status}, ${formatCurrency(
        lead.value,
      )}, score ${lead.score}/100 — ${lead.reason}`,
    ),
  );

  result.metrics?.forEach((metric) =>
    lines.push(
      `${metric.label}: ${metric.value}${
        metric.helpText ? ` (${metric.helpText})` : ""
      }`,
    ),
  );

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

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border border-border/80 bg-card/80",
        "p-4 text-sm text-muted-strong",
        "shadow-[0_10px_40px_-30px_rgba(0,0,0,0.9)]",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-white/[0.14]",
        "hover:shadow-[0_18px_45px_-28px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {/* subtle premium glow */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-accent/[0.035] blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-accent/[0.07] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
            </span>

            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {result.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {result.description}
              </p>
            </div>
          </div>

          <CopyButton
            onCopy={copy}
            copied={copied}
            label="Copy"
          />
        </div>

        {result.metrics?.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {result.metrics.map((metric) => (
              <div
                key={metric.label}
                className={cn(
                  "rounded-xl border border-border/70",
                  "bg-black/[0.12] p-3",
                  "transition-all duration-200",
                  "hover:-translate-y-px hover:border-white/[0.12]",
                  "hover:bg-white/[0.025]",
                )}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                  {metric.label}
                </p>

                <p
                  className="mt-1 truncate text-sm font-semibold text-foreground"
                  title={metric.value}
                >
                  {metric.value}
                </p>

                {metric.helpText ? (
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {metric.helpText}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {result.leads?.length ? (
          <ul className="space-y-2">
            {result.leads.map((lead) => (
              <li
                key={lead.id}
                className={cn(
                  "rounded-xl border border-border/70",
                  "bg-black/[0.12] p-3",
                  "transition-all duration-200",
                  "hover:-translate-y-px hover:border-white/[0.12]",
                  "hover:bg-white/[0.025]",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {lead.name}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-muted">
                      {lead.company}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <StatusBadge status={lead.status} />

                    <Badge
                      className={cn(
                        "border",
                        QUALITY_CLASS[lead.quality] ??
                          "border-zinc-500/20 bg-zinc-500/10 text-zinc-300",
                      )}
                    >
                      {lead.quality}
                    </Badge>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-strong">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(lead.value)}
                    </span>
                    <span className="mx-1.5 text-zinc-600">·</span>
                    Score {lead.score}/100
                  </span>

                  {onSelectLead ? (
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full",
                        "border border-border/80 px-2.5 py-1",
                        "text-[11px] font-medium text-muted",
                        "transition-all duration-200",
                        "hover:-translate-y-px hover:border-accent/50",
                        "hover:bg-accent/[0.06] hover:text-accent",
                      )}
                    >
                      Open lead
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted-strong">
                  {lead.reason}
                </p>
              </li>
            ))}
          </ul>
        ) : result.leads ? (
          <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center">
            <p className="text-xs text-muted">
              No leads matched right now.
            </p>
          </div>
        ) : null}

        {result.table ? (
          <PremiumTable
            headers={result.table.headers}
            rows={result.table.rows}
          />
        ) : null}

        {result.type === "text" && result.message ? (
          <div className="rounded-xl border border-border/70 bg-white/[0.02] p-3">
            <p className="leading-relaxed text-muted-strong">
              {result.message}
            </p>
          </div>
        ) : null}
      </div>
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

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border border-border/80 bg-card/80",
        "p-4 text-sm text-muted-strong",
        "shadow-[0_10px_40px_-30px_rgba(0,0,0,0.9)]",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-white/[0.14]",
        "hover:shadow-[0_18px_45px_-28px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {/* AI ambient glow */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-accent/[0.035] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent/[0.07] text-accent">
              <Sparkles className="h-4 w-4" />
            </span>

            <div className="min-w-0">
              <p className="font-semibold leading-relaxed text-foreground">
                {answer.headline}
              </p>

              {mode ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted">
                  {mode === "live" ? "AI analysis" : "Demo response"}
                </p>
              ) : null}
            </div>
          </div>

          <CopyButton
            onCopy={copy}
            copied={copied}
            label="Copy"
          />
        </div>

        <div className="space-y-4">
          {answer.sections.map((section, index) => (
            <div
              key={index}
              className={cn(
                "space-y-2.5",
                index > 0 && "border-t border-border/50 pt-4",
              )}
            >
              {section.heading ? (
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />

                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {section.heading}
                  </p>
                </div>
              ) : null}

              {section.paragraphs?.map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  className="leading-relaxed text-muted-strong"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets?.length ? (
                <ul className="space-y-2">
                  {section.bullets.map((bullet, bIndex) => (
                    <li
                      key={bIndex}
                      className="flex gap-2.5 leading-relaxed text-muted-strong"
                    >
                      <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/80" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {section.table ? (
                <PremiumTable
                  headers={section.table.headers}
                  rows={section.table.rows}
                />
              ) : null}
            </div>
          ))}
        </div>

        {answer.relatedLeadIds?.length && onSelectLead ? (
          <div className="border-t border-border/50 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              Related leads
            </p>

            <div className="flex flex-wrap gap-1.5">
              {answer.relatedLeadIds.map((leadId) => (
                <button
                  key={leadId}
                  type="button"
                  onClick={() => onSelectLead(leadId)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full",
                    "border border-border/80 bg-white/[0.02]",
                    "px-2.5 py-1 text-[11px] font-medium text-muted",
                    "transition-all duration-200",
                    "hover:-translate-y-px hover:border-accent/50",
                    "hover:bg-accent/[0.06] hover:text-accent",
                  )}
                >
                  Open lead
                  <ExternalLink className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <div className="min-w-0">
            {disclaimer ? (
              <p className="text-[10px] leading-relaxed text-zinc-500">
                {disclaimer}
              </p>
            ) : (
              <span />
            )}
          </div>

          {mode ? (
            <Badge
              className={cn(
                "border shrink-0",
                mode === "live"
                  ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                  : "border-zinc-400/15 bg-zinc-400/[0.06] text-zinc-300",
              )}
            >
              <span
                className={cn(
                  "mr-1.5 h-1.5 w-1.5 rounded-full",
                  mode === "live" ? "bg-emerald-400" : "bg-zinc-500",
                )}
              />
              {mode === "live" ? "Connected model" : "Demo mode"}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}