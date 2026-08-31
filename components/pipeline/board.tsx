"use client";

import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import {
  LEAD_STATUSES,
  type LeadDTO,
  type LeadStatus,
} from "@/types/crm";
import { PriorityBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const STAGE_ACCENTS = [
  {
    dot: "bg-sky-400",
    text: "text-sky-300",
    border: "border-sky-400/20",
    soft: "bg-sky-400/[0.05]",
    glow: "shadow-[0_0_24px_rgba(56,189,248,0.08)]",
  },
  {
    dot: "bg-violet-400",
    text: "text-violet-300",
    border: "border-violet-400/20",
    soft: "bg-violet-400/[0.05]",
    glow: "shadow-[0_0_24px_rgba(167,139,250,0.08)]",
  },
  {
    dot: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-400/20",
    soft: "bg-amber-400/[0.05]",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.08)]",
  },
  {
    dot: "bg-orange-400",
    text: "text-orange-300",
    border: "border-orange-400/20",
    soft: "bg-orange-400/[0.05]",
    glow: "shadow-[0_0_24px_rgba(251,146,60,0.08)]",
  },
  {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    border: "border-emerald-400/20",
    soft: "bg-emerald-400/[0.05]",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.08)]",
  },
  {
    dot: "bg-rose-400",
    text: "text-rose-300",
    border: "border-rose-400/20",
    soft: "bg-rose-400/[0.05]",
    glow: "shadow-[0_0_24px_rgba(251,113,133,0.08)]",
  },
];

function LeadCard({ lead }: { lead: LeadDTO }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      {...listeners}
      {...attributes}
      className={[
        "group relative overflow-hidden rounded-xl border",
        "border-white/[0.07] bg-zinc-950/70 p-3.5",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:scale-[1.01]",
        "hover:border-white/[0.14] hover:bg-zinc-900/80",
        "hover:shadow-[0_12px_30px_-14px_rgba(0,0,0,0.8)]",
        "active:cursor-grabbing",
        isDragging
          ? "z-50 rotate-[1deg] scale-[1.02] border-accent/40 opacity-90 shadow-[0_18px_45px_-12px_rgba(0,0,0,0.7)]"
          : "",
      ].join(" ")}
    >
      {/* Subtle hover highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/leads/${lead.id}`}
            onClick={(event) => event.stopPropagation()}
            className="block truncate text-sm font-semibold leading-snug text-foreground transition-colors duration-200 hover:text-accent"
          >
            {lead.name}
          </Link>

          <p className="mt-0.5 truncate text-xs text-muted">
            {lead.company}
          </p>
        </div>

        <span className="shrink-0 rounded-md bg-white/[0.045] px-1.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500 transition-colors duration-200 group-hover:text-zinc-300">
          {lead.source}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(lead.value)}
        </span>

        <PriorityBadge priority={lead.priority} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5">
        <span className="text-[10px] uppercase tracking-wide text-zinc-600">
          Follow-up
        </span>

        <span className="text-[11px] text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
          {formatDate(lead.followUpDate)}
        </span>
      </div>
    </div>
  );
}

function Column({
  status,
  leads,
  index,
}: {
  status: LeadStatus;
  leads: LeadDTO[];
  index: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const stageValue = leads.reduce(
    (sum, lead) => sum + lead.value,
    0,
  );

  const accent =
    STAGE_ACCENTS[index % STAGE_ACCENTS.length];

  return (
    <div
      ref={setNodeRef}
      className={[
        "min-w-[280px] flex-1 snap-start rounded-2xl border",
        "bg-zinc-950/45 p-3",
        "transition-all duration-200 ease-out",
        isOver
          ? `${accent.border} ${accent.soft} ${accent.glow}`
          : "border-white/[0.07] hover:border-white/[0.11]",
      ].join(" ")}
    >
      {/* Column header */}
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`}
              aria-hidden="true"
            />

            <h3
              className={`truncate text-[11px] font-semibold uppercase tracking-[0.12em] ${accent.text}`}
            >
              {status}
            </h3>
          </div>

          <p className="mt-1.5 pl-3.5 text-xs tabular-nums text-muted">
            {formatCurrency(stageValue)}
          </p>
        </div>

        <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.035] px-1.5 text-[11px] font-semibold tabular-nums text-muted-strong">
          {leads.length}
        </span>
      </div>

      {/* Drop area */}
      <div
        className={[
          "min-h-[96px] space-y-2 rounded-xl",
          "transition-all duration-200",
          isOver ? "bg-white/[0.015] p-1" : "",
        ].join(" ")}
      >
        {leads.length === 0 ? (
          <div
            className={[
              "flex min-h-[94px] items-center justify-center",
              "rounded-xl border border-dashed",
              isOver
                ? `${accent.border} ${accent.soft}`
                : "border-white/[0.06]",
              "transition-all duration-200",
            ].join(" ")}
          >
            <div className="text-center">
              <div
                className={`mx-auto mb-2 h-1.5 w-1.5 rounded-full ${accent.dot} opacity-50`}
              />
              <p className="text-[11px] text-muted">
                {isOver ? "Drop lead here" : "No leads here"}
              </p>
            </div>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({
  leads,
  onStatusChange,
}: {
  leads: LeadDTO[];
  onStatusChange: (
    id: string,
    status: LeadStatus,
  ) => Promise<void>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;

    const lead = event.active.data.current?.lead as
      | LeadDTO
      | undefined;

    if (!overId || !lead) return;

    const status = String(overId) as LeadStatus;

    if (
      !LEAD_STATUSES.includes(status) ||
      status === lead.status
    ) {
      return;
    }

    await onStatusChange(lead.id, status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {/* Desktop board */}
        <div className="flex snap-x snap-proximity gap-4 overflow-x-auto pb-5 [scrollbar-width:thin]">
          {LEAD_STATUSES.map((status, index) => (
            <Column
              key={status}
              status={status}
              leads={leads.filter(
                (lead) => lead.status === status,
              )}
              index={index}
            />
          ))}
        </div>

        {/* Bottom fade for horizontal scrolling */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 hidden h-5 w-16 bg-gradient-to-l from-background to-transparent md:block"
          aria-hidden="true"
        />
      </div>
    </DndContext>
  );
}