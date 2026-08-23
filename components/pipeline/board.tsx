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
import { LEAD_STATUSES, type LeadDTO, type LeadStatus } from "@/types/crm";
import { PriorityBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

function LeadCard({ lead }: { lead: LeadDTO }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`rounded-xl border border-border bg-zinc-950/50 p-3 ${isDragging ? "opacity-60" : ""}`}
      {...listeners}
      {...attributes}
    >
      <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:text-accent">
        {lead.name}
      </Link>
      <p className="mt-1 text-xs text-muted">{lead.company}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{formatCurrency(lead.value)}</span>
        <span>{lead.source}</span>
        <PriorityBadge priority={lead.priority} />
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">Follow-up {formatDate(lead.followUpDate)}</p>
    </div>
  );
}

function Column({ status, leads }: { status: LeadStatus; leads: LeadDTO[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[240px] flex-1 rounded-2xl border border-border bg-card p-3 ${isOver ? "border-accent/40" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wide text-muted-strong">{status}</h3>
        <span className="text-xs text-muted">{leads.length}</span>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export function PipelineBoard({
  leads,
  onStatusChange,
}: {
  leads: LeadDTO[];
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    const lead = event.active.data.current?.lead as LeadDTO | undefined;
    if (!overId || !lead) return;
    const status = String(overId) as LeadStatus;
    if (!LEAD_STATUSES.includes(status) || status === lead.status) return;
    await onStatusChange(lead.id, status);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {LEAD_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            leads={leads.filter((lead) => lead.status === status)}
          />
        ))}
      </div>
    </DndContext>
  );
}
