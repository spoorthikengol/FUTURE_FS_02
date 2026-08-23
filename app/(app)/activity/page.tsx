"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";

type ActivityItem = {
  id: string;
  leadId: string | null;
  type: string;
  description: string;
  createdAt: string;
  leadName: string | null;
  company: string | null;
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setItems(await api<ActivityItem[]>("/api/activity?limit=80"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-muted">Live-style timeline of CRM events. Refreshes every 15 seconds.</p>
      </div>
      <ol className="space-y-4 border-l border-border pl-5">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
            <p className="text-sm">{item.description}</p>
            <p className="text-xs text-muted">
              {item.type.replaceAll("_", " ")} · {formatDateTime(item.createdAt)}
              {item.leadId ? (
                <>
                  {" · "}
                  <Link className="text-accent" href={`/leads/${item.leadId}`}>
                    {item.leadName || "Open lead"}
                  </Link>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
