import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import type { SpeedToLeadSummary } from "@/lib/analytics/speed-to-lead";

export function SpeedToLeadCard({ summary }: { summary: SpeedToLeadSummary }) {
  return (
    <Card>
      <CardHeader
        title="Speed to Lead"
        action={
          <Link className="text-xs text-accent" href="/speed-to-lead">
            View details
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
        <div>
          <p className="text-lg font-semibold text-foreground">
            {summary.medianMinutes !== null ? formatDuration(summary.medianMinutes) : "—"}
          </p>
          <p className="text-[11px] text-muted">Median response</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {summary.averageMinutes !== null ? formatDuration(summary.averageMinutes) : "—"}
          </p>
          <p className="text-[11px] text-muted">Average response</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-emerald-300">
            {summary.slaCompliancePercent !== null
              ? `${summary.slaCompliancePercent.toFixed(0)}%`
              : "—"}
          </p>
          <p className="text-[11px] text-muted">SLA compliance</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-sky-300">{summary.waitingCount}</p>
          <p className="text-[11px] text-muted">Awaiting response</p>
        </div>
      </div>
    </Card>
  );
}