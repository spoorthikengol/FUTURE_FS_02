import type { FollowUpStatus } from "@/types/crm";

export function resolveFollowUpStatus(
  date: Date,
  time: string,
  current: FollowUpStatus,
): FollowUpStatus {
  if (current === "COMPLETED") return "COMPLETED";
  const [hours, minutes] = time.split(":").map(Number);
  const due = new Date(date);
  due.setHours(hours || 0, minutes || 0, 0, 0);
  return due.getTime() < Date.now() ? "OVERDUE" : "UPCOMING";
}

export function followUpDueAt(date: Date | string, time: string) {
  const due = new Date(date);
  const [hours, minutes] = time.split(":").map(Number);
  due.setHours(hours || 9, minutes || 0, 0, 0);
  return due;
}
