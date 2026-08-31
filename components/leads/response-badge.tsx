import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import type { SpeedToLeadState } from "@/lib/analytics/speed-to-lead";

const STATE_CLASS: Record<SpeedToLeadState, string> = {
  ON_TIME: "bg-emerald-500/10 text-emerald-300",
  LATE: "bg-amber-500/10 text-amber-300",
  AWAITING: "bg-sky-500/10 text-sky-300",
  BREACHED: "bg-rose-500/10 text-rose-300",
};

export function ResponseBadge({
  state,
  responseMinutes,
}: {
  state: SpeedToLeadState;
  responseMinutes: number | null;
}) {
  const label =
    state === "ON_TIME" || state === "LATE"
      ? `Responded in ${formatDuration(responseMinutes ?? 0)}`
      : state === "AWAITING"
        ? "Awaiting first response"
        : "SLA breached";

  return <Badge className={STATE_CLASS[state]}>{label}</Badge>;
}