import { cn } from "@/lib/utils";
import type { LeadPriority, LeadStatus } from "@/types/crm";

const statusClass: Record<LeadStatus, string> = {
  NEW: "bg-sky-500/10 text-sky-300",
  CONTACTED: "bg-indigo-500/10 text-indigo-300",
  QUALIFIED: "bg-teal-500/10 text-teal-300",
  PROPOSAL: "bg-amber-500/10 text-amber-300",
  CONVERTED: "bg-emerald-500/10 text-emerald-300",
  LOST: "bg-rose-500/10 text-rose-300",
};

const priorityClass: Record<LeadPriority, string> = {
  LOW: "bg-zinc-500/10 text-zinc-300",
  MEDIUM: "bg-sky-500/10 text-sky-300",
  HIGH: "bg-amber-500/10 text-amber-300",
  URGENT: "bg-rose-500/10 text-rose-300",
};

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={statusClass[status]}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return <Badge className={priorityClass[priority]}>{priority}</Badge>;
}
